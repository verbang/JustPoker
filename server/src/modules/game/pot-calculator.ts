import { GamePlayer, SidePot } from '../../../../shared/types/game.types';

export interface PotResult {
  mainPot: number;
  sidePots: SidePot[];
}

export class PotCalculator {
  static calculatePots(players: GamePlayer[]): PotResult {
    const allPlayers = players.filter(p => p.totalBet > 0);

    if (allPlayers.length === 0) {
      return { mainPot: 0, sidePots: [] };
    }

    // Sort players by total bet
    const sortedByBet = [...allPlayers].sort((a, b) => a.totalBet - b.totalBet);

    let mainPot = 0;
    const sidePots: SidePot[] = [];
    let processedBet = 0;

    for (let i = 0; i < sortedByBet.length; i++) {
      const player = sortedByBet[i];
      const betDiff = player.totalBet - processedBet;

      if (betDiff <= 0) continue;

      // Count eligible players at this level
      const eligiblePlayers = sortedByBet.slice(i);
      const potAmount = betDiff * eligiblePlayers.length;

      if (i === 0) {
        mainPot = potAmount;
      } else {
        sidePots.push({
          amount: potAmount,
          eligiblePlayerIds: eligiblePlayers.map(p => p.userId)
        });
      }

      processedBet = player.totalBet;
    }

    return { mainPot, sidePots };
  }

  static distributeWinnings(
    players: GamePlayer[],
    pots: { amount: number; eligiblePlayerIds: string[] }[],
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
