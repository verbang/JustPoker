import { Rank, Suit } from './game.types';

export type CatchMidJokerRank = 'small_joker' | 'big_joker';

export type CatchMidCard =
  | {
      suit: Suit;
      rank: Rank;
      isWild: false;
    }
  | {
      suit: 'joker';
      rank: CatchMidJokerRank;
      isWild: true;
    };

export type CatchMidHandRank =
  | 'joker_bomb'
  | 'bomb'
  | 'straight_flush'
  | 'flush'
  | 'straight'
  | 'pair'
  | 'high_card';

export interface CatchMidHandResult {
  rank: CatchMidHandRank;
  cards: CatchMidCard[];
  description: string;
  rankValue: number;
  tiebreakers: number[];
  isBomb: boolean;
}

export interface CatchMidRoundParticipant {
  userId: string;
  hand: CatchMidHandResult;
}

export interface CatchMidPayment {
  fromUserId: string;
  toUserId: string;
  amount: number;
  multiplier: 1 | 2;
}

export interface CatchMidSettlementResult {
  winnerIds: string[];
  loserIds: string[];
  headWinnerIds: string[];
  tailWinnerIds: string[];
  payments: CatchMidPayment[];
}

export type CatchMidGamePhase =
  | 'waiting'
  | 'selecting'
  | 'round_result'
  | 'confirm_reveal'
  | 'finished'
  | 'game_draw'
  | 'game_over';

export interface CatchMidPlayer {
  userId: string;
  nickname: string;
  seatNumber: number;
  chips: number;
  cards: CatchMidCard[];
  status: 'playing' | 'out';
  selectedCardIds: string[];
  confirmed: boolean;
  revealConfirmed: boolean;
}

export interface CatchMidCommunityCard {
  card: CatchMidCard;
  visible: boolean;
}

export interface CatchMidRoundSelection {
  userId: string;
  selectedCards: CatchMidCard[];
  compareCards: CatchMidCard[];
  hand: CatchMidHandResult;
}

export interface CatchMidRoundResult {
  round: number;
  baseBet: number;
  communityCard?: CatchMidCommunityCard;
  selections: CatchMidRoundSelection[];
  settlement: CatchMidSettlementResult;
}

export interface CatchMidLeavePenaltyResult {
  userId: string;
  nickname: string;
  penaltyPerPlayer: number;
  payments: CatchMidPayment[];
}

export interface CatchMidGameState {
  id: string;
  roomId: string;
  phase: CatchMidGamePhase;
  round: number;
  players: CatchMidPlayer[];
  communityCards: CatchMidCommunityCard[];
  deckRemaining: number;
  discardPile: CatchMidCard[];
  roundResults: CatchMidRoundResult[];
  lastRoundResult?: CatchMidRoundResult;
  leavePenaltyResult?: CatchMidLeavePenaltyResult;
  eliminatedPlayerIds: string[];
  canStartNextHand: boolean;
  finalRanking: string[];
  actionRemainingMs?: number;
}
