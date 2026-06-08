import {
  CatchMidHandResult,
  CatchMidRoundParticipant,
  CatchMidSettlementResult
} from '../../../../shared/types/catch-mid.types';
import { CatchMidHandEvaluator } from './catch-mid.hand-evaluator';

interface RankedGroup {
  representativeHand: CatchMidHandResult;
  participantIds: string[];
}

export class CatchMidSettlement {
  static settleRound(participants: CatchMidRoundParticipant[], baseBet: number): CatchMidSettlementResult {
    if (participants.length < 3 || participants.length > 4) {
      throw new Error('Catch Mid settlement requires 3 to 4 participants');
    }
    if (baseBet <= 0) {
      throw new Error('Base bet must be greater than 0');
    }

    const rankedGroups = this.buildRankedGroups(participants);
    if (rankedGroups.length === 1) {
      return {
        winnerIds: [],
        loserIds: [],
        headWinnerIds: [],
        tailWinnerIds: [],
        payments: []
      };
    }

    const { headWinnerIds, tailWinnerIds, loserIds } = this.resolveWinnersAndLosers(rankedGroups);
    const winnerIds = [...new Set([...headWinnerIds, ...tailWinnerIds])];
    const payments = loserIds.flatMap(loserId =>
      winnerIds.map(winnerId => {
        const multiplier: 1 | 2 = this.shouldDouble(participants, loserId, winnerId) ? 2 : 1;
        return {
          fromUserId: loserId,
          toUserId: winnerId,
          amount: baseBet * multiplier,
          multiplier
        };
      })
    );

    return {
      winnerIds,
      loserIds,
      headWinnerIds,
      tailWinnerIds,
      payments
    };
  }

  private static buildRankedGroups(participants: CatchMidRoundParticipant[]): RankedGroup[] {
    const groups: RankedGroup[] = [];
    for (const participant of participants) {
      const group = groups.find(item => CatchMidHandEvaluator.compareResults(participant.hand, item.representativeHand) === 0);
      if (group) {
        group.participantIds.push(participant.userId);
      } else {
        groups.push({
          representativeHand: participant.hand,
          participantIds: [participant.userId]
        });
      }
    }

    return groups.sort((a, b) => CatchMidHandEvaluator.compareResults(b.representativeHand, a.representativeHand));
  }

  private static resolveWinnersAndLosers(rankedGroups: RankedGroup[]): {
    headWinnerIds: string[];
    tailWinnerIds: string[];
    loserIds: string[];
  } {
    if (rankedGroups.length === 2) {
      return {
        headWinnerIds: rankedGroups[0].participantIds,
        tailWinnerIds: [],
        loserIds: rankedGroups[1].participantIds
      };
    }

    const middleGroups = rankedGroups.slice(1, -1);
    return {
      headWinnerIds: rankedGroups[0].participantIds,
      tailWinnerIds: rankedGroups[rankedGroups.length - 1].participantIds,
      loserIds: middleGroups.flatMap(group => group.participantIds)
    };
  }

  private static shouldDouble(
    participants: CatchMidRoundParticipant[],
    loserId: string,
    winnerId: string
  ): boolean {
    const bombParticipantCount = participants.filter(participant => participant.hand.isBomb).length;
    if (bombParticipantCount < 2) {
      return false;
    }

    const loser = participants.find(participant => participant.userId === loserId);
    const winner = participants.find(participant => participant.userId === winnerId);
    return Boolean(loser?.hand.isBomb && winner?.hand.isBomb);
  }
}
