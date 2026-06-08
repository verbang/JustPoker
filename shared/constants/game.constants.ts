import type { GameType } from '../types/room.types';

// 昵称规则
export const NICKNAME_MIN_LENGTH = 1;
export const NICKNAME_MAX_LENGTH = 5;
export const NICKNAME_REGEX = /^[一-龥a-zA-Z0-9]+$/;

// 筹码档次
export const CHIP_OPTIONS = [100, 200, 500] as const;
export const CATCH_MID_CHIP_OPTIONS = [50, 100, 200] as const;
export const DEFAULT_CHIPS = 100;

// 盲注设置
export const DEFAULT_SMALL_BLIND = 5;
export const DEFAULT_BIG_BLIND = 10;
export const BET_RAISE_STEP = 5;

// 牌型大小顺序
export const HAND_RANK_ORDER = {
  'royal_flush': 10,
  'straight_flush': 9,
  'four_of_a_kind': 8,
  'full_house': 7,
  'flush': 6,
  'straight': 5,
  'three_of_a_kind': 4,
  'two_pair': 3,
  'one_pair': 2,
  'high_card': 1
} as const;

// 游戏阶段
export const GAME_PHASES = ['preflop', 'flop', 'turn', 'river', 'showdown'] as const;

// 玩家操作
export const PLAYER_ACTIONS = ['fold', 'check', 'call', 'bet', 'raise', 'all_in'] as const;

// 座位数量
export const MAX_SEATS = 10;
export const CATCH_MID_MAX_SEATS = 4;
export const TEXAS_HOLDEM_MIN_PLAYERS = 2;
export const CATCH_MID_MIN_PLAYERS = 3;
export const DEFAULT_GAME_TYPE: GameType = 'texas-holdem';
export const GAME_TYPES: readonly GameType[] = ['texas-holdem', 'catch-mid'] as const;
export const GAME_TYPE_MAX_SEATS: Record<GameType, number> = {
  'texas-holdem': MAX_SEATS,
  'catch-mid': CATCH_MID_MAX_SEATS,
};
export const GAME_TYPE_MIN_PLAYERS: Record<GameType, number> = {
  'texas-holdem': TEXAS_HOLDEM_MIN_PLAYERS,
  'catch-mid': CATCH_MID_MIN_PLAYERS,
};

// 操作超时时间（秒）
export const ACTION_TIMEOUT = 60;

// 表情系统
export const EMOJIS = ['👍', '🎉', '😮', '😢', '😡', '🤔', '💰', '🃏', '🍀', '😎', '🙏', '⏰'] as const;
export const MAX_VISIBLE_EMOJIS = 3;
export const EMOJI_DURATION = 3000; // 毫秒
export const EMOJI_RATE_LIMIT_WINDOW = 5000; // 毫秒
export const EMOJI_RATE_LIMIT_COUNT = 5;
export const EMOJI_COOLDOWN_TIME = 10000; // 毫秒

// 打赏金额
export const TIP_AMOUNTS = [2, 5, 10, 20, 50] as const;
