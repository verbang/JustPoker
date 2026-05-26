// 用户信息
export interface User {
  id: string;
  nickname: string;
  createdAt: Date;
  updatedAt: Date;
}

// 用户战绩
export interface UserStats {
  totalGames: number;
  wins: number;
  winRate: number;
  totalProfit: number;
}

// 打赏请求
export interface TipRequest {
  toUserId: string;
  amount: number;
}

// 打赏记录
export interface Tip {
  id: string;
  gameId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  createdAt: Date;
}
