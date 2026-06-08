import {
  CatchMidHandRank,
  CatchMidRoundParticipant
} from '../../../../../shared/types/catch-mid.types';
import { CatchMidSettlement } from '../catch-mid.settlement';

const participant = (
  userId: string,
  rank: CatchMidHandRank,
  tiebreakers: number[]
): CatchMidRoundParticipant => ({
  userId,
  hand: {
    rank,
    cards: [],
    description: rank,
    rankValue: {
      joker_bomb: 7,
      bomb: 6,
      straight_flush: 5,
      flush: 4,
      straight: 3,
      pair: 2,
      high_card: 1
    }[rank],
    tiebreakers,
    isBomb: rank === 'joker_bomb' || rank === 'bomb'
  }
});

describe('CatchMidSettlement', () => {
  test('3 人 A>B>C 时中间玩家应分别付给头尾赢家', () => {
    const result = CatchMidSettlement.settleRound([
      participant('A', 'bomb', [14]),
      participant('B', 'straight', [10]),
      participant('C', 'high_card', [7, 4, 2])
    ], 1);

    expect(result.headWinnerIds).toEqual(['A']);
    expect(result.tailWinnerIds).toEqual(['C']);
    expect(result.loserIds).toEqual(['B']);
    expect(result.payments).toEqual([
      { fromUserId: 'B', toUserId: 'A', amount: 1, multiplier: 1 },
      { fromUserId: 'B', toUserId: 'C', amount: 1, multiplier: 1 }
    ]);
  });

  test('3 人 A>B=C 时无中间排名，A 独赢', () => {
    const result = CatchMidSettlement.settleRound([
      participant('A', 'bomb', [14]),
      participant('B', 'high_card', [9, 4, 2]),
      participant('C', 'high_card', [9, 4, 2])
    ], 1);

    expect(result.winnerIds).toEqual(['A']);
    expect(result.loserIds).toEqual(['B', 'C']);
    expect(result.payments).toEqual([
      { fromUserId: 'B', toUserId: 'A', amount: 1, multiplier: 1 },
      { fromUserId: 'C', toUserId: 'A', amount: 1, multiplier: 1 }
    ]);
  });

  test('4 人 A>B>C>D 时两个中间玩家均支付头尾赢家', () => {
    const result = CatchMidSettlement.settleRound([
      participant('A', 'bomb', [14]),
      participant('B', 'straight_flush', [10]),
      participant('C', 'pair', [8, 3]),
      participant('D', 'high_card', [7, 4, 2])
    ], 2);

    expect(result.winnerIds).toEqual(['A', 'D']);
    expect(result.loserIds).toEqual(['B', 'C']);
    expect(result.payments).toEqual([
      { fromUserId: 'B', toUserId: 'A', amount: 2, multiplier: 1 },
      { fromUserId: 'B', toUserId: 'D', amount: 2, multiplier: 1 },
      { fromUserId: 'C', toUserId: 'A', amount: 2, multiplier: 1 },
      { fromUserId: 'C', toUserId: 'D', amount: 2, multiplier: 1 }
    ]);
  });

  test('4 人 A=B>C>D 时 C 应支付两个头赢家和尾赢家', () => {
    const result = CatchMidSettlement.settleRound([
      participant('A', 'bomb', [14]),
      participant('B', 'bomb', [14]),
      participant('C', 'pair', [8, 3]),
      participant('D', 'high_card', [7, 4, 2])
    ], 1);

    expect(result.winnerIds).toEqual(['A', 'B', 'D']);
    expect(result.loserIds).toEqual(['C']);
    expect(result.payments).toEqual([
      { fromUserId: 'C', toUserId: 'A', amount: 1, multiplier: 1 },
      { fromUserId: 'C', toUserId: 'B', amount: 1, multiplier: 1 },
      { fromUserId: 'C', toUserId: 'D', amount: 1, multiplier: 1 }
    ]);
  });

  test('全部同牌力时无人支付', () => {
    const result = CatchMidSettlement.settleRound([
      participant('A', 'bomb', [14]),
      participant('B', 'bomb', [14]),
      participant('C', 'bomb', [14])
    ], 1);

    expect(result.winnerIds).toEqual([]);
    expect(result.loserIds).toEqual([]);
    expect(result.payments).toEqual([]);
  });

  test('炸弹输家向炸弹赢家支付双倍，向非炸弹赢家支付单倍', () => {
    const result = CatchMidSettlement.settleRound([
      participant('A', 'bomb', [14]),
      participant('B', 'bomb', [9]),
      participant('C', 'high_card', [8, 6, 2]),
      participant('D', 'high_card', [3, 2, 1])
    ], 1);

    expect(result.winnerIds).toEqual(['A', 'D']);
    expect(result.loserIds).toEqual(['B', 'C']);
    expect(result.payments).toEqual([
      { fromUserId: 'B', toUserId: 'A', amount: 2, multiplier: 2 },
      { fromUserId: 'B', toUserId: 'D', amount: 1, multiplier: 1 },
      { fromUserId: 'C', toUserId: 'A', amount: 1, multiplier: 1 },
      { fromUserId: 'C', toUserId: 'D', amount: 1, multiplier: 1 }
    ]);
  });

  test('无炸弹输家时不触发双倍', () => {
    const result = CatchMidSettlement.settleRound([
      participant('A', 'bomb', [14]),
      participant('B', 'pair', [9, 2]),
      participant('C', 'high_card', [8, 6, 2]),
      participant('D', 'high_card', [3, 2, 1])
    ], 1);

    expect(result.payments.every(payment => payment.multiplier === 1)).toBe(true);
  });
});
