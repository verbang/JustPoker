import { CatchMidCard } from '../../../../../shared/types/catch-mid.types';
import { Rank, Suit } from '../../../../../shared/types/game.types';
import { CatchMidHandEvaluator } from '../catch-mid.hand-evaluator';

const card = (rank: Rank, suit: Suit): CatchMidCard => ({ rank, suit, isWild: false });
const bigJoker = (): CatchMidCard => ({ rank: 'big_joker', suit: 'joker', isWild: true });
const smallJoker = (): CatchMidCard => ({ rank: 'small_joker', suit: 'joker', isWild: true });

describe('CatchMidHandEvaluator', () => {
  test('应识别王炸', () => {
    const result = CatchMidHandEvaluator.evaluate([bigJoker(), smallJoker(), card('A', 'spades')]);

    expect(result.rank).toBe('joker_bomb');
    expect(result.isBomb).toBe(true);
  });

  test('应识别普通炸弹', () => {
    const result = CatchMidHandEvaluator.evaluate([
      card('A', 'spades'),
      card('A', 'hearts'),
      card('A', 'diamonds')
    ]);

    expect(result.rank).toBe('bomb');
  });

  test('单张王加两张同点数应组成炸弹', () => {
    const result = CatchMidHandEvaluator.evaluate([bigJoker(), card('K', 'spades'), card('K', 'hearts')]);

    expect(result.rank).toBe('bomb');
  });

  test('应识别 A-2-3 低位同花顺', () => {
    const result = CatchMidHandEvaluator.evaluate([
      card('A', 'spades'),
      card('2', 'spades'),
      card('3', 'spades')
    ]);

    expect(result.rank).toBe('straight_flush');
    expect(result.tiebreakers).toEqual([3]);
  });

  test('应识别 Q-K-A 高位顺子', () => {
    const result = CatchMidHandEvaluator.evaluate([
      card('Q', 'spades'),
      card('K', 'hearts'),
      card('A', 'diamonds')
    ]);

    expect(result.rank).toBe('straight');
    expect(result.tiebreakers).toEqual([14]);
  });

  test('K-A-2 不应识别为顺子', () => {
    const result = CatchMidHandEvaluator.evaluate([
      card('K', 'spades'),
      card('A', 'hearts'),
      card('2', 'diamonds')
    ]);

    expect(result.rank).toBe('high_card');
  });

  test('单张王加两张同花连续牌应组成同花顺', () => {
    const result = CatchMidHandEvaluator.evaluate([smallJoker(), card('5', 'spades'), card('6', 'spades')]);

    expect(result.rank).toBe('straight_flush');
  });

  test('单张王加两张同花非连续牌应组成同花', () => {
    const result = CatchMidHandEvaluator.evaluate([bigJoker(), card('2', 'spades'), card('9', 'spades')]);

    expect(result.rank).toBe('flush');
    expect(result.tiebreakers).toEqual([14, 9, 2]);
  });

  test('单张王加两张连续不同花牌应组成顺子', () => {
    const result = CatchMidHandEvaluator.evaluate([smallJoker(), card('5', 'spades'), card('6', 'hearts')]);

    expect(result.rank).toBe('straight');
  });

  test('单张王加两张无关牌应与较大普通牌组成对子', () => {
    const result = CatchMidHandEvaluator.evaluate([smallJoker(), card('2', 'spades'), card('9', 'hearts')]);

    expect(result.rank).toBe('pair');
    expect(result.tiebreakers).toEqual([9, 2]);
  });

  test('单张王组成的对子应按较大普通牌点数比较', () => {
    const jokerPairOfNine = [smallJoker(), card('2', 'spades'), card('9', 'hearts')];
    const naturalPairOfEight = [card('8', 'spades'), card('8', 'hearts'), card('A', 'diamonds')];

    expect(CatchMidHandEvaluator.compareHands(jokerPairOfNine, naturalPairOfEight)).toBeGreaterThan(0);
  });

  test('应识别对子并按对子点数优先比较', () => {
    const kk3 = [card('K', 'spades'), card('K', 'hearts'), card('3', 'diamonds')];
    const qq9 = [card('Q', 'spades'), card('Q', 'hearts'), card('9', 'diamonds')];

    expect(CatchMidHandEvaluator.evaluate(kk3).rank).toBe('pair');
    expect(CatchMidHandEvaluator.compareHands(kk3, qq9)).toBeGreaterThan(0);
  });

  test('对子相同时应比较踢脚', () => {
    const kk5 = [card('K', 'spades'), card('K', 'hearts'), card('5', 'diamonds')];
    const kk3 = [card('K', 'clubs'), card('K', 'diamonds'), card('3', 'spades')];

    expect(CatchMidHandEvaluator.compareHands(kk5, kk3)).toBeGreaterThan(0);
  });

  test('王炸应大于普通炸弹', () => {
    const jokerBomb = [bigJoker(), smallJoker(), card('2', 'spades')];
    const bomb = [card('A', 'spades'), card('A', 'hearts'), card('A', 'diamonds')];

    expect(CatchMidHandEvaluator.compareHands(jokerBomb, bomb)).toBeGreaterThan(0);
  });

  test('同牌力应返回平局', () => {
    const hand1 = [card('A', 'spades'), card('K', 'hearts'), card('9', 'diamonds')];
    const hand2 = [card('A', 'hearts'), card('K', 'diamonds'), card('9', 'clubs')];

    expect(CatchMidHandEvaluator.compareHands(hand1, hand2)).toBe(0);
  });
});
