import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { SOCKET_EVENTS } from '../../../shared/constants/socket.constants';
import { roomService } from '../modules/room/room.service';
import { GameEngine } from '../modules/game/game.engine';
import { GameState, GamePlayer } from '../../../shared/types/game.types';

class SocketService {
  private io: Server | null = null;
  private gameEngines: Map<string, GameEngine> = new Map();
  private gameStates: Map<string, GameState> = new Map();
  private countdowns: Map<string, NodeJS.Timeout> = new Map();

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
        socket.join(data.roomCode);
        socket.data.userId = data.userId;
        socket.data.roomCode = data.roomCode;

        const players = roomService.getRoomPlayers(data.roomCode);
        this.emitToRoom(data.roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });

        // If game is in progress, send current game state to the joining player
        const gameState = this.gameStates.get(data.roomCode);
        if (gameState) {
          this.emitToSocket(socket.id, SOCKET_EVENTS.GAME_UPDATE, gameState);
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
        this.emitToRoom(data.roomCode, SOCKET_EVENTS.NEW_EMOJI, {
          userId: socket.data.userId,
          emoji: data.emoji,
        });
      });

      // Rebuy
      socket.on(SOCKET_EVENTS.REBUY, (data: { roomCode: string; amount: number }) => {
        const success = roomService.rebuy(data.roomCode, socket.data.userId, data.amount);

        if (success) {
          const players = roomService.getRoomPlayers(data.roomCode);
          this.emitToRoom(data.roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });
        }
      });

      socket.on('disconnect', () => {
        const userId = socket.data.userId as string;
        const roomCode = socket.data.roomCode as string;
        logger.info(`Client disconnected: ${socket.id}, userId: ${userId}`);

        if (roomCode && userId) {
          // Handle player disconnect during active game
          const gameState = this.gameStates.get(roomCode);
          if (gameState) {
            const player = gameState.players.find(p => p.userId === userId);
            if (player && player.status === 'playing') {
              // Auto-fold the disconnected player
              try {
                const engine = this.gameEngines.get(roomCode);
                if (engine) {
                  const newState = engine.playerAction(gameState, userId, 'fold');
                  this.gameStates.set(roomCode, newState);
                  this.emitToRoom(roomCode, SOCKET_EVENTS.GAME_UPDATE, newState);

                  if (newState.status === 'finished') {
                    this.handleGameFinished(roomCode, newState);
                  }
                }
              } catch {
                // Player's turn might have already passed, that's ok
              }
            }
          }

          // Remove player from room
          roomService.leaveRoom(roomCode, userId);
          const players = roomService.getRoomPlayers(roomCode);
          this.emitToRoom(roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });
          this.emitToRoom(roomCode, SOCKET_EVENTS.PLAYER_LEFT, { userId });
        }
      });
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
    const gameState = engine.startGame(roomCode, gamePlayers, room.smallBlind, room.bigBlind);

    this.gameEngines.set(roomCode, engine);
    this.gameStates.set(roomCode, gameState);

    // Update player statuses in room
    readyPlayers.forEach(p => {
      roomService.getRoomManager().updatePlayerStatus(roomCode, p.userId, 'playing');
    });

    logger.info(`Game started in room ${roomCode} with ${readyPlayers.length} players`);
    this.emitToRoom(roomCode, SOCKET_EVENTS.GAME_START, { gameState });
    this.emitToRoom(roomCode, SOCKET_EVENTS.GAME_UPDATE, gameState);
  }

  private handlePlayerAction(roomCode: string, userId: string, action: string, amount?: number): void {
    const engine = this.gameEngines.get(roomCode);
    const currentState = this.gameStates.get(roomCode);

    if (!engine || !currentState) {
      logger.warn(`No active game in room ${roomCode}`);
      return;
    }

    try {
      const newState = engine.playerAction(currentState, userId, action as any, amount);
      this.gameStates.set(roomCode, newState);

      // Broadcast updated game state
      this.emitToRoom(roomCode, SOCKET_EVENTS.GAME_UPDATE, newState);

      // Check if game finished
      if (newState.status === 'finished') {
        this.handleGameFinished(roomCode, newState);
      }
    } catch (error: any) {
      logger.error(`Player action error: ${error.message}`);
      this.emitToSocket(userId, SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  private handleGameFinished(roomCode: string, gameState: GameState): void {
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

    // Clean up game state
    this.gameEngines.delete(roomCode);
    this.gameStates.delete(roomCode);

    // Broadcast final state
    const players = roomService.getRoomPlayers(roomCode);
    this.emitToRoom(roomCode, SOCKET_EVENTS.ROOM_UPDATE, { players });
    this.emitToRoom(roomCode, SOCKET_EVENTS.GAME_OVER, { winnerId: gameState.winnerId });

    logger.info(`Game finished in room ${roomCode}, winner: ${gameState.winnerId}`);
  }

  getIO(): Server | null {
    return this.io;
  }

  emitToRoom(roomId: string, event: string, data: any): void {
    this.io?.to(roomId).emit(event, data);
  }

  emitToSocket(socketId: string, event: string, data: any): void {
    this.io?.to(socketId).emit(event, data);
  }
}

export const socketService = new SocketService();
