import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export interface CreateRoomResponse {
  roomCode: string;
  roomId: string;
  userId: string;
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
  createRoom: (nickname: string, initialChips: number) =>
    api.post<CreateRoomResponse>('/rooms', { nickname, initialChips }),

  joinRoom: (roomCode: string, nickname: string, chips: number) =>
    api.post<JoinRoomResponse>(`/rooms/${roomCode}/join`, { nickname, chips }),

  getRoomInfo: (roomCode: string) =>
    api.get<RoomInfo>(`/rooms/${roomCode}`),
};

export default api;
