import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '../../../shared/constants/socket.constants';
import type { Card, GameState, PlayerAction } from '../../../shared/types/game.types';
import type { RoomPlayer } from '../../../shared/types/room.types';

interface RoomUpdatePayload {
  players: RoomPlayer[];
}

interface UserEventPayload {
  userId: string;
  reconnected?: boolean;
  reconnecting?: boolean;
}

interface EmojiPayload {
  userId: string;
  emoji: string;
}

interface ErrorPayload {
  message: string;
}

interface RebuyRequiredPayload {
  amount?: number;
  message?: string;
}

class SocketService {
  private socket: Socket | null = null;

  connect(): void {
    const backendUrl = import.meta.env.VITE_WS_URL;
    this.socket = io(backendUrl, {
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

  playerReady(roomCode: string): void {
    this.socket?.emit(SOCKET_EVENTS.PLAYER_READY, { roomCode });
  }

  playerAction(roomCode: string, action: PlayerAction, amount?: number): void {
    this.socket?.emit(SOCKET_EVENTS.PLAYER_ACTION, { roomCode, action, amount });
  }

  sendEmoji(roomCode: string, emoji: string): void {
    this.socket?.emit(SOCKET_EVENTS.SEND_EMOJI, { roomCode, emoji });
  }

  rebuy(roomCode: string, amount: number): void {
    this.socket?.emit(SOCKET_EVENTS.REBUY, { roomCode, amount });
  }

  onRoomUpdate(callback: (data: RoomUpdatePayload) => void): void {
    this.socket?.on(SOCKET_EVENTS.ROOM_UPDATE, callback);
  }

  onCountdownStart(callback: (data: { count?: number }) => void): void {
    this.socket?.on(SOCKET_EVENTS.COUNTDOWN_START, callback);
  }

  onGameStart(callback: (data: { gameState: GameState }) => void): void {
    this.socket?.on(SOCKET_EVENTS.GAME_START, callback);
  }

  onGameUpdate(callback: (data: GameState) => void): void {
    this.socket?.on(SOCKET_EVENTS.GAME_UPDATE, callback);
  }

  onPlayerJoined(callback: (data: UserEventPayload) => void): void {
    this.socket?.on(SOCKET_EVENTS.PLAYER_JOINED, callback);
  }

  onPlayerLeft(callback: (data: UserEventPayload) => void): void {
    this.socket?.on(SOCKET_EVENTS.PLAYER_LEFT, callback);
  }

  onNewEmoji(callback: (data: EmojiPayload) => void): void {
    this.socket?.on(SOCKET_EVENTS.NEW_EMOJI, callback);
  }

  onError(callback: (data: ErrorPayload) => void): void {
    this.socket?.on(SOCKET_EVENTS.ERROR, callback);
  }

  onRebuyRequired(callback: (data: RebuyRequiredPayload) => void): void {
    this.socket?.on(SOCKET_EVENTS.REBUY_REQUIRED, callback);
  }

  onGameOver(callback: (data: { winnerId?: string; winnerIds: string[] }) => void): void {
    this.socket?.on(SOCKET_EVENTS.GAME_OVER, callback);
  }

  revealCards(roomCode: string): void {
    this.socket?.emit(SOCKET_EVENTS.REVEAL_CARDS, { roomCode });
  }

  onCardsRevealed(callback: (data: { userId: string; cards: Card[] }) => void): void {
    this.socket?.on(SOCKET_EVENTS.CARDS_REVEALED, callback);
  }

  off(event: string, callback?: (...args: unknown[]) => void): void {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  offAll(): void {
    this.socket?.removeAllListeners();
  }
}

export const socketService = new SocketService();
