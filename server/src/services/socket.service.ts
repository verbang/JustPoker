import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { SOCKET_EVENTS } from '../../../shared/constants/socket.constants';
import { ACTION_TIMEOUT, EMOJI_RATE_LIMIT_WINDOW, EMOJI_RATE_LIMIT_COUNT } from '../../../shared/constants/game.constants';
import { roomService } from '../modules/room/room.service';
import { GameEngine } from '../modules/game/game.engine';
import { GameState, GamePlayer, PlayerAction, Card } from '../../../shared/types/game.types';
import { CatchMidEngine } from '../modules/catch-mid/catch-mid.engine';
import { CatchMidGameState, CatchMidLeavePenaltyResult, CatchMidRoundResult } from '../../../shared/types/catch-mid.types';
import { RoomPlayer } from '../../../shared/types/room.types';

interface SocketPayload {
  [key: string]: unknown;
}

class SocketService {
  private io: Server | null = null;
  private gameEngines: Map<string, GameEngine> = new Map();
  private gameStates: Map<string, GameState> = new Map();
  private catchMidEngines: Map<string, CatchMidEngine> = new Map();
  private catchMidStates: Map<string, CatchMidGameState> = new Map();
  private catchMidAutoPlayers: Map<string, Set<string>> = new Map();
  private catchMidActionTimers: Map<string, NodeJS.Timeout> = new Map();
  private catchMidActionTimeoutStart: Map<string, number> = new Map();
  private catchMidActionKeys: Map<string, string> = new Map();
  private dealerSeatNumbers: Map<string, number> = new Map();
  private countdowns: Map<string, NodeJS.Timeout> = new Map();
  private actionTimers: Map<string, NodeJS.Timeout> = new Map();
  private actionTimeoutStart: Map<string, number> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private userSockets: Map<string, string> = new Map();
  // 保存断线玩家的信息，用于重连恢复
  private disconnectedPlayers: Map<string, { userId: string; roomCode: string; timestamp: number; actionElapsedMs: number }> = new Map();
  // 断线重连超时时间（30秒）
  private readonly RECONNECT_TIMEOUT_MS = 30000;
  // 表情发送限流记录
  private emojiRateLimits: Map<string, number[]> = new Map();
  // 弃牌获胜时暂存赢家数据，等待亮牌操作
  private pendingReveals: Map<string, { userId: string; cards: Card[]; roomCode: string; timer: NodeJS.Timeout }> = new Map();
  // 已完成的亮牌数据，用于重连玩家回放
  private completedReveals: Map<string, { userId: string; cards: Card[] }> = new Map();

  initialize(httpServer: HttpServer): void {
    const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean);

    this.io = new Server(httpServer, {
      cors: {
        origin: corsOrigins,
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
          const existingSocket = this.io!.sockets.sockets.get(existingSocketId);
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
        }

        const players = roomService.getRoomPlayers(data.roomCode);
        this.emitToRoom(data.roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });

        // If game is in progress, send current game state to the joining player
        const gameState = this.gameStates.get(data.roomCode);
        if (gameState) {
          // 重连玩家发送带剩余时间的游戏状态
          if (disconnectedInfo && gameState.status === 'playing') {
            const currentPlayer = gameState.players[gameState.currentPlayerIndex];
            // 如果当前行动玩家就是重连玩家，需要恢复服务端超时计时器
            if (currentPlayer?.userId === data.userId) {
              const remainingMs = Math.max(0, ACTION_TIMEOUT * 1000 - (disconnectedInfo.actionElapsedMs || 0));
              this.scheduleActionTimeout(data.roomCode, gameState, remainingMs);
            }
            // 所有重连玩家都发送带剩余时间的游戏状态
            const syncRemainingMs = this.getActionRemainingMs(data.roomCode);
            this.emitToSocket(socket.id, SOCKET_EVENTS.GAME_UPDATE, { ...gameState, actionRemainingMs: syncRemainingMs });

            // 广播重连成功事件给房间所有人（携带剩余时间）
            const joinPayload: Record<string, unknown> = { userId: data.userId, reconnected: true };
            if (currentPlayer?.userId === data.userId) {
              joinPayload.remainingMs = syncRemainingMs;
            }
            this.emitToRoom(data.roomCode, SOCKET_EVENTS.PLAYER_JOINED, joinPayload);
          } else {
            this.emitToSocket(socket.id, SOCKET_EVENTS.GAME_UPDATE, gameState);
          }
        }

        const catchMidState = this.catchMidStates.get(data.roomCode);
        if (catchMidState) {
          this.emitToSocket(socket.id, SOCKET_EVENTS.CATCH_MID_GAME_UPDATE, this.withCatchMidActionRemaining(data.roomCode, catchMidState));
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
        const userId = socket.data.userId as string;
        const roomCode = data.roomCode;

        // 清除断线重连记录（如果有）
        const disconnectedKey = `${roomCode}:${userId}`;
        this.disconnectedPlayers.delete(disconnectedKey);
        this.clearReconnectTimeout(disconnectedKey);

        const room = roomService.getRoom(roomCode);

        // Catch Mid 游戏中离开：支付惩罚并立即结束本局。
        const catchMidState = this.catchMidStates.get(roomCode);
        const catchMidPlayer = catchMidState?.players.find(player => player.userId === userId);
        if (room?.gameType === 'catch-mid' && catchMidPlayer?.status === 'playing') {
          const leavePenaltyResult = this.handleCatchMidActiveLeave(roomCode, userId);
          socket.leave(roomCode);
          this.emitToRoom(roomCode, SOCKET_EVENTS.PLAYER_LEFT, {
            userId,
            reason: 'leave',
            nickname: leavePenaltyResult?.nickname,
            chips: leavePenaltyResult
              ? leavePenaltyResult.payments.reduce((chips, payment) => chips - payment.amount, catchMidPlayer.chips)
              : catchMidPlayer.chips,
          });
          this.emitToRoom(roomCode, SOCKET_EVENTS.PLAY_SOUND, { sound: 'door' });
          return;
        }

        // 检查是否在游戏中
        const gameState = this.gameStates.get(roomCode);
        if (gameState) {
          const player = gameState.players.find(p => p.userId === userId);
          if (player && player.status === 'playing') {
            // 游戏中离开：自动弃牌
            const currentPlayer = gameState.players[gameState.currentPlayerIndex];
            const isCurrentPlayer = currentPlayer?.userId === userId;

            // 清除行动超时计时器（如果是当前行动玩家）
            if (isCurrentPlayer) {
              this.clearActionTimeout(roomCode);
            }

            // 调用 forceFold 弃牌
            try {
              const engine = this.gameEngines.get(roomCode);
              if (engine) {
                const newState = engine.forceFold(gameState, userId);
                this.gameStates.set(roomCode, newState);

                // 检查游戏是否结束
                if (newState.status === 'finished') {
                  this.handleGameFinished(roomCode, newState);
                } else if (isCurrentPlayer) {
                  // 游戏继续，安排下一个玩家的行动超时
                  this.scheduleActionTimeout(roomCode, newState);
                }

                this.emitToRoom(roomCode, SOCKET_EVENTS.GAME_UPDATE, newState);
              }
            } catch (error) {
              logger.error(`玩家 ${userId} 离开时弃牌失败: ${error}`);
            }
          }
        }

        const countdown = this.countdowns.get(roomCode);
        if (countdown) {
          // 取消倒计时
          logger.info(`房间 ${roomCode} 倒计时取消: 玩家 ${userId} 离开`);
          clearInterval(countdown);
          this.countdowns.delete(roomCode);
          // 广播倒计时取消
          this.emitToRoom(roomCode, SOCKET_EVENTS.COUNTDOWN_START, { count: null });
          // 将所有玩家状态重置为 'seated'
          roomService.getRoomManager().resetAllPlayersToSeated(roomCode);
        }

        // 检查是否是房主，如果是则转移房主
        if (room && room.hostId === userId) {
          const newHostId = roomService.getRoomManager().transferHost(roomCode, userId);
          if (newHostId) {
            logger.info(`房间 ${roomCode} 房主从 ${userId} 转移给 ${newHostId}`);
          }
        }

        // 从房间移除玩家
        socket.leave(roomCode);
        roomService.leaveRoom(roomCode, userId);

        // 广播房间更新和玩家离开事件
        const players = roomService.getRoomPlayers(roomCode);
        this.emitToRoom(roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });
        this.emitToRoom(roomCode, SOCKET_EVENTS.PLAYER_LEFT, { userId, reason: 'leave' });
        // 广播离开音效给房间内其他成员
        this.emitToRoom(roomCode, SOCKET_EVENTS.PLAY_SOUND, { sound: 'door' });
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

      socket.on(SOCKET_EVENTS.CATCH_MID_SELECT_CARDS, (data: { roomCode: string; cardIds: string[] }) => {
        this.handleCatchMidSelectCards(data.roomCode, socket.data.userId, data.cardIds);
      });

      socket.on(SOCKET_EVENTS.CATCH_MID_CONFIRM_CARDS, (data: { roomCode: string }) => {
        this.handleCatchMidConfirmCards(data.roomCode, socket.data.userId);
      });

      socket.on(SOCKET_EVENTS.CATCH_MID_CONFIRM_REVEAL, (data: { roomCode: string }) => {
        this.handleCatchMidConfirmReveal(data.roomCode, socket.data.userId);
      });

      socket.on(SOCKET_EVENTS.CATCH_MID_ADVANCE_ROUND, (data: { roomCode: string }) => {
        this.handleCatchMidAdvanceRound(data.roomCode, socket.data.userId);
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
        if (this.gameStates.has(data.roomCode) || this.catchMidStates.has(data.roomCode)) {
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
              let actionElapsedMs = 0;
              const currentPlayer = gameState.players[gameState.currentPlayerIndex];
              const isCurrentActor = currentPlayer?.userId === userId;
              if (isCurrentActor) {
                actionElapsedMs = this.clearActionTimeout(roomCode);
              }

              this.disconnectedPlayers.set(`${roomCode}:${userId}`, {
                userId,
                roomCode,
                timestamp: Date.now(),
                actionElapsedMs,
              });
              logger.info(`玩家 ${userId} 在游戏中断线，等待重连...`);

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

              // 通知其他玩家有玩家断线，当前行动玩家断线时携带剩余时间
              const payload: Record<string, unknown> = { userId, reason: 'disconnect', reconnecting: true };
              if (isCurrentActor) {
                payload.remainingMs = Math.max(0, ACTION_TIMEOUT * 1000 - actionElapsedMs);
              }
              this.emitToRoom(roomCode, SOCKET_EVENTS.PLAYER_LEFT, payload);
              return; // 不立即从房间移除，等待重连或超时
            }
          }

          const catchMidState = this.catchMidStates.get(roomCode);
          const catchMidPlayer = catchMidState?.players.find(player => player.userId === userId);
          if (catchMidPlayer?.status === 'playing') {
            this.disconnectedPlayers.set(`${roomCode}:${userId}`, {
              userId,
              roomCode,
              timestamp: Date.now(),
              actionElapsedMs: 0,
            });
            logger.info(`Catch Mid 玩家 ${userId} 断线，等待重连...`);

            const disconnectedKey = `${roomCode}:${userId}`;
            this.clearReconnectTimeout(disconnectedKey);
            const reconnectTimer = setTimeout(() => {
              const disconnectedInfo = this.disconnectedPlayers.get(disconnectedKey);
              if (disconnectedInfo) {
                logger.info(`Catch Mid 玩家 ${userId} 重连超时，系统托管确认`);
                this.disconnectedPlayers.delete(disconnectedKey);
                this.reconnectTimers.delete(disconnectedKey);
                this.handleCatchMidPlayerDisconnect(roomCode, userId);
              }
            }, this.RECONNECT_TIMEOUT_MS);
            this.reconnectTimers.set(disconnectedKey, reconnectTimer);

            this.emitToRoom(roomCode, SOCKET_EVENTS.PLAYER_LEFT, { userId, reason: 'disconnect', reconnecting: true });
            return;
          }

          // 非游戏中断线，也给 30 秒重连窗口
          this.disconnectedPlayers.set(`${roomCode}:${userId}`, {
            userId,
            roomCode,
            timestamp: Date.now(),
            actionElapsedMs: 0,
          });
          logger.info(`玩家 ${roomCode}:${userId} 在非游戏状态断线，等待重连...`);

          const disconnectedKey = `${roomCode}:${userId}`;
          this.clearReconnectTimeout(disconnectedKey);
          const reconnectTimer = setTimeout(() => {
            const disconnectedInfo = this.disconnectedPlayers.get(disconnectedKey);
            if (disconnectedInfo) {
              logger.info(`玩家 ${userId} 非游戏状态重连超时，移除`);
              this.disconnectedPlayers.delete(disconnectedKey);
              this.reconnectTimers.delete(disconnectedKey);
              this.handlePlayerLeaveRoom(roomCode, userId);
            }
          }, this.RECONNECT_TIMEOUT_MS);
          this.reconnectTimers.set(disconnectedKey, reconnectTimer);

          // 通知其他玩家有玩家断线
          this.emitToRoom(roomCode, SOCKET_EVENTS.PLAYER_LEFT, { userId, reason: 'disconnect', reconnecting: true });
          return;
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
    if (this.catchMidStates.has(roomCode)) return;

    // Don't start if countdown is already running
    if (this.countdowns.has(roomCode)) return;

    // Check if all seated players are ready
    if (!roomService.allSeatedPlayersReady(roomCode)) return;

    const room = roomService.getRoom(roomCode);
    if (!room) return;

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
    const room = roomService.getRoom(roomCode);
    if (!room) return;

    const readyPlayers = allPlayers
      .filter(p => p.status === 'ready')
      .sort((a, b) => {
        if (room.gameType === 'catch-mid') {
          return a.joinedAt.getTime() - b.joinedAt.getTime();
        }
        return (a.seatNumber || 0) - (b.seatNumber || 0);
      });

    // Don't start if game is already in progress
    if (this.gameStates.has(roomCode)) return;
    if (this.catchMidStates.has(roomCode)) return;

    // 清除上一局的亮牌数据
    this.completedReveals.delete(roomCode);
    const pendingReveal = this.pendingReveals.get(roomCode);
    if (pendingReveal) {
      clearTimeout(pendingReveal.timer);
      this.pendingReveals.delete(roomCode);
    }

    if (room.gameType === 'catch-mid') {
      this.startCatchMidGame(roomCode, readyPlayers);
      return;
    }

    // Need at least 2 players to start
    if (readyPlayers.length < 2) return;

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

  private startCatchMidGame(roomCode: string, readyPlayers: RoomPlayer[]): void {
    if (readyPlayers.length < 3 || readyPlayers.length > 4) return;

    const engine = new CatchMidEngine();
    const gameState = engine.startGame(roomCode, readyPlayers);
    this.catchMidEngines.set(roomCode, engine);
    this.catchMidStates.set(roomCode, gameState);
    this.catchMidAutoPlayers.delete(roomCode);

    readyPlayers.forEach(player => {
      roomService.getRoomManager().updatePlayerStatus(roomCode, player.userId, 'playing');
    });

    logger.info(`Catch Mid game started in room ${roomCode} with ${readyPlayers.length} players`);
    this.scheduleCatchMidActionTimeout(roomCode, gameState);
    const gameStateWithTimer = this.withCatchMidActionRemaining(roomCode, gameState);
    this.emitToRoom(roomCode, SOCKET_EVENTS.CATCH_MID_GAME_START, { gameState: gameStateWithTimer });
    this.emitCatchMidGameUpdate(roomCode, gameState);
  }

  private handleCatchMidSelectCards(roomCode: string, userId: string, cardIds: string[]): void {
    const engine = this.catchMidEngines.get(roomCode);
    const currentState = this.catchMidStates.get(roomCode);
    if (!engine || !currentState) return;

    try {
      const newState = engine.selectCards(currentState, userId, cardIds);
      this.catchMidStates.set(roomCode, newState);
      this.emitCatchMidGameUpdate(roomCode, newState);
    } catch (error: unknown) {
      this.emitCatchMidError(userId, error);
    }
  }

  private handleCatchMidConfirmCards(roomCode: string, userId: string): void {
    const engine = this.catchMidEngines.get(roomCode);
    const currentState = this.catchMidStates.get(roomCode);
    if (!engine || !currentState) return;

    try {
      const newState = engine.confirmSelection(currentState, userId);
      const finalState = this.updateCatchMidState(roomCode, currentState, newState);
      this.handleCatchMidFinishedPhase(roomCode, finalState);
    } catch (error: unknown) {
      this.emitCatchMidError(userId, error);
    }
  }

  private handleCatchMidConfirmReveal(roomCode: string, userId: string): void {
    const engine = this.catchMidEngines.get(roomCode);
    const currentState = this.catchMidStates.get(roomCode);
    if (!engine || !currentState) return;

    try {
      const newState = engine.confirmReveal(currentState, userId);
      const finalState = this.updateCatchMidState(roomCode, currentState, newState);
      this.handleCatchMidFinishedPhase(roomCode, finalState);
    } catch (error: unknown) {
      this.emitCatchMidError(userId, error);
    }
  }

  private handleCatchMidAutoConfirm(roomCode: string, userId: string): void {
    const engine = this.catchMidEngines.get(roomCode);
    const currentState = this.catchMidStates.get(roomCode);
    if (!engine || !currentState) return;

    try {
      const newState = engine.autoConfirmCurrentPhase(currentState, userId);
      const finalState = this.updateCatchMidState(roomCode, currentState, newState);
      this.handleCatchMidFinishedPhase(roomCode, finalState);
    } catch (error: unknown) {
      this.emitCatchMidError(userId, error);
    }
  }

  private addCatchMidAutoPlayer(roomCode: string, userId: string): void {
    const autoPlayers = this.catchMidAutoPlayers.get(roomCode) ?? new Set<string>();
    autoPlayers.add(userId);
    this.catchMidAutoPlayers.set(roomCode, autoPlayers);
  }

  private updateCatchMidState(
    roomCode: string,
    previousState: CatchMidGameState,
    nextState: CatchMidGameState
  ): CatchMidGameState {
    let currentState = nextState;
    const autoPlayers = this.catchMidAutoPlayers.get(roomCode);
    if (autoPlayers && autoPlayers.size > 0) {
      currentState = this.applyCatchMidAutoPlayers(roomCode, previousState, currentState, autoPlayers);
    }

    this.catchMidStates.set(roomCode, currentState);

    const resolvedNewRound = currentState.lastRoundResult
      && currentState.lastRoundResult.round !== previousState.lastRoundResult?.round;
    if (resolvedNewRound && currentState.lastRoundResult) {
      this.syncCatchMidRoomChips(roomCode, currentState);
      this.emitToRoom(roomCode, SOCKET_EVENTS.CATCH_MID_ROUND_RESULT, currentState.lastRoundResult);
    }

    this.scheduleCatchMidActionTimeout(roomCode, currentState);
    this.emitCatchMidGameUpdate(roomCode, currentState);

    return currentState;
  }

  private syncCatchMidRoomChips(roomCode: string, gameState: CatchMidGameState): void {
    const roomPlayers = roomService.getRoomPlayers(roomCode);
    gameState.players.forEach(player => {
      const roomPlayer = roomPlayers.find(item => item.userId === player.userId);
      if (roomPlayer) {
        roomPlayer.chips = player.chips;
      }
    });
    this.emitToRoom(roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players: roomPlayers });
  }

  private emitCatchMidGameUpdate(roomCode: string, gameState: CatchMidGameState): void {
    this.emitToRoom(roomCode, SOCKET_EVENTS.CATCH_MID_GAME_UPDATE, this.withCatchMidActionRemaining(roomCode, gameState));
  }

  private withCatchMidActionRemaining(roomCode: string, gameState: CatchMidGameState): CatchMidGameState {
    const remainingMs = this.getCatchMidActionRemainingMs(roomCode);
    if (remainingMs === null) {
      const { actionRemainingMs, ...stateWithoutTimer } = gameState;
      return stateWithoutTimer;
    }
    return { ...gameState, actionRemainingMs: remainingMs };
  }

  private scheduleCatchMidActionTimeout(roomCode: string, gameState: CatchMidGameState): void {
    const room = roomService.getRoom(roomCode);
    if (!room?.actionTimeoutEnabled || gameState.phase !== 'selecting' && gameState.phase !== 'confirm_reveal') {
      this.clearCatchMidActionTimeout(roomCode);
      return;
    }

    const pendingPlayers = gameState.players.filter(player => {
      if (player.status !== 'playing') return false;
      if (gameState.phase === 'selecting') return !player.confirmed;
      return !player.revealConfirmed;
    });
    if (pendingPlayers.length === 0) {
      this.clearCatchMidActionTimeout(roomCode);
      return;
    }

    const actionKey = `${gameState.id}:${gameState.round}:${gameState.phase}`;
    if (this.catchMidActionKeys.get(roomCode) === actionKey && this.catchMidActionTimers.has(roomCode)) {
      return;
    }

    this.clearCatchMidActionTimeout(roomCode);

    this.catchMidActionKeys.set(roomCode, actionKey);
    this.catchMidActionTimeoutStart.set(roomCode, Date.now());
    const timer = setTimeout(() => {
      this.handleCatchMidActionTimeout(roomCode, gameState.id, gameState.round, gameState.phase);
    }, ACTION_TIMEOUT * 1000);
    this.catchMidActionTimers.set(roomCode, timer);
  }

  private clearCatchMidActionTimeout(roomCode: string): void {
    const timer = this.catchMidActionTimers.get(roomCode);
    if (timer) {
      clearTimeout(timer);
      this.catchMidActionTimers.delete(roomCode);
    }
    this.catchMidActionTimeoutStart.delete(roomCode);
    this.catchMidActionKeys.delete(roomCode);
  }

  private getCatchMidActionRemainingMs(roomCode: string): number | null {
    const start = this.catchMidActionTimeoutStart.get(roomCode);
    if (!start) return null;
    const elapsed = Date.now() - start;
    return Math.max(0, ACTION_TIMEOUT * 1000 - elapsed);
  }

  private handleCatchMidActionTimeout(
    roomCode: string,
    stateId: string,
    round: number,
    phase: CatchMidGameState['phase']
  ): void {
    const engine = this.catchMidEngines.get(roomCode);
    let currentState = this.catchMidStates.get(roomCode);
    if (!engine || !currentState) return;
    if (currentState.id !== stateId || currentState.round !== round || currentState.phase !== phase) return;
    if (phase !== 'selecting' && phase !== 'confirm_reveal') return;

    this.clearCatchMidActionTimeout(roomCode);

    const pendingUserIds = currentState.players
      .filter(player => {
        if (player.status !== 'playing') return false;
        if (phase === 'selecting') return !player.confirmed;
        return !player.revealConfirmed;
      })
      .map(player => player.userId);

    for (const pendingUserId of pendingUserIds) {
      try {
        const previousState = currentState;
        const nextState = engine.autoConfirmCurrentPhase(currentState, pendingUserId);
        currentState = this.updateCatchMidState(roomCode, previousState, nextState);
        if (currentState.phase !== phase || currentState.round !== round) {
          break;
        }
      } catch (error: unknown) {
        this.emitCatchMidError(pendingUserId, error);
      }
    }

    this.handleCatchMidFinishedPhase(roomCode, currentState);
  }

  private applyCatchMidAutoPlayers(
    roomCode: string,
    previousState: CatchMidGameState,
    nextState: CatchMidGameState,
    autoPlayers: Set<string>
  ): CatchMidGameState {
    const engine = this.catchMidEngines.get(roomCode);
    if (!engine || nextState.phase !== 'selecting' && nextState.phase !== 'round_result' && nextState.phase !== 'confirm_reveal') {
      return nextState;
    }

    let currentState = nextState;
    for (const userId of autoPlayers) {
      const player = currentState.players.find(item => item.userId === userId);
      if (!player || player.status !== 'playing') continue;
      const beforeRound = currentState.lastRoundResult?.round ?? previousState.lastRoundResult?.round;
      currentState = engine.autoConfirmCurrentPhase(currentState, userId);
      const afterRound = currentState.lastRoundResult?.round;
      if (currentState.phase === 'round_result' && afterRound !== beforeRound) {
        break;
      }
    }

    return currentState;
  }

  private handleCatchMidAdvanceRound(roomCode: string, userId: string): void {
    const engine = this.catchMidEngines.get(roomCode);
    const currentState = this.catchMidStates.get(roomCode);
    if (!engine || !currentState) return;

    try {
      const newState = engine.confirmContinueAfterRoundResult(currentState, userId);
      const finalState = this.updateCatchMidState(roomCode, currentState, newState);

      this.handleCatchMidFinishedPhase(roomCode, finalState);
    } catch (error: unknown) {
      this.emitCatchMidError(userId, error);
    }
  }

  private handleCatchMidActiveLeave(roomCode: string, userId: string): CatchMidLeavePenaltyResult | null {
    const currentState = this.catchMidStates.get(roomCode);
    if (!currentState) return null;

    this.clearCatchMidActionTimeout(roomCode);

    const leavingPlayer = currentState.players.find(player => player.userId === userId);
    if (!leavingPlayer) return null;

    const recipients = roomService.getRoomPlayers(roomCode)
      .filter(player => player.userId !== userId && player.status !== 'out');
    const penaltyPerPlayer = 5;
    const payments = recipients.map(recipient => ({
      fromUserId: userId,
      toUserId: recipient.userId,
      amount: penaltyPerPlayer,
      multiplier: 1 as const,
    }));

    const nextState: CatchMidGameState = {
      ...currentState,
      players: currentState.players.map(player => {
        if (player.userId === userId) {
          return {
            ...player,
            chips: player.chips - penaltyPerPlayer * recipients.length,
            status: 'out' as const,
          };
        }
        const shouldReceivePenalty = recipients.some(recipient => recipient.userId === player.userId);
        return shouldReceivePenalty ? { ...player, chips: player.chips + penaltyPerPlayer } : player;
      }),
      communityCards: currentState.communityCards.map(item => ({ ...item })),
      discardPile: [...currentState.discardPile],
      roundResults: [...currentState.roundResults],
      eliminatedPlayerIds: Array.from(new Set([...currentState.eliminatedPlayerIds, userId])),
      finalRanking: currentState.players
        .map(player => ({
          userId: player.userId,
          chips: player.userId === userId
            ? player.chips - penaltyPerPlayer * recipients.length
            : player.chips + (recipients.some(recipient => recipient.userId === player.userId) ? penaltyPerPlayer : 0),
        }))
        .sort((a, b) => b.chips - a.chips)
        .map(player => player.userId),
      phase: 'finished',
      canStartNextHand: recipients.length >= 3,
      leavePenaltyResult: {
        userId,
        nickname: leavingPlayer.nickname,
        penaltyPerPlayer,
        payments,
      },
    };

    this.syncCatchMidRoomChips(roomCode, nextState);

    this.handleCatchMidGameFinished(roomCode, nextState);
    const room = roomService.getRoom(roomCode);
    if (room && room.hostId === userId) {
      const newHostId = roomService.getRoomManager().transferHost(roomCode, userId);
      if (newHostId) {
        logger.info(`房间 ${roomCode} 房主从 ${userId} 转移给 ${newHostId}`);
      }
    }
    roomService.leaveRoom(roomCode, userId);
    const players = roomService.getRoomPlayers(roomCode);
    this.emitToRoom(roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });

    return nextState.leavePenaltyResult ?? null;
  }

  private handleCatchMidGameFinished(roomCode: string, gameState: CatchMidGameState): void {
    this.clearCatchMidActionTimeout(roomCode);

    gameState.players.forEach(player => {
      const roomPlayer = roomService.getRoomPlayers(roomCode).find(item => item.userId === player.userId);
      if (!roomPlayer) return;
      roomPlayer.chips = player.chips;
      roomService.getRoomManager().updatePlayerStatus(roomCode, player.userId, player.status === 'out' ? 'out' : 'seated');
    });

    this.catchMidEngines.delete(roomCode);
    this.catchMidStates.delete(roomCode);
    this.catchMidAutoPlayers.delete(roomCode);

    const players = roomService.getRoomPlayers(roomCode);
    this.emitToRoom(roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });
    this.emitToRoom(roomCode, SOCKET_EVENTS.CATCH_MID_GAME_OVER, {
      phase: gameState.phase,
      eliminatedPlayerIds: gameState.eliminatedPlayerIds,
      canStartNextHand: gameState.canStartNextHand,
      finalRanking: gameState.finalRanking,
      gameState: this.withCatchMidActionRemaining(roomCode, gameState)
    });
  }

  private handleCatchMidFinishedPhase(roomCode: string, gameState: CatchMidGameState): void {
    if (gameState.phase === 'finished' || gameState.phase === 'game_over' || gameState.phase === 'game_draw') {
      this.handleCatchMidGameFinished(roomCode, gameState);
    }
  }

  private emitCatchMidError(userId: string, error: unknown): void {
    const message = error instanceof Error ? error.message : 'Catch Mid 操作失败';
    logger.error(`Catch Mid error: ${message}`);
    this.emitToUser(userId, SOCKET_EVENTS.ERROR, { message });
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

  private scheduleActionTimeout(roomCode: string, gameState: GameState, remainingMs?: number): void {
    this.clearActionTimeout(roomCode);

    if (gameState.status !== 'playing') return;

    const room = roomService.getRoom(roomCode);
    if (!room?.actionTimeoutEnabled) return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.status !== 'playing') return;

    const timeoutMs = remainingMs ?? ACTION_TIMEOUT * 1000;
    // 如果是恢复倒计时，需要回推原始开始时间
    const startOffset = remainingMs != null ? ACTION_TIMEOUT * 1000 - remainingMs : 0;
    this.actionTimeoutStart.set(roomCode, Date.now() - startOffset);

    const timer = setTimeout(() => {
      this.handleActionTimeout(roomCode, currentPlayer.userId);
    }, timeoutMs);

    this.actionTimers.set(roomCode, timer);
  }

  private clearActionTimeout(roomCode: string): number {
    const timer = this.actionTimers.get(roomCode);
    if (!timer) return 0;

    clearTimeout(timer);
    this.actionTimers.delete(roomCode);

    // 计算已消耗的时间
    const start = this.actionTimeoutStart.get(roomCode);
    this.actionTimeoutStart.delete(roomCode);
    if (!start) return 0;

    const elapsed = Date.now() - start;
    return Math.min(elapsed, ACTION_TIMEOUT * 1000);
  }

  private getActionRemainingMs(roomCode: string): number {
    const start = this.actionTimeoutStart.get(roomCode);
    if (!start) return ACTION_TIMEOUT * 1000;
    const elapsed = Date.now() - start;
    return Math.max(0, ACTION_TIMEOUT * 1000 - elapsed);
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

  emitToRoom(roomId: string, event: string, data: SocketPayload | GameState | CatchMidGameState | CatchMidRoundResult): void {
    this.io?.to(roomId).emit(event, data);
  }

  emitToSocket(socketId: string, event: string, data: SocketPayload | GameState | CatchMidGameState | CatchMidRoundResult): void {
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

  private handleCatchMidPlayerDisconnect(roomCode: string, userId: string): void {
    this.addCatchMidAutoPlayer(roomCode, userId);
    this.handleCatchMidAutoConfirm(roomCode, userId);
    this.handlePlayerLeaveRoom(roomCode, userId);
  }

  /**
   * 处理玩家离开房间
   */
  private handlePlayerLeaveRoom(roomCode: string, userId: string): void {
    // 检查是否是房主，如果是则转移房主
    const room = roomService.getRoom(roomCode);
    if (room && room.hostId === userId) {
      const newHostId = roomService.getRoomManager().transferHost(roomCode, userId);
      if (newHostId) {
        logger.info(`房间 ${roomCode} 房主从 ${userId} 转移给 ${newHostId}`);
      }
    }

    roomService.leaveRoom(roomCode, userId);
    const players = roomService.getRoomPlayers(roomCode);
    this.emitToRoom(roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });
    this.emitToRoom(roomCode, SOCKET_EVENTS.PLAYER_LEFT, { userId, reason: 'timeout' });
  }

  /**
   * 清理与房间关联的所有游戏状态。
   * 由 RoomManager 的房间删除回调触发，防止内存泄漏。
   */
  private cleanupRoomGameState(roomCode: string): void {
    this.clearActionTimeout(roomCode);
    this.clearCatchMidActionTimeout(roomCode);
    this.gameEngines.delete(roomCode);
    this.gameStates.delete(roomCode);
    this.catchMidEngines.delete(roomCode);
    this.catchMidStates.delete(roomCode);
    this.catchMidAutoPlayers.delete(roomCode);
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
