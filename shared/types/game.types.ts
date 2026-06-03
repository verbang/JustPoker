// 游戏阶段
export type GamePhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

// 玩家操作类型
export type PlayerAction = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in';

// 花色
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

// 牌面值
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

// 牌
export interface Card {
  suit: Suit;
  rank: Rank;
}

// 牌型
export type HandRank =
  | 'high_card'
  | 'one_pair'
  | 'two_pair'
  | 'three_of_a_kind'
  | 'straight'
  | 'flush'
  | 'full_house'
  | 'four_of_a_kind'
  | 'straight_flush'
  | 'royal_flush';

// 牌型评估结果
export interface HandResult {
  rank: HandRank;
  cards: Card[];
  description: string;
}

// 游戏状态
export interface GameState {
  id: string;
  roomId: string;
  phase: GamePhase;
  pot: number;
  communityCards: Card[];
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  currentBet: number;
  minRaise: number;
  minRaiseTo: number;
  players: GamePlayer[];
  sidePots: SidePot[];
  actionRemainingMs?: number; // 重连时服务端发送的操作倒计时剩余毫秒数
  status: 'waiting' | 'playing' | 'finished';
  winnerId?: string;
  winnerIds?: string[];
  isFoldWin?: boolean;  // 是否为弃牌获胜（其他玩家全部弃牌）
  winningHand?: string;
  lastAction?: { userId: string; action: PlayerAction; amount?: number }; // 最近一次操作（用于前端音效播放）
}

// 游戏中的玩家
export interface GamePlayer {
  userId: string;
  nickname: string;
  seatNumber: number;
  chips: number;
  bet: number;
  totalBet: number;
  cards: Card[];
  status: 'playing' | 'folded' | 'all_in' | 'out';
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
}

// 边池
export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}

// 玩家操作
export interface PlayerActionData {
  userId: string;
  action: PlayerAction;
  amount?: number;
  timestamp: number;
}
