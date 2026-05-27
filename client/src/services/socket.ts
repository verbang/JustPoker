import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '../../../shared/constants/socket.constants';

class SocketService {
  private socket: Socket | null = null;

  connect(): void {
    this.socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinRoom(roomCode: string, userId: string): void {
    this.socket?.emit(SOCKET_EVENTS.JOIN_ROOM, { roomCode, userId });
  }

  leaveRoom(roomCode: string): void {
    this.socket?.emit(SOCKET_EVENTS.LEAVE_ROOM, { roomCode });
  }

  selectSeat(roomCode: string, seatNumber: number): void {
    this.socket?.emit(SOCKET_EVENTS.SELECT_SEAT, { roomCode, seatNumber });
  }

  playerAction(roomCode: string, action: string, amount?: number): void {
    this.socket?.emit(SOCKET_EVENTS.PLAYER_ACTION, { roomCode, action, amount });
  }

  sendEmoji(roomCode: string, emoji: string): void {
    this.socket?.emit(SOCKET_EVENTS.SEND_EMOJI, { roomCode, emoji });
  }

  rebuy(roomCode: string, amount: number): void {
    this.socket?.emit(SOCKET_EVENTS.REBUY, { roomCode, amount });
  }

  onRoomUpdate(callback: (data: any) => void): void {
    this.socket?.on(SOCKET_EVENTS.ROOM_UPDATE, callback);
  }

  onGameStart(callback: (data: any) => void): void {
    this.socket?.on(SOCKET_EVENTS.GAME_START, callback);
  }

  onGameUpdate(callback: (data: any) => void): void {
    this.socket?.on(SOCKET_EVENTS.GAME_UPDATE, callback);
  }

  onPlayerJoined(callback: (data: any) => void): void {
    this.socket?.on(SOCKET_EVENTS.PLAYER_JOINED, callback);
  }

  onPlayerLeft(callback: (data: any) => void): void {
    this.socket?.on(SOCKET_EVENTS.PLAYER_LEFT, callback);
  }

  onNewEmoji(callback: (data: any) => void): void {
    this.socket?.on(SOCKET_EVENTS.NEW_EMOJI, callback);
  }

  onError(callback: (data: any) => void): void {
    this.socket?.on(SOCKET_EVENTS.ERROR, callback);
  }

  onRebuyRequired(callback: (data: any) => void): void {
    this.socket?.on(SOCKET_EVENTS.REBUY_REQUIRED, callback);
  }
}

export const socketService = new SocketService();
