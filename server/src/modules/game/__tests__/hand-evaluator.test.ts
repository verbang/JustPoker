import { HandEvaluator } from '../hand-evaluator';
import { Card } from '@shared/types/game.types';

describe('HandEvaluator', () => {
  test('should identify royal flush', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'A' },
      { suit: 'spades', rank: 'K' },
      { suit: 'spades', rank: 'Q' },
      { suit: 'spades', rank: 'J' },
      { suit: 'spades', rank: '10' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('royal_flush');
  });

  test('should identify straight flush', () => {
    const cards: Card[] = [
      { suit: 'hearts', rank: '9' },
      { suit: 'hearts', rank: '8' },
      { suit: 'hearts', rank: '7' },
      { suit: 'hearts', rank: '6' },
      { suit: 'hearts', rank: '5' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('straight_flush');
  });

  test('should identify four of a kind', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'K' },
      { suit: 'hearts', rank: 'K' },
      { suit: 'diamonds', rank: 'K' },
      { suit: 'clubs', rank: 'K' },
      { suit: 'spades', rank: 'A' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('four_of_a_kind');
  });

  test('should identify full house', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'J' },
      { suit: 'hearts', rank: 'J' },
      { suit: 'diamonds', rank: 'J' },
      { suit: 'clubs', rank: '8' },
      { suit: 'spades', rank: '8' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('full_house');
  });

  test('should identify flush', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'K' },
      { suit: 'spades', rank: 'J' },
      { suit: 'spades', rank: '9' },
      { suit: 'spades', rank: '7' },
      { suit: 'spades', rank: '3' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('flush');
  });

  test('should identify straight', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: '10' },
      { suit: 'hearts', rank: '9' },
      { suit: 'diamonds', rank: '8' },
      { suit: 'clubs', rank: '7' },
      { suit: 'spades', rank: '6' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('straight');
  });

  test('should identify three of a kind', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'Q' },
      { suit: 'hearts', rank: 'Q' },
      { suit: 'diamonds', rank: 'Q' },
      { suit: 'spades', rank: 'J' },
      { suit: 'hearts', rank: '9' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('three_of_a_kind');
  });

  test('should identify two pair', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'A' },
      { suit: 'hearts', rank: 'A' },
      { suit: 'diamonds', rank: 'K' },
      { suit: 'clubs', rank: 'K' },
      { suit: 'spades', rank: '10' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('two_pair');
  });

  test('should identify one pair', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'J' },
      { suit: 'hearts', rank: 'J' },
      { suit: 'diamonds', rank: 'A' },
      { suit: 'clubs', rank: 'K' },
      { suit: 'spades', rank: '9' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('one_pair');
  });

  test('should identify high card', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'A' },
      { suit: 'hearts', rank: 'K' },
      { suit: 'diamonds', rank: 'J' },
      { suit: 'clubs', rank: '9' },
      { suit: 'spades', rank: '7' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('high_card');
  });

  test('should find best hand from 7 cards', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'A' },
      { suit: 'spades', rank: 'K' },
      { suit: 'spades', rank: 'Q' },
      { suit: 'spades', rank: 'J' },
      { suit: 'spades', rank: '10' },
      { suit: 'hearts', rank: '2' },
      { suit: 'diamonds', rank: '3' },
    ];
    const result = HandEvaluator.findBestHand(cards);
    expect(result.rank).toBe('royal_flush');
  });

  test('should compare hands correctly', () => {
    const royalFlush: Card[] = [
      { suit: 'spades', rank: 'A' },
      { suit: 'spades', rank: 'K' },
      { suit: 'spades', rank: 'Q' },
      { suit: 'spades', rank: 'J' },
      { suit: 'spades', rank: '10' },
    ];
    const straightFlush: Card[] = [
      { suit: 'hearts', rank: '9' },
      { suit: 'hearts', rank: '8' },
      { suit: 'hearts', rank: '7' },
      { suit: 'hearts', rank: '6' },
      { suit: 'hearts', rank: '5' },
    ];
    expect(HandEvaluator.compareHands(royalFlush, straightFlush)).toBeGreaterThan(0);
  });

  test('should identify wheel straight (A-2-3-4-5)', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'A' },
      { suit: 'hearts', rank: '2' },
      { suit: 'diamonds', rank: '3' },
      { suit: 'clubs', rank: '4' },
      { suit: 'spades', rank: '5' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('straight');
  });

  test('should identify straight flush with wheel', () => {
    const cards: Card[] = [
      { suit: 'hearts', rank: 'A' },
      { suit: 'hearts', rank: '2' },
      { suit: 'hearts', rank: '3' },
      { suit: 'hearts', rank: '4' },
      { suit: 'hearts', rank: '5' },
    ];
    const result = HandEvaluator.evaluate(cards);
    expect(result.rank).toBe('straight_flush');
  });

  test('should throw error for less than 5 cards', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'A' },
      { suit: 'hearts', rank: 'K' },
    ];
    expect(() => HandEvaluator.evaluate(cards)).toThrow('Need at least 5 cards');
  });

  test('should find best hand when no strong hand exists', () => {
    const cards: Card[] = [
      { suit: 'spades', rank: 'A' },
      { suit: 'hearts', rank: 'K' },
      { suit: 'diamonds', rank: 'Q' },
      { suit: 'clubs', rank: 'J' },
      { suit: 'spades', rank: '9' },
      { suit: 'hearts', rank: '7' },
      { suit: 'diamonds', rank: '2' },
    ];
    const result = HandEvaluator.findBestHand(cards);
    expect(result.rank).toBe('high_card');
  });

  test('should compare equal hands as tie', () => {
    const hand1: Card[] = [
      { suit: 'spades', rank: 'A' },
      { suit: 'hearts', rank: 'K' },
      { suit: 'diamonds', rank: 'Q' },
      { suit: 'clubs', rank: 'J' },
      { suit: 'spades', rank: '9' },
    ];
    const hand2: Card[] = [
      { suit: 'hearts', rank: 'A' },
      { suit: 'diamonds', rank: 'K' },
      { suit: 'clubs', rank: 'Q' },
      { suit: 'spades', rank: 'J' },
      { suit: 'hearts', rank: '9' },
    ];
    expect(HandEvaluator.compareHands(hand1, hand2)).toBe(0);
  });
});
