import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { SOCKET_EVENTS } from '../../../shared/constants/socket.constants';
import { ACTION_TIMEOUT, EMOJI_RATE_LIMIT_WINDOW, EMOJI_RATE_LIMIT_COUNT } from '../../../shared/constants/game.constants';
import { roomService } from '../modules/room/room.service';
import { GameEngine } from '../modules/game/game.engine';
import { GameState, GamePlayer, PlayerAction, Card } from '../../../shared/types/game.types';

interface SocketPayload {
  [key: string]: unknown;
}

class SocketService {
  private io: Server | null = null;
  private gameEngines: Map<string, GameEngine> = new Map();
  private gameStates: Map<string, GameState> = new Map();
  private dealerSeatNumbers: Map<string, number> = new Map();
  private countdowns: Map<string, NodeJS.Timeout> = new Map();
  private actionTimers: Map<string, NodeJS.Timeout> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private userSockets: Map<string, string> = new Map();
  // 保存断线玩家的信息，用于重连恢复
  private disconnectedPlayers: Map<string, { userId: string; roomCode: string; timestamp: number }> = new Map();
  // 断线重连超时时间（30秒）
  private readonly RECONNECT_TIMEOUT_MS = 30000;
  // 表情发送限流记录
  private emojiRateLimits: Map<string, number[]> = new Map();
  // 弃牌获胜时暂存赢家数据，等待亮牌操作
  private pendingReveals: Map<string, { userId: string; cards: Card[]; roomCode: string; timer: NodeJS.Timeout }> = new Map();
  // 已完成的亮牌数据，用于重连玩家回放
  private completedReveals: Map<string, { userId: string; cards: Card[] }> = new Map();

  initialize(httpServer: HttpServer): void {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Join room
      socket.on(SOCKET_EVENTS.JOIN_ROOM, (data: { roomCode: string; userId: string }) => {
        // 处理同一用户多标签页连接：断开旧 socket
        const existingSocketId = this.userSockets.get(data.userId);
        if (existingSocketId && existingSocketId !== socket.id) {
          const existingSocket = this.io.sockets.sockets.get(existingSocketId);
          if (existingSocket) {
            existingSocket.emit(SOCKET_EVENTS.ERROR, { message: '您的账号在其他标签页登录' });
            existingSocket.disconnect(true);
          }
        }

        socket.join(data.roomCode);
        socket.data.userId = data.userId;
        socket.data.roomCode = data.roomCode;
        this.userSockets.set(data.userId, socket.id);

        // 检查是否是断线重连
        const disconnectedKey = `${data.roomCode}:${data.userId}`;
        const disconnectedInfo = this.disconnectedPlayers.get(disconnectedKey);
        if (disconnectedInfo) {
          // 重连成功，移除断线记录
          this.disconnectedPlayers.delete(disconnectedKey);
          this.clearReconnectTimeout(disconnectedKey);
          logger.info(`玩家 ${data.userId} 重连成功`);

          // 通知其他玩家重连成功
          this.emitToRoom(data.roomCode, SOCKET_EVENTS.PLAYER_JOINED, { userId: data.userId, reconnected: true });
        }

        const players = roomService.getRoomPlayers(data.roomCode);
        this.emitToRoom(data.roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });

        // If game is in progress, send current game state to the joining player
        const gameState = this.gameStates.get(data.roomCode);
        if (gameState) {
          this.emitToSocket(socket.id, SOCKET_EVENTS.GAME_UPDATE, gameState);
          const currentPlayer = gameState.players[gameState.currentPlayerIndex];
          if (disconnectedInfo && gameState.status === 'playing' && currentPlayer?.userId === data.userId) {
            this.scheduleActionTimeout(data.roomCode, gameState);
          }
        }

        // 游戏已结束但亮牌窗口仍在：恢复赢家的亮牌能力
        const pending = this.pendingReveals.get(data.roomCode);
        if (pending && pending.userId === data.userId) {
          this.emitToSocket(socket.id, SOCKET_EVENTS.GAME_OVER, {
            winnerId: pending.userId,
            winnerIds: [pending.userId],
            isFoldWin: true,
          });
        }

        // 已亮牌的数据重放：让重连玩家也能看到亮牌结果
        const revealed = this.completedReveals.get(data.roomCode);
        if (revealed) {
          this.emitToSocket(socket.id, SOCKET_EVENTS.CARDS_REVEALED, revealed);
        }
      });

      // Leave room
      socket.on(SOCKET_EVENTS.LEAVE_ROOM, (data: { roomCode: string }) => {
        socket.leave(data.roomCode);
        roomService.leaveRoom(data.roomCode, socket.data.userId);

        const players = roomService.getRoomPlayers(data.roomCode);
        this.emitToRoom(data.roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });
        this.emitToRoom(data.roomCode, SOCKET_EVENTS.PLAYER_LEFT, { userId: socket.data.userId });
      });

      // Select seat
      socket.on(SOCKET_EVENTS.SELECT_SEAT, (data: { roomCode: string; seatNumber: number }) => {
        const success = roomService.selectSeat(data.roomCode, socket.data.userId, data.seatNumber);

        if (success) {
          const players = roomService.getRoomPlayers(data.roomCode);
          this.emitToRoom(data.roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });
        } else {
          this.emitToUser(socket.data.userId, SOCKET_EVENTS.ERROR, { message: '座位无效或已被占用' });
        }
      });

      // Player ready
      socket.on(SOCKET_EVENTS.PLAYER_READY, (data: { roomCode: string }) => {
        const success = roomService.readyPlayer(data.roomCode, socket.data.userId);

        if (success) {
          const players = roomService.getRoomPlayers(data.roomCode);
          this.emitToRoom(data.roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });

          // Check if all seated players are now ready
          this.checkAndStartCountdown(data.roomCode);
        }
      });

      // Player action
      socket.on(SOCKET_EVENTS.PLAYER_ACTION, (data: { roomCode: string; action: string; amount?: number }) => {
        this.handlePlayerAction(data.roomCode, socket.data.userId, data.action, data.amount);
      });

      // Send emoji
      socket.on(SOCKET_EVENTS.SEND_EMOJI, (data: { roomCode: string; emoji: string }) => {
        const userId = socket.data.userId as string;
        const now = Date.now();

        // 获取用户发送记录，清理过期记录
        const timestamps = this.emojiRateLimits.get(userId) || [];
        const validTimestamps = timestamps.filter(t => now - t < EMOJI_RATE_LIMIT_WINDOW);

        if (validTimestamps.length >= EMOJI_RATE_LIMIT_COUNT) {
          this.emitToUser(userId, SOCKET_EVENTS.ERROR, { message: '表情发送过于频繁，请稍后再试' });
          return;
        }

        validTimestamps.push(now);
        this.emojiRateLimits.set(userId, validTimestamps);

        this.emitToRoom(data.roomCode, SOCKET_EVENTS.NEW_EMOJI, {
          userId,
          emoji: data.emoji,
        });
      });

      // Rebuy
      socket.on(SOCKET_EVENTS.REBUY, (data: { roomCode: string; amount: number }) => {
        if (this.gameStates.has(data.roomCode)) {
          this.emitToUser(socket.data.userId, SOCKET_EVENTS.ERROR, { message: '游戏进行中不能重新买入' });
          return;
        }

        const success = roomService.rebuy(data.roomCode, socket.data.userId, data.amount);

        if (success) {
          const players = roomService.getRoomPlayers(data.roomCode);
          this.emitToRoom(data.roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });
        } else {
          this.emitToUser(socket.data.userId, SOCKET_EVENTS.ERROR, { message: '买入金额无效' });
        }
      });

      // 赢家亮牌
      socket.on(SOCKET_EVENTS.REVEAL_CARDS, (data: { roomCode: string }) => {
        const userId = socket.data.userId as string;
        const pending = this.pendingReveals.get(data.roomCode);

        if (!pending || pending.userId !== userId) {
          this.emitToUser(userId, SOCKET_EVENTS.ERROR, { message: '当前无法亮牌' });
          return;
        }

        // 清除超时定时器
        clearTimeout(pending.timer);
        this.pendingReveals.delete(data.roomCode);

        // 保存亮牌结果，供重连玩家回放
        this.completedReveals.set(data.roomCode, { userId, cards: pending.cards });

        // 广播亮牌数据给房间内所有人
        this.emitToRoom(data.roomCode, SOCKET_EVENTS.CARDS_REVEALED, {
          userId,
          cards: pending.cards,
        });

        logger.info(`房间 ${data.roomCode} 赢家 ${userId} 亮牌`);
      });

      socket.on('disconnect', () => {
        const userId = socket.data.userId as string;
        const roomCode = socket.data.roomCode as string;
        logger.info(`Client disconnected: ${socket.id}, userId: ${userId}`);
        if (userId && this.userSockets.get(userId) === socket.id) {
          this.userSockets.delete(userId);
          this.emojiRateLimits.delete(userId);
        }

        if (roomCode && userId) {
          // 检查是否在游戏中
          const gameState = this.gameStates.get(roomCode);
          if (gameState) {
            const player = gameState.players.find(p => p.userId === userId);
            if (player && player.status === 'playing') {
              // 保存断线玩家信息，等待重连
              this.disconnectedPlayers.set(`${roomCode}:${userId}`, {
                userId,
                roomCode,
                timestamp: Date.now()
              });
              logger.info(`玩家 ${userId} 在游戏中断线，等待重连...`);

              const currentPlayer = gameState.players[gameState.currentPlayerIndex];
              if (currentPlayer?.userId === userId) {
                this.clearActionTimeout(roomCode);
              }

              // 设置重连超时
              const disconnectedKey = `${roomCode}:${userId}`;
              this.clearReconnectTimeout(disconnectedKey);
              const reconnectTimer = setTimeout(() => {
                const disconnectedInfo = this.disconnectedPlayers.get(disconnectedKey);
                if (disconnectedInfo) {
                  // 超时未重连，自动弃牌
                  logger.info(`玩家 ${userId} 重连超时，自动弃牌`);
                  this.disconnectedPlayers.delete(disconnectedKey);
                  this.reconnectTimers.delete(disconnectedKey);
                  this.handlePlayerDisconnect(roomCode, userId);
                }
              }, this.RECONNECT_TIMEOUT_MS);
              this.reconnectTimers.set(disconnectedKey, reconnectTimer);

              // 通知其他玩家有玩家断线
              this.emitToRoom(roomCode, SOCKET_EVENTS.PLAYER_LEFT, { userId, reconnecting: true });
              return; // 不立即从房间移除，等待重连或超时
            }
          }

          // 非游戏中断线，直接移除
          this.handlePlayerLeaveRoom(roomCode, userId);
        }
      });
    });

    // 注册房间删除回调，确保空房间被清理时同步清理关联的游戏状态
    roomService.getRoomManager().setOnRoomDeleted((roomCode: string) => {
      this.cleanupRoomGameState(roomCode);
    });

    logger.info('Socket.io initialized');
  }

  private checkAndStartCountdown(roomCode: string): void {
    // Don't start if game is already in progress
    if (this.gameStates.has(roomCode)) return;

    // Don't start if countdown is already running
    if (this.countdowns.has(roomCode)) return;

    // Check if all seated players are ready
    if (!roomService.allSeatedPlayersReady(roomCode)) return;

    logger.info(`All players ready in room ${roomCode}, starting countdown`);

    // Broadcast countdown start
    this.emitToRoom(roomCode, SOCKET_EVENTS.COUNTDOWN_START, {});

    // 3-2-1-Go! countdown, then start game
    let count = 3;
    const interval = setInterval(() => {
      if (count > 0) {
        this.emitToRoom(roomCode, SOCKET_EVENTS.COUNTDOWN_START, { count });
        count--;
      } else if (count === 0) {
        this.emitToRoom(roomCode, SOCKET_EVENTS.COUNTDOWN_START, { count: 0 });
        count--;
      } else {
        clearInterval(interval);
        this.countdowns.delete(roomCode);
        this.startGame(roomCode);
      }
    }, 1000);

    this.countdowns.set(roomCode, interval as unknown as NodeJS.Timeout);
  }

  private startGame(roomCode: string): void {
    // Get ready players (they are the ones who will play)
    const allPlayers = roomService.getRoomPlayers(roomCode);
    const readyPlayers = allPlayers
      .filter(p => p.status === 'ready')
      .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

    // Need at least 2 players to start
    if (readyPlayers.length < 2) return;

    // Don't start if game is already in progress
    if (this.gameStates.has(roomCode)) return;

    // 清除上一局的亮牌数据
    this.completedReveals.delete(roomCode);
    const pendingReveal = this.pendingReveals.get(roomCode);
    if (pendingReveal) {
      clearTimeout(pendingReveal.timer);
      this.pendingReveals.delete(roomCode);
    }

    const room = roomService.getRoom(roomCode);
    if (!room) return;

    // Convert RoomPlayers to GamePlayers
    const gamePlayers: GamePlayer[] = readyPlayers.map(p => ({
      userId: p.userId,
      nickname: p.nickname,
      seatNumber: p.seatNumber || 0,
      chips: p.chips,
      bet: 0,
      totalBet: 0,
      cards: [],
      status: 'playing',
      isDealer: false,
      isSmallBlind: false,
      isBigBlind: false,
    }));

    // Create and start game
    const engine = new GameEngine();
    const gameState = engine.startGame(
      roomCode,
      gamePlayers,
      room.smallBlind,
      room.bigBlind,
      this.dealerSeatNumbers.get(roomCode)
    );

    this.gameEngines.set(roomCode, engine);
    this.gameStates.set(roomCode, gameState);

    // Update player statuses in room
    readyPlayers.forEach(p => {
      roomService.getRoomManager().updatePlayerStatus(roomCode, p.userId, 'playing');
    });

    logger.info(`Game started in room ${roomCode} with ${readyPlayers.length} players`);
    this.emitToRoom(roomCode, SOCKET_EVENTS.GAME_START, { gameState });
    this.emitToRoom(roomCode, SOCKET_EVENTS.GAME_UPDATE, gameState);
    this.scheduleActionTimeout(roomCode, gameState);
  }

  private handlePlayerAction(roomCode: string, userId: string, action: string, amount?: number): void {
    const engine = this.gameEngines.get(roomCode);
    const currentState = this.gameStates.get(roomCode);

    if (!engine || !currentState) {
      logger.warn(`No active game in room ${roomCode}`);
      return;
    }

    // Validate action type
    const validActions: PlayerAction[] = ['fold', 'check', 'call', 'bet', 'raise', 'all_in'];
    if (!validActions.includes(action as PlayerAction)) {
      logger.warn(`Invalid action: ${action}`);
      this.emitToUser(userId, SOCKET_EVENTS.ERROR, { message: 'Invalid action' });
      return;
    }

    try {
      this.clearActionTimeout(roomCode);
      const newState = engine.playerAction(currentState, userId, action as PlayerAction, amount);
      this.gameStates.set(roomCode, newState);

      // Broadcast updated game state
      this.emitToRoom(roomCode, SOCKET_EVENTS.GAME_UPDATE, newState);

      // Check if game finished
      if (newState.status === 'finished') {
        this.handleGameFinished(roomCode, newState);
      } else {
        this.scheduleActionTimeout(roomCode, newState);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Player action error: ${errorMessage}`);
      this.emitToUser(userId, SOCKET_EVENTS.ERROR, { message: errorMessage });
      this.scheduleActionTimeout(roomCode, currentState);
    }
  }

  private handleGameFinished(roomCode: string, gameState: GameState): void {
    this.clearActionTimeout(roomCode);

    // Update player chips and reset status
    gameState.players.forEach(p => {
      const roomPlayers = roomService.getRoomPlayers(roomCode);
      const roomPlayer = roomPlayers.find(rp => rp.userId === p.userId);
      if (roomPlayer) {
        roomPlayer.chips = p.chips;
        if (p.chips > 0) {
          // Back to seated — need to click ready again for next game
          roomService.getRoomManager().updatePlayerStatus(roomCode, p.userId, 'seated');
        } else {
          roomService.getRoomManager().updatePlayerStatus(roomCode, p.userId, 'out');
        }
      }
    });
    this.dealerSeatNumbers.set(roomCode, gameState.players[gameState.dealerIndex]?.seatNumber ?? 1);

    // 弃牌获胜时暂存赢家数据，等待亮牌操作
    if (gameState.isFoldWin && gameState.winnerId) {
      const winner = gameState.players.find(p => p.userId === gameState.winnerId);
      if (winner && winner.cards && winner.cards.length >= 2) {
        const timer = setTimeout(() => {
          this.pendingReveals.delete(roomCode);
          logger.info(`房间 ${roomCode} 赢家亮牌超时，自动盖牌`);
        }, 30000);
        this.pendingReveals.set(roomCode, {
          userId: gameState.winnerId,
          cards: winner.cards,
          roomCode,
          timer,
        });
      }
    }

    // Clean up game state
    this.gameEngines.delete(roomCode);
    this.gameStates.delete(roomCode);

    // Broadcast final state
    const players = roomService.getRoomPlayers(roomCode);
    this.emitToRoom(roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });
    this.emitToRoom(roomCode, SOCKET_EVENTS.GAME_OVER, {
      winnerId: gameState.winnerId,
      winnerIds: gameState.winnerIds || (gameState.winnerId ? [gameState.winnerId] : []),
      isFoldWin: gameState.isFoldWin,
    });

    logger.info(`Game finished in room ${roomCode}, winner: ${gameState.winnerId}`);
  }

  private scheduleActionTimeout(roomCode: string, gameState: GameState): void {
    this.clearActionTimeout(roomCode);

    if (gameState.status !== 'playing') return;

    const room = roomService.getRoom(roomCode);
    if (!room?.actionTimeoutEnabled) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.status !== 'playing') return;

    const timer = setTimeout(() => {
      this.handleActionTimeout(roomCode, currentPlayer.userId);
    }, ACTION_TIMEOUT * 1000);

    this.actionTimers.set(roomCode, timer);
  }

  private clearActionTimeout(roomCode: string): void {
    const timer = this.actionTimers.get(roomCode);
    if (!timer) return;

    clearTimeout(timer);
    this.actionTimers.delete(roomCode);
  }

  private clearReconnectTimeout(disconnectedKey: string): void {
    const timer = this.reconnectTimers.get(disconnectedKey);
    if (!timer) return;

    clearTimeout(timer);
    this.reconnectTimers.delete(disconnectedKey);
  }

  private handleActionTimeout(roomCode: string, userId: string): void {
    const engine = this.gameEngines.get(roomCode);
    const currentState = this.gameStates.get(roomCode);

    if (!engine || !currentState || currentState.status !== 'playing') return;

    const currentPlayer = currentState.players[currentState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.userId !== userId || currentPlayer.status !== 'playing') return;

    const action: PlayerAction = currentPlayer.bet >= currentState.currentBet ? 'check' : 'fold';

    try {
      const newState = engine.playerAction(currentState, userId, action);
      this.gameStates.set(roomCode, newState);
      this.emitToRoom(roomCode, SOCKET_EVENTS.GAME_UPDATE, newState);

      if (newState.status === 'finished') {
        this.handleGameFinished(roomCode, newState);
      } else {
        this.scheduleActionTimeout(roomCode, newState);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Action timeout error: ${errorMessage}`);
      this.scheduleActionTimeout(roomCode, currentState);
    }
  }

  getIO(): Server | null {
    return this.io;
  }

  emitToRoom(roomId: string, event: string, data: SocketPayload | GameState): void {
    this.io?.to(roomId).emit(event, data);
  }

  emitToSocket(socketId: string, event: string, data: SocketPayload | GameState): void {
    this.io?.to(socketId).emit(event, data);
  }

  emitToUser(userId: string, event: string, data: SocketPayload): void {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.emitToSocket(socketId, event, data);
    }
  }

  /**
   * 处理玩家在游戏中断线（超时未重连）
   */
  private handlePlayerDisconnect(roomCode: string, userId: string): void {
    const gameState = this.gameStates.get(roomCode);
    if (gameState) {
      const player = gameState.players.find(p => p.userId === userId);
      if (player && player.status === 'playing') {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        const wasCurrentPlayer = currentPlayer?.userId === userId;
        if (currentPlayer?.userId === userId) {
          this.clearActionTimeout(roomCode);
        }

        // 自动弃牌
        try {
          const engine = this.gameEngines.get(roomCode);
          if (engine) {
            const newState = engine.forceFold(gameState, userId);
            this.gameStates.set(roomCode, newState);
            this.emitToRoom(roomCode, SOCKET_EVENTS.GAME_UPDATE, newState);

            if (newState.status === 'finished') {
              this.handleGameFinished(roomCode, newState);
            } else if (wasCurrentPlayer) {
              this.scheduleActionTimeout(roomCode, newState);
            }
          }
        } catch {
          // 玩家的回合可能已经过去
        }
      }
    }

    // 从房间移除
    this.handlePlayerLeaveRoom(roomCode, userId);
  }

  /**
   * 处理玩家离开房间
   */
  private handlePlayerLeaveRoom(roomCode: string, userId: string): void {
    roomService.leaveRoom(roomCode, userId);
    const players = roomService.getRoomPlayers(roomCode);
    this.emitToRoom(roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });
    this.emitToRoom(roomCode, SOCKET_EVENTS.PLAYER_LEFT, { userId });
  }

  /**
   * 清理与房间关联的所有游戏状态。
   * 由 RoomManager 的房间删除回调触发，防止内存泄漏。
   */
  private cleanupRoomGameState(roomCode: string): void {
    this.clearActionTimeout(roomCode);
    this.gameEngines.delete(roomCode);
    this.gameStates.delete(roomCode);
    this.dealerSeatNumbers.delete(roomCode);

    const countdown = this.countdowns.get(roomCode);
    if (countdown) {
      clearInterval(countdown);
      this.countdowns.delete(roomCode);
    }

    // 清理该房间下所有断线玩家的记录
    for (const [key] of this.disconnectedPlayers) {
      if (key.startsWith(`${roomCode}:`)) {
        this.disconnectedPlayers.delete(key);
        this.clearReconnectTimeout(key);
      }
    }

    // 清理该房间的待亮牌数据
    const pendingReveal = this.pendingReveals.get(roomCode);
    if (pendingReveal) {
      clearTimeout(pendingReveal.timer);
      this.pendingReveals.delete(roomCode);
    }
    this.completedReveals.delete(roomCode);

    logger.info(`已清理房间 ${roomCode} 的关联游戏状态`);
  }
}

export const socketService = new SocketService();
