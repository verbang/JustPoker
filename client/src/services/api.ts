import axios from 'axios';
import type { GameType, RoomPlayer } from '../../../shared/types/room.types';

// 环境变量未定义时使用默认值
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
});

export interface CreateRoomResponse {
  roomCode: string;
  roomId: string;
  userId: string;
  gameType: GameType;
  actionTimeoutEnabled: boolean;
}

export interface JoinRoomResponse {
  userId: string;
  nickname: string;
  status: string;
}

export interface RoomInfo {
  room: {
    id: string;
    roomCode: string;
    hostId: string;
    gameType: GameType;
    status: string;
    initialChips: number;
    actionTimeoutEnabled: boolean;
  };
  players: RoomPlayer[];
}

export const roomApi = {
  createRoom: (
    nickname: string,
    initialChips: number,
    password?: string,
    actionTimeoutEnabled = false,
    gameType: GameType = 'texas-holdem'
  ) =>
    api.post<CreateRoomResponse>('/rooms', { nickname, initialChips, password, actionTimeoutEnabled, gameType }),

  joinRoom: (roomCode: string, nickname: string, password?: string) =>
    api.post<JoinRoomResponse>(`/rooms/${roomCode}/join`, { nickname, password }),

  getRoomInfo: (roomCode: string) =>
    api.get<RoomInfo>(`/rooms/${roomCode}`),
};

export default api;
