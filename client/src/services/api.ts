import axios from 'axios';

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
    status: string;
    initialChips: number;
    actionTimeoutEnabled: boolean;
  };
  players: Array<{
    userId: string;
    nickname: string;
    seatNumber: number | null;
    chips: number;
    status: string;
  }>;
}

export const roomApi = {
  createRoom: (nickname: string, initialChips: number, password?: string, actionTimeoutEnabled = false) =>
    api.post<CreateRoomResponse>('/rooms', { nickname, initialChips, password, actionTimeoutEnabled }),

  joinRoom: (roomCode: string, nickname: string, chips: number, password?: string) =>
    api.post<JoinRoomResponse>(`/rooms/${roomCode}/join`, { nickname, chips, password }),

  getRoomInfo: (roomCode: string) =>
    api.get<RoomInfo>(`/rooms/${roomCode}`),
};

export default api;
