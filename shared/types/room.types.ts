// 房间状态
export type RoomStatus = 'waiting' | 'playing' | 'ended';

// 玩家状态
export type PlayerStatus = 'joined' | 'seated' | 'ready' | 'playing' | 'folded' | 'out';

// 房间信息
export interface Room {
  id: string;
  roomCode: string;
  hostId: string;
  status: RoomStatus;
  smallBlind: number;
  bigBlind: number;
  initialChips: number;
  createdAt: Date;
  updatedAt: Date;
}

// 房间玩家
export interface RoomPlayer {
  id: string;
  roomId: string;
  userId: string;
  nickname: string;
  seatNumber: number | null;
  chips: number;
  status: PlayerStatus;
  joinedAt: Date;
}

// 创建房间请求
export interface CreateRoomRequest {
  nickname: string;
  initialChips: number;
}

// 加入房间请求
export interface JoinRoomRequest {
  roomCode: string;
  nickname: string;
  chips: number;
}

// 选择座位请求
export interface SelectSeatRequest {
  seatNumber: number;
}

// 重新买入请求
export interface RebuyRequest {
  amount: number;
}
