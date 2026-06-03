import { GamePlayer, SidePot } from '../../../../shared/types/game.types';

export interface PotResult {
  mainPot: number;
  mainPotEligiblePlayerIds: string[];
  sidePots: SidePot[];
}

export interface Pot {
  amount: number;
  eligiblePlayerIds: string[];
}

export class PotCalculator {
  static calculatePots(players: GamePlayer[]): PotResult {
    const allPlayers = players.filter(p => p.totalBet > 0);

    if (allPlayers.length === 0) {
      return { mainPot: 0, mainPotEligiblePlayerIds: [], sidePots: [] };
    }

    // Sort players by total bet
    const sortedByBet = [...allPlayers].sort((a, b) => a.totalBet - b.totalBet);

    const layerPots: Pot[] = [];
    let processedBet = 0;

    for (let i = 0; i < sortedByBet.length; i++) {
      const player = sortedByBet[i];
      const betDiff = player.totalBet - processedBet;

      if (betDiff <= 0) continue;

      // Count eligible players at this level
      const eligiblePlayers = sortedByBet.slice(i);
      const potAmount = betDiff * eligiblePlayers.length;
      const eligiblePlayerIds = eligiblePlayers
        .filter(p => p.status !== 'folded' && p.status !== 'out')
        .map(p => p.userId);

      if (eligiblePlayerIds.length === 0 && layerPots.length > 0) {
        layerPots[layerPots.length - 1].amount += potAmount;
      } else {
        layerPots.push({
          amount: potAmount,
          eligiblePlayerIds,
        });
      }

      processedBet = player.totalBet;
    }

    const mainPot = layerPots[0];

    return {
      mainPot: mainPot?.amount ?? 0,
      mainPotEligiblePlayerIds: mainPot?.eligiblePlayerIds ?? [],
      sidePots: layerPots.slice(1),
    };
  }

  static distributeWinnings(
    pots: Pot[],
    winnerIds: string[]
  ): Map<string, number> {
    // 按有资格的赢家集合分组底池，合并后再统一分配余码，
    // 避免同一组平局玩家在多个底池中重复获得余码。
    const groups = new Map<string, { totalAmount: number; eligibleWinners: string[] }>();

    for (const pot of pots) {
      const eligibleWinners = winnerIds.filter(id => pot.eligiblePlayerIds.includes(id));
      if (eligibleWinners.length === 0) continue;

      const key = [...eligibleWinners].sort().join(',');
      const existing = groups.get(key);
      if (existing) {
        existing.totalAmount += pot.amount;
      } else {
        groups.set(key, { totalAmount: pot.amount, eligibleWinners });
      }
    }

    const winnings = new Map<string, number>();

    for (const { totalAmount, eligibleWinners } of groups.values()) {
      const baseAmount = Math.floor(totalAmount / eligibleWinners.length);
      const remainder = totalAmount % eligibleWinners.length;

      eligibleWinners.forEach((winnerId, index) => {
        const amount = baseAmount + (index < remainder ? 1 : 0);
        winnings.set(winnerId, (winnings.get(winnerId) || 0) + amount);
      });
    }

    return winnings;
  }
}
