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
    const winnings = new Map<string, number>();

    for (const pot of pots) {
      // Find winners eligible for this pot
      const eligibleWinners = winnerIds.filter(id => pot.eligiblePlayerIds.includes(id));

      if (eligibleWinners.length === 0) continue;

      // Split pot among winners
      const baseAmount = Math.floor(pot.amount / eligibleWinners.length);
      const remainder = pot.amount % eligibleWinners.length;

      eligibleWinners.forEach((winnerId, index) => {
        const amount = baseAmount + (index < remainder ? 1 : 0);
        winnings.set(winnerId, (winnings.get(winnerId) || 0) + amount);
      });
    }

    return winnings;
  }
}
