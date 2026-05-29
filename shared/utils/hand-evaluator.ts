/**
 * 共享的牌型评估模块
 * 前后端共用此逻辑，确保牌型判断一致
 */

import { Card, HandRank, HandResult } from '../types/game.types';
import { HAND_RANK_ORDER } from '../constants/game.constants';

const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
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
  // 检查 A-2-3-4-5 (轮子)
  if (sorted[0].rank === 'A' && sorted[1].rank === '5' && sorted[2].rank === '4' &&
      sorted[3].rank === '3' && sorted[4].rank === '2') {
    return true;
  }
  // 检查普通顺子
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

function getRankCounts(cards: Card[]): Array<{ rank: string; value: number; count: number }> {
  return groupByRank(cards)
    .map(group => ({
      rank: group[0].rank,
      value: RANK_VALUES[group[0].rank],
      count: group.length,
    }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
}

function getStraightHighValue(cards: Card[]): number {
  const sorted = sortCards(cards);
  const isWheel = sorted[0].rank === 'A' && sorted[1].rank === '5' && sorted[2].rank === '4' &&
    sorted[3].rank === '3' && sorted[4].rank === '2';
  return isWheel ? 5 : RANK_VALUES[sorted[0].rank];
}

function getTieBreakers(result: HandResult): number[] {
  const counts = getRankCounts(result.cards);
  const sortedValues = sortCards(result.cards).map(card => RANK_VALUES[card.rank]);

  switch (result.rank) {
    case 'royal_flush':
      return [14];
    case 'straight_flush':
    case 'straight':
      return [getStraightHighValue(result.cards)];
    case 'four_of_a_kind': {
      const four = counts.find(item => item.count === 4);
      const kicker = counts.find(item => item.count === 1);
      return [four?.value ?? 0, kicker?.value ?? 0];
    }
    case 'full_house': {
      const three = counts.find(item => item.count === 3);
      const pair = counts.find(item => item.count === 2);
      return [three?.value ?? 0, pair?.value ?? 0];
    }
    case 'flush':
    case 'high_card':
      return sortedValues;
    case 'three_of_a_kind': {
      const three = counts.find(item => item.count === 3);
      const kickers = counts.filter(item => item.count === 1).map(item => item.value);
      return [three?.value ?? 0, ...kickers];
    }
    case 'two_pair': {
      const pairs = counts.filter(item => item.count === 2).map(item => item.value);
      const kicker = counts.find(item => item.count === 1);
      return [...pairs, kicker?.value ?? 0];
    }
    case 'one_pair': {
      const pair = counts.find(item => item.count === 2);
      const kickers = counts.filter(item => item.count === 1).map(item => item.value);
      return [pair?.value ?? 0, ...kickers];
    }
  }
}

function evaluate(cards: Card[]): HandResult {
  if (cards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate');
  }

  const sorted = sortCards(cards);
  const flush = isFlush(sorted);
  const straight = isStraight(sorted);
  const groups = groupByRank(sorted);

  // 皇家同花顺
  if (flush && straight && sorted[0].rank === 'A' && sorted[4].rank === '10') {
    return { rank: 'royal_flush', cards: sorted, description: '皇家同花顺' };
  }
  // 同花顺
  if (flush && straight) {
    return { rank: 'straight_flush', cards: sorted, description: '同花顺' };
  }
  // 四条
  if (groups.some(g => g.length === 4)) {
    return { rank: 'four_of_a_kind', cards: sorted, description: '四条' };
  }
  // 葫芦
  if (groups.some(g => g.length === 3) && groups.some(g => g.length === 2)) {
    return { rank: 'full_house', cards: sorted, description: '葫芦' };
  }
  // 同花
  if (flush) {
    return { rank: 'flush', cards: sorted, description: '同花' };
  }
  // 顺子
  if (straight) {
    return { rank: 'straight', cards: sorted, description: '顺子' };
  }
  // 三条
  if (groups.some(g => g.length === 3)) {
    return { rank: 'three_of_a_kind', cards: sorted, description: '三条' };
  }
  // 两对
  if (groups.filter(g => g.length === 2).length >= 2) {
    return { rank: 'two_pair', cards: sorted, description: '两对' };
  }
  // 一对
  if (groups.some(g => g.length === 2)) {
    return { rank: 'one_pair', cards: sorted, description: '一对' };
  }
  // 高牌
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

export function compareHands(hand1: Card[], hand2: Card[]): number {
  const result1 = evaluate(hand1);
  const result2 = evaluate(hand2);

  const rankDiff = HAND_RANK_ORDER[result1.rank] - HAND_RANK_ORDER[result2.rank];
  if (rankDiff !== 0) return rankDiff;

  const tiebreakers1 = getTieBreakers(result1);
  const tiebreakers2 = getTieBreakers(result2);
  for (let i = 0; i < Math.min(tiebreakers1.length, tiebreakers2.length); i++) {
    const diff = tiebreakers1[i] - tiebreakers2[i];
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * 从手牌和公共牌中找出最佳的5张牌组合
 */
export function findBestHand(holeCards: Card[], communityCards: Card[]): HandResult | null {
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

/**
 * 获取牌型的中文名称
 */
export function getHandName(rank: HandRank): string {
  return HAND_NAMES[rank] || rank;
}

/**
 * 评估5张牌的牌型（用于服务端）
 */
export function evaluateHand(cards: Card[]): HandResult {
  return evaluate(cards);
}
