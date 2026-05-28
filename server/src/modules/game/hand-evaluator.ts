import { Card, HandRank, HandResult, Rank } from '../../../../shared/types/game.types';
import { HAND_RANK_ORDER } from '../../../../shared/constants/game.constants';

const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export class HandEvaluator {
  static evaluate(cards: Card[]): HandResult {
    if (cards.length < 5) {
      throw new Error('Need at least 5 cards to evaluate');
    }

    const sorted = this.sortCards(cards);
    const isFlush = this.isFlush(sorted);
    const isStraight = this.isStraight(sorted);
    const groups = this.groupByRank(sorted);

    // Check for royal flush
    if (isFlush && isStraight && sorted[0].rank === 'A' && sorted[4].rank === '10') {
      return { rank: 'royal_flush', cards: sorted, description: 'Royal Flush' };
    }

    // Check for straight flush
    if (isFlush && isStraight) {
      return { rank: 'straight_flush', cards: sorted, description: 'Straight Flush' };
    }

    // Check for four of a kind
    if (groups.some(g => g.length === 4)) {
      return { rank: 'four_of_a_kind', cards: sorted, description: 'Four of a Kind' };
    }

    // Check for full house
    const hasThree = groups.some(g => g.length === 3);
    const hasTwo = groups.some(g => g.length === 2);
    if (hasThree && hasTwo) {
      return { rank: 'full_house', cards: sorted, description: 'Full House' };
    }

    // Check for flush
    if (isFlush) {
      return { rank: 'flush', cards: sorted, description: 'Flush' };
    }

    // Check for straight
    if (isStraight) {
      return { rank: 'straight', cards: sorted, description: 'Straight' };
    }

    // Check for three of a kind
    if (hasThree) {
      return { rank: 'three_of_a_kind', cards: sorted, description: 'Three of a Kind' };
    }

    // Check for two pair
    const pairs = groups.filter(g => g.length === 2);
    if (pairs.length >= 2) {
      return { rank: 'two_pair', cards: sorted, description: 'Two Pair' };
    }

    // Check for one pair
    if (pairs.length === 1) {
      return { rank: 'one_pair', cards: sorted, description: 'One Pair' };
    }

    // High card
    return { rank: 'high_card', cards: sorted, description: 'High Card' };
  }

  static findBestHand(cards: Card[]): HandResult {
    if (cards.length < 5) {
      throw new Error('Need at least 5 cards');
    }

    let bestHand: HandResult | null = null;

    // Generate all combinations of 5 cards
    const combinations = this.getCombinations(cards, 5);

    for (const combo of combinations) {
      const hand = this.evaluate(combo);
      if (!bestHand || this.compareHands(hand.cards, bestHand.cards) > 0) {
        bestHand = hand;
      }
    }

    return bestHand!;
  }

  static compareHands(hand1: Card[], hand2: Card[]): number {
    const result1 = this.evaluate(hand1);
    const result2 = this.evaluate(hand2);

    const rankDiff = HAND_RANK_ORDER[result1.rank] - HAND_RANK_ORDER[result2.rank];
    if (rankDiff !== 0) return rankDiff;

    // Same rank — use rank-specific comparison
    switch (result1.rank) {
      case 'two_pair':
        return this.compareTwoPair(hand1, hand2);
      case 'full_house':
        return this.compareFullHouse(hand1, hand2);
      default:
        return this.compareHighCards(hand1, hand2);
    }
  }

  private static compareTwoPair(hand1: Card[], hand2: Card[]): number {
    const pairs1 = this.getPairRanks(hand1).sort((a, b) => b - a);
    const pairs2 = this.getPairRanks(hand2).sort((a, b) => b - a);

    // Compare higher pair
    if (pairs1[1] !== pairs2[1]) return pairs1[1] - pairs2[1];
    // Compare lower pair
    if (pairs1[0] !== pairs2[0]) return pairs1[0] - pairs2[0];
    // Compare kicker
    return this.getKickerValue(hand1) - this.getKickerValue(hand2);
  }

  private static compareFullHouse(hand1: Card[], hand2: Card[]): number {
    const trips1 = this.getThreeOfAKindRank(hand1);
    const trips2 = this.getThreeOfAKindRank(hand2);
    if (trips1 !== trips2) return trips1 - trips2;

    const pair1 = this.getPairRanks(hand1)[0] || 0;
    const pair2 = this.getPairRanks(hand2)[0] || 0;
    return pair1 - pair2;
  }

  private static compareHighCards(hand1: Card[], hand2: Card[]): number {
    const sorted1 = this.sortCards(hand1);
    const sorted2 = this.sortCards(hand2);

    for (let i = 0; i < Math.min(sorted1.length, sorted2.length); i++) {
      const diff = RANK_VALUES[sorted1[i].rank] - RANK_VALUES[sorted2[i].rank];
      if (diff !== 0) return diff;
    }
    return 0;
  }

  private static getPairRanks(cards: Card[]): number[] {
    const groups = this.groupByRank(cards);
    return groups
      .filter(g => g.length === 2)
      .map(g => RANK_VALUES[g[0].rank]);
  }

  private static getThreeOfAKindRank(cards: Card[]): number {
    const groups = this.groupByRank(cards);
    const trips = groups.find(g => g.length === 3);
    return trips ? RANK_VALUES[trips[0].rank] : 0;
  }

  private static getKickerValue(cards: Card[]): number {
    const groups = this.groupByRank(cards);
    const kicker = groups.find(g => g.length === 1);
    return kicker ? RANK_VALUES[kicker[0].rank] : 0;
  }

  private static sortCards(cards: Card[]): Card[] {
    return [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
  }

  private static isFlush(cards: Card[]): boolean {
    return cards.every(c => c.suit === cards[0].suit);
  }

  private static isStraight(cards: Card[]): boolean {
    const sorted = this.sortCards(cards);

    // Check for A-2-3-4-5 (wheel)
    if (sorted[0].rank === 'A' && sorted[1].rank === '5' && sorted[2].rank === '4' &&
        sorted[3].rank === '3' && sorted[4].rank === '2') {
      return true;
    }

    // Check for regular straight
    for (let i = 0; i < sorted.length - 1; i++) {
      if (RANK_VALUES[sorted[i].rank] - RANK_VALUES[sorted[i + 1].rank] !== 1) {
        return false;
      }
    }
    return true;
  }

  private static groupByRank(cards: Card[]): Card[][] {
    const groups: Map<Rank, Card[]> = new Map();
    for (const card of cards) {
      if (!groups.has(card.rank)) {
        groups.set(card.rank, []);
      }
      groups.get(card.rank)!.push(card);
    }
    return Array.from(groups.values());
  }

  private static getCombinations(cards: Card[], size: number): Card[][] {
    if (size === 0) return [[]];
    if (cards.length < size) return [];

    const result: Card[][] = [];
    const [first, ...rest] = cards;

    // Combinations including first
    for (const combo of this.getCombinations(rest, size - 1)) {
      result.push([first, ...combo]);
    }

    // Combinations excluding first
    for (const combo of this.getCombinations(rest, size)) {
      result.push(combo);
    }

    return result;
  }
}
