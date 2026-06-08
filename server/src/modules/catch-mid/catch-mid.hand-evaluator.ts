import {
  CatchMidCard,
  CatchMidHandRank,
  CatchMidHandResult
} from '../../../../shared/types/catch-mid.types';
import { Rank } from '../../../../shared/types/game.types';

const RANK_VALUES: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14
};

const HAND_RANK_VALUES: Record<CatchMidHandRank, number> = {
  joker_bomb: 7,
  bomb: 6,
  straight_flush: 5,
  flush: 4,
  straight: 3,
  pair: 2,
  high_card: 1
};

const HAND_DESCRIPTIONS: Record<CatchMidHandRank, string> = {
  joker_bomb: '王炸',
  bomb: '炸弹',
  straight_flush: '同花顺',
  flush: '同花',
  straight: '顺子',
  pair: '对子',
  high_card: '高牌'
};

type NormalCard = Extract<CatchMidCard, { isWild: false }>;

export class CatchMidHandEvaluator {
  static evaluate(cards: CatchMidCard[]): CatchMidHandResult {
    if (cards.length !== 3) {
      throw new Error('Catch Mid hand must contain exactly 3 cards');
    }

    const wildCount = cards.filter(card => card.isWild).length;
    const normalCards = cards.filter((card): card is NormalCard => !card.isWild);

    if (wildCount === 2) {
      return this.buildResult('joker_bomb', cards, [14]);
    }

    const bombRank = this.findBombRank(normalCards, wildCount);
    if (bombRank !== null) {
      return this.buildResult('bomb', cards, [bombRank]);
    }

    const straightFlushHigh = this.findStraightFlushHigh(normalCards, wildCount);
    if (straightFlushHigh !== null) {
      return this.buildResult('straight_flush', cards, [straightFlushHigh]);
    }

    if (this.canMakeFlush(normalCards, wildCount)) {
      return this.buildResult('flush', cards, this.getFlushTiebreakers(normalCards, wildCount));
    }

    const straightHigh = this.findStraightHigh(normalCards, wildCount);
    if (straightHigh !== null) {
      return this.buildResult('straight', cards, [straightHigh]);
    }

    const pairTiebreakers = this.findPairTiebreakers(normalCards, wildCount);
    if (pairTiebreakers !== null) {
      return this.buildResult('pair', cards, pairTiebreakers);
    }

    return this.buildResult('high_card', cards, this.getHighCardTiebreakers(normalCards));
  }

  static compareHands(hand1: CatchMidCard[], hand2: CatchMidCard[]): number {
    return this.compareResults(this.evaluate(hand1), this.evaluate(hand2));
  }

  static compareResults(result1: CatchMidHandResult, result2: CatchMidHandResult): number {
    if (result1.rankValue !== result2.rankValue) {
      return result1.rankValue - result2.rankValue;
    }

    const maxLength = Math.max(result1.tiebreakers.length, result2.tiebreakers.length);
    for (let i = 0; i < maxLength; i++) {
      const diff = (result1.tiebreakers[i] || 0) - (result2.tiebreakers[i] || 0);
      if (diff !== 0) {
        return diff;
      }
    }
    return 0;
  }

  private static findBombRank(normalCards: NormalCard[], wildCount: number): number | null {
    const values = normalCards.map(card => RANK_VALUES[card.rank]);
    if (normalCards.length === 3 && new Set(values).size === 1) {
      return values[0];
    }
    if (wildCount === 1 && normalCards.length === 2 && values[0] === values[1]) {
      return values[0];
    }
    return null;
  }

  private static findStraightFlushHigh(normalCards: NormalCard[], wildCount: number): number | null {
    if (!this.canMakeFlush(normalCards, wildCount)) {
      return null;
    }
    return this.findStraightHigh(normalCards, wildCount);
  }

  private static canMakeFlush(normalCards: NormalCard[], wildCount: number): boolean {
    if (wildCount === 0) {
      return normalCards.every(card => card.suit === normalCards[0].suit);
    }
    return normalCards.length > 0 && normalCards.every(card => card.suit === normalCards[0].suit);
  }

  private static findStraightHigh(normalCards: NormalCard[], wildCount: number): number | null {
    const sequences = [
      [14, 13, 12],
      [13, 12, 11],
      [12, 11, 10],
      [11, 10, 9],
      [10, 9, 8],
      [9, 8, 7],
      [8, 7, 6],
      [7, 6, 5],
      [6, 5, 4],
      [5, 4, 3],
      [4, 3, 2],
      [14, 3, 2]
    ];
    const values = normalCards.map(card => RANK_VALUES[card.rank]);
    const uniqueValues = new Set(values);
    if (uniqueValues.size !== values.length) {
      return null;
    }

    for (const sequence of sequences) {
      const matchedCount = values.filter(value => sequence.includes(value)).length;
      if (matchedCount + wildCount === 3) {
        return sequence[0] === 14 && sequence[1] === 3 ? 3 : sequence[0];
      }
    }
    return null;
  }

  private static findPairTiebreakers(normalCards: NormalCard[], wildCount: number): number[] | null {
    const values = normalCards.map(card => RANK_VALUES[card.rank]).sort((a, b) => b - a);
    if (wildCount === 1 && values.length === 2) {
      return [values[0], values[1]];
    }

    const counts = new Map<number, number>();
    values.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));

    const pairRank = [...counts.entries()].find(([, count]) => count === 2)?.[0];
    if (pairRank === undefined) {
      return null;
    }

    const kicker = values.find(value => value !== pairRank) || 0;
    return [pairRank, kicker];
  }

  private static getHighCardTiebreakers(normalCards: NormalCard[]): number[] {
    return normalCards.map(card => RANK_VALUES[card.rank]).sort((a, b) => b - a);
  }

  private static getFlushTiebreakers(normalCards: NormalCard[], wildCount: number): number[] {
    const values = this.getHighCardTiebreakers(normalCards);
    if (wildCount === 0) {
      return values;
    }

    const usedValues = new Set(values);
    for (let value = 14; value >= 2; value--) {
      if (!usedValues.has(value)) {
        return [...values, value].sort((a, b) => b - a);
      }
    }
    return values;
  }

  private static buildResult(
    rank: CatchMidHandRank,
    cards: CatchMidCard[],
    tiebreakers: number[]
  ): CatchMidHandResult {
    return {
      rank,
      cards,
      description: HAND_DESCRIPTIONS[rank],
      rankValue: HAND_RANK_VALUES[rank],
      tiebreakers,
      isBomb: rank === 'joker_bomb' || rank === 'bomb'
    };
  }
}
