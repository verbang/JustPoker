import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';

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
