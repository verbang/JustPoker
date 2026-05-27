import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { SOCKET_EVENTS } from '@shared/constants/socket.constants';
import { roomService } from '../modules/room/room.service';

class SocketService {
  private io: Server | null = null;

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
        this.emitToRoom(data.roomCode, SOCKET_EVENTS.PLAYER_JOINED, { userId: data.userId });
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

      // Player action
      socket.on(SOCKET_EVENTS.PLAYER_ACTION, (data: { roomCode: string; action: string; amount?: number }) => {
        // Forward to game engine
        this.emitToRoom(data.roomCode, SOCKET_EVENTS.GAME_UPDATE, {
          userId: socket.data.userId,
          action: data.action,
          amount: data.amount,
        });
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
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });

    logger.info('Socket.io initialized');
  }

  getIO(): Server | null {
    return this.io;
  }

  joinRoom(socketId: string, roomId: string): void {
    this.io?.sockets.sockets.get(socketId)?.join(roomId);
  }

  leaveRoom(socketId: string, roomId: string): void {
    this.io?.sockets.sockets.get(socketId)?.leave(roomId);
  }

  emitToRoom(roomId: string, event: string, data: any): void {
    this.io?.to(roomId).emit(event, data);
  }

  emitToSocket(socketId: string, event: string, data: any): void {
    this.io?.to(socketId).emit(event, data);
  }
}

export const socketService = new SocketService();
