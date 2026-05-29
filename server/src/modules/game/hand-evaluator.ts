import { Card, HandRank, HandResult } from '../../../../shared/types/game.types';
import {
  compareHands as sharedCompareHands,
  evaluateHand as sharedEvaluateHand,
  findBestHand as sharedFindBestHand
} from '../../../../shared/utils/hand-evaluator';

/**
 * 服务端牌型评估器
 * 复用共享的牌型评估逻辑，确保前后端一致
 */
export class HandEvaluator {
  /**
   * 评估5张牌的牌型
   */
  static evaluate(cards: Card[]): HandResult {
    return sharedEvaluateHand(cards);
  }

  /**
   * 从多张牌中找出最佳的5张牌组合
   */
  static findBestHand(cards: Card[]): HandResult {
    const result = sharedFindBestHand([], cards);
    if (!result) {
      throw new Error('Need at least 5 cards');
    }
    return result;
  }

  /**
   * 比较两手牌的大小
   * 返回值：>0 表示 hand1 更大，<0 表示 hand2 更大，0 表示相等
   */
  static compareHands(hand1: Card[], hand2: Card[]): number {
    return sharedCompareHands(hand1, hand2);
  }
}
