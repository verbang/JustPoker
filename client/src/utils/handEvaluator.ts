/**
 * 客户端牌型评估模块
 * 复用共享的牌型评估逻辑，确保前后端一致
 */

import { findBestHand as sharedFindBestHand, getHandName as sharedGetHandName } from '../../../shared/utils/hand-evaluator';
import { Card, HandResult, HandRank } from '../../../shared/types/game.types';

/**
 * 从手牌和公共牌中找出最佳的5张牌组合
 */
export function evaluateBestHand(holeCards: Card[], communityCards: Card[]): HandResult | null {
  return sharedFindBestHand(holeCards, communityCards);
}

/**
 * 获取牌型的中文名称
 */
export function getHandName(rank: HandRank): string {
  return sharedGetHandName(rank);
}

export type { Card, HandResult };
