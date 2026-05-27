/**
 * Client-side poker hand evaluator for real-time hand display.
 * Mirrors the server-side HandEvaluator logic.
 */

interface Card {
  suit: string;
  rank: string;
}

interface HandResult {
  rank: string;
  description: string;
  cards: Card[];
}

const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

const HAND_RANK_ORDER: Record<string, number> = {
  'royal_flush': 10, 'straight_flush': 9, 'four_of_a_kind': 8,
  'full_house': 7, 'flush': 6, 'straight': 5, 'three_of_a_kind': 4,
  'two_pair': 3, 'one_pair': 2, 'high_card': 1
};

const HAND_NAMES: Record<string, string> = {
  'royal_flush': '皇家同花顺',
  'straight_flush': '同花顺',
  'four_of_a_kind': '四条',
  'full_house': '葫芦',
  'flush': '同花',
  'straight': '顺子',
  'three_of_a_kind': '三条',
  'two_pair': '两对',
  'one_pair': '一对',
  'high_card': '高牌'
};

function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
}

function isFlush(cards: Card[]): boolean {
  return cards.every(c => c.suit === cards[0].suit);
}

function isStraight(cards: Card[]): boolean {
  const sorted = sortCards(cards);
  if (sorted[0].rank === 'A' && sorted[1].rank === '5' && sorted[2].rank === '4' &&
      sorted[3].rank === '3' && sorted[4].rank === '2') {
    return true;
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    if (RANK_VALUES[sorted[i].rank] - RANK_VALUES[sorted[i + 1].rank] !== 1) {
      return false;
    }
  }
  return true;
}

function groupByRank(cards: Card[]): Card[][] {
  const groups: Map<string, Card[]> = new Map();
  for (const card of cards) {
    if (!groups.has(card.rank)) groups.set(card.rank, []);
    groups.get(card.rank)!.push(card);
  }
  return Array.from(groups.values());
}

function evaluate(cards: Card[]): HandResult {
  const sorted = sortCards(cards);
  const flush = isFlush(sorted);
  const straight = isStraight(sorted);
  const groups = groupByRank(sorted);

  if (flush && straight && sorted[0].rank === 'A' && sorted[4].rank === '10')
    return { rank: 'royal_flush', cards: sorted, description: '皇家同花顺' };
  if (flush && straight)
    return { rank: 'straight_flush', cards: sorted, description: '同花顺' };
  if (groups.some(g => g.length === 4))
    return { rank: 'four_of_a_kind', cards: sorted, description: '四条' };
  if (groups.some(g => g.length === 3) && groups.some(g => g.length === 2))
    return { rank: 'full_house', cards: sorted, description: '葫芦' };
  if (flush)
    return { rank: 'flush', cards: sorted, description: '同花' };
  if (straight)
    return { rank: 'straight', cards: sorted, description: '顺子' };
  if (groups.some(g => g.length === 3))
    return { rank: 'three_of_a_kind', cards: sorted, description: '三条' };
  if (groups.filter(g => g.length === 2).length >= 2)
    return { rank: 'two_pair', cards: sorted, description: '两对' };
  if (groups.some(g => g.length === 2))
    return { rank: 'one_pair', cards: sorted, description: '一对' };
  return { rank: 'high_card', cards: sorted, description: '高牌' };
}

function getCombinations(cards: Card[], size: number): Card[][] {
  if (size === 0) return [[]];
  if (cards.length < size) return [];
  const result: Card[][] = [];
  const [first, ...rest] = cards;
  for (const combo of getCombinations(rest, size - 1)) result.push([first, ...combo]);
  for (const combo of getCombinations(rest, size)) result.push(combo);
  return result;
}

function compareHands(hand1: Card[], hand2: Card[]): number {
  const r1 = HAND_RANK_ORDER[evaluate(hand1).rank];
  const r2 = HAND_RANK_ORDER[evaluate(hand2).rank];
  if (r1 !== r2) return r1 - r2;
  const s1 = sortCards(hand1);
  const s2 = sortCards(hand2);
  for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
    const diff = RANK_VALUES[s1[i].rank] - RANK_VALUES[s2[i].rank];
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Evaluate the best hand from hole cards + community cards.
 * Returns null if not enough cards (need at least 5 total).
 */
export function evaluateBestHand(holeCards: Card[], communityCards: Card[]): HandResult | null {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 5) return null;

  const combinations = getCombinations(allCards, 5);
  let bestHand: HandResult | null = null;

  for (const combo of combinations) {
    const hand = evaluate(combo);
    if (!bestHand || compareHands(hand.cards, bestHand.cards) > 0) {
      bestHand = hand;
    }
  }

  return bestHand;
}

export function getHandName(rank: string): string {
  return HAND_NAMES[rank] || rank;
}

export type { Card, HandResult };
