import { v4 as uuidv4 } from 'uuid';
import { GameState, GamePlayer, PlayerAction, Card } from '../../../../shared/types/game.types';
import { Deck } from './deck';
import { HandEvaluator } from './hand-evaluator';
import { Pot, PotCalculator } from './pot-calculator';

export class GameEngine {
  private deck: Deck = new Deck();
  private bigBlind = 0;
  private raiseLockedPlayers: Set<string> = new Set();

  /**
   * Track which players have acted in the current betting round.
   * This is not part of GameState - it's internal engine state that
   * needs to be threaded through playerAction calls.
   */
  private actedPlayers: Set<string> = new Set();

  startGame(roomId: string, players: GamePlayer[], smallBlind: number, bigBlind: number, previousDealerSeatNumber?: number): GameState {
    this.deck.reset();
    this.deck.shuffle();
    this.bigBlind = bigBlind;

    const isHeadsUp = players.length === 2;

    // Set dealer and blinds
    const dealerIndex = this.getNextDealerIndex(players, previousDealerSeatNumber);
    let smallBlindIndex: number;
    let bigBlindIndex: number;

    if (isHeadsUp) {
      // Heads-up rules: dealer is the small blind
      smallBlindIndex = dealerIndex;
      bigBlindIndex = (dealerIndex + 1) % players.length;
    } else {
      smallBlindIndex = (dealerIndex + 1) % players.length;
      bigBlindIndex = (dealerIndex + 2) % players.length;
    }

    const gamePlayers: GamePlayer[] = players.map((p, i) => ({
      ...p,
      bet: 0,
      totalBet: 0,
      cards: [] as Card[],
      status: 'playing' as const,
      isDealer: i === dealerIndex,
      isSmallBlind: i === smallBlindIndex,
      isBigBlind: i === bigBlindIndex,
    }));

    const actualSmallBlind = this.postBlind(gamePlayers[smallBlindIndex], smallBlind);
    const actualBigBlind = this.postBlind(gamePlayers[bigBlindIndex], bigBlind);

    this.dealHoleCards(gamePlayers, smallBlindIndex);

    // Determine first actor for preflop
    const firstActorIndex = isHeadsUp
      ? dealerIndex
      : (bigBlindIndex + 1) % players.length;

    // Reset acted tracking - blinds have not "acted" yet
    this.actedPlayers = new Set();
    this.raiseLockedPlayers = new Set();

    return {
      id: uuidv4(),
      roomId,
      phase: 'preflop',
      pot: actualSmallBlind + actualBigBlind,
      communityCards: [],
      currentPlayerIndex: firstActorIndex,
      dealerIndex,
      smallBlindIndex,
      bigBlindIndex,
      currentBet: Math.max(actualSmallBlind, actualBigBlind),
      minRaise: bigBlind,
      players: gamePlayers,
      sidePots: [],
      status: 'playing',
    };
  }

  private getNextDealerIndex(players: GamePlayer[], previousDealerSeatNumber?: number): number {
    if (previousDealerSeatNumber === undefined) return 0;

    const nextIndex = players.findIndex(p => p.seatNumber > previousDealerSeatNumber);
    return nextIndex === -1 ? 0 : nextIndex;
  }

  private postBlind(player: GamePlayer, blindAmount: number): number {
    const actualBlind = Math.min(player.chips, blindAmount);
    player.bet = actualBlind;
    player.totalBet = actualBlind;
    player.chips -= actualBlind;
    if (player.chips === 0) {
      player.status = 'all_in';
    }
    return actualBlind;
  }

  private dealHoleCards(players: GamePlayer[], firstPlayerIndex: number): void {
    for (let round = 0; round < 2; round++) {
      for (let offset = 0; offset < players.length; offset++) {
        const playerIndex = (firstPlayerIndex + offset) % players.length;
        const card = this.deck.deal();
        if (!card) {
          throw new Error('Not enough cards in deck');
        }
        players[playerIndex].cards.push(card);
      }
    }
  }

  playerAction(state: GameState, userId: string, action: PlayerAction, amount?: number): GameState {
    const playerIndex = state.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) throw new Error('Player not found');
    if (playerIndex !== state.currentPlayerIndex) throw new Error('Not your turn');

    const newState: GameState = {
      ...state,
      players: state.players.map(p => ({ ...p })),
    };
    const player = newState.players[playerIndex];

    switch (action) {
      case 'fold':
        player.status = 'folded';
        break;

      case 'check':
        if (player.bet < state.currentBet) {
          throw new Error('Cannot check, must call or raise');
        }
        break;

      case 'call': {
        const callAmount = state.currentBet - player.bet;
        if (callAmount <= 0) {
          throw new Error('Cannot call, check instead');
        }
        const actualCallAmount = Math.min(callAmount, player.chips);
        player.chips -= actualCallAmount;
        player.bet += actualCallAmount;
        player.totalBet += actualCallAmount;
        newState.pot += actualCallAmount;
        if (player.chips === 0) {
          player.status = 'all_in';
        }
        break;
      }

      case 'bet': {
        if (state.currentBet > 0) {
          throw new Error('Cannot bet, must call or raise');
        }
        if (!amount || amount < state.minRaise) {
          throw new Error('Bet amount must be at least minimum bet');
        }
        if (this.raiseLockedPlayers.has(userId)) {
          throw new Error('Cannot bet after incomplete all-in');
        }
        const betAmount = amount - player.bet;
        if (betAmount > player.chips) {
          throw new Error('Not enough chips to bet');
        }
        player.chips -= betAmount;
        player.bet = amount;
        player.totalBet += betAmount;
        if (player.chips === 0) {
          player.status = 'all_in';
        }
        newState.currentBet = amount;
        newState.minRaise = amount;
        newState.pot += betAmount;
        this.actedPlayers = new Set();
        this.raiseLockedPlayers = new Set();
        break;
      }

      case 'raise': {
        if (!amount || amount < state.currentBet + state.minRaise) {
          throw new Error('Raise amount must be at least current bet plus minimum raise');
        }
        if (this.raiseLockedPlayers.has(userId)) {
          throw new Error('Cannot raise after incomplete all-in');
        }
        const raiseAmount = amount - player.bet;
        if (raiseAmount > player.chips) {
          throw new Error('Not enough chips to raise');
        }
        player.chips -= raiseAmount;
        player.bet = amount;
        player.totalBet += raiseAmount;
        if (player.chips === 0) {
          player.status = 'all_in';
        }
        newState.currentBet = amount;
        newState.minRaise = amount - state.currentBet;
        newState.pot += raiseAmount;
        // Reset acted tracking - everyone needs to act again after a raise
        this.actedPlayers = new Set();
        this.raiseLockedPlayers = new Set();
        break;
      }

      case 'all_in': {
        const allInAmount = player.chips;
        const finalBet = player.bet + allInAmount;
        if (this.raiseLockedPlayers.has(userId) && finalBet > state.currentBet) {
          throw new Error('Cannot raise after incomplete all-in');
        }
        player.bet += allInAmount;
        player.totalBet += allInAmount;
        player.chips = 0;
        player.status = 'all_in';
        newState.pot += allInAmount;

        const allInRaise = player.bet - state.currentBet;
        // 只有完整加注才会重新开放行动权
        if (player.bet > state.currentBet) {
          newState.currentBet = player.bet;
        }
        if (allInRaise >= state.minRaise) {
          newState.minRaise = allInRaise;
          // 重置 acted tracking - 加注后其他玩家需要重新行动
          this.actedPlayers = new Set();
          this.raiseLockedPlayers = new Set();
        } else if (allInRaise > 0) {
          this.lockPreviouslyActedPlayersForRaise(newState, userId);
        }
        break;
      }
    }

    newState.players[playerIndex] = player;

    // Mark this player as having acted
    this.actedPlayers.add(userId);

    // Check if round is complete
    return this.checkRoundComplete(newState);
  }

  private lockPreviouslyActedPlayersForRaise(state: GameState, allInUserId: string): void {
    state.players
      .filter(p => p.userId !== allInUserId && p.status === 'playing' && this.actedPlayers.has(p.userId))
      .forEach(p => this.raiseLockedPlayers.add(p.userId));
  }

  forceFold(state: GameState, userId: string): GameState {
    const playerIndex = state.players.findIndex(p => p.userId === userId);
    if (playerIndex === -1) throw new Error('Player not found');

    const newState: GameState = {
      ...state,
      players: state.players.map(p => ({ ...p })),
    };
    const player = newState.players[playerIndex];

    if (player.status === 'folded' || player.status === 'out') {
      return newState;
    }

    player.status = 'folded';
    this.actedPlayers.add(userId);

    if (newState.currentPlayerIndex === playerIndex) {
      return this.checkRoundComplete(newState);
    }

    const activePlayers = newState.players.filter(p => p.status !== 'folded');
    if (activePlayers.length === 1) {
      return this.finishGame(newState, activePlayers[0].userId);
    }

    return newState;
  }

  private checkRoundComplete(state: GameState): GameState {
    const activePlayers = state.players.filter(p => p.status !== 'folded');

    // Only one player left - they win the pot
    if (activePlayers.length === 1) {
      return this.finishGame(state, activePlayers[0].userId);
    }

    // Check if all active non-all-in players have matched the current bet
    const nonAllInPlayers = activePlayers.filter(p => p.status !== 'all_in');
    if (nonAllInPlayers.length === 0) {
      return this.dealRemainingCardsAndShowdown(state);
    }

    const allBetsEqual = nonAllInPlayers.length === 0 ||
      nonAllInPlayers.every(p => p.bet === state.currentBet);

    if (!allBetsEqual) {
      return this.moveToNextPlayer(state);
    }

    // All bets are equal - check if every active player has had a chance to act
    const allActed = activePlayers.every(p => p.status === 'all_in' || this.actedPlayers.has(p.userId));

    if (allActed) {
      return this.progressPhase(state);
    }

    // Not everyone has acted yet
    return this.moveToNextPlayer(state);
  }

  private moveToNextPlayer(state: GameState): GameState {
    const newState = { ...state };
    let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;

    let safety = 0;
    while (
      (state.players[nextIndex].status === 'folded' || state.players[nextIndex].status === 'all_in') &&
      safety < state.players.length
    ) {
      nextIndex = (nextIndex + 1) % state.players.length;
      safety++;
    }

    newState.currentPlayerIndex = nextIndex;
    return newState;
  }

  private progressPhase(state: GameState): GameState {
    const newState: GameState = {
      ...state,
      players: state.players.map(p => ({ ...p, bet: 0 })),
    };
    newState.currentBet = 0;
    newState.minRaise = this.bigBlind;

    // Reset acted tracking for the new betting round
    this.actedPlayers = new Set();
    this.raiseLockedPlayers = new Set();

    switch (state.phase) {
      case 'preflop':
        newState.phase = 'flop';
        newState.communityCards = this.deck.dealMultiple(3);
        break;

      case 'flop':
        newState.phase = 'turn';
        newState.communityCards = [...state.communityCards, ...this.deck.dealMultiple(1)];
        break;

      case 'turn':
        newState.phase = 'river';
        newState.communityCards = [...state.communityCards, ...this.deck.dealMultiple(1)];
        break;

      case 'river':
        return this.showdown(newState);

      default:
        return newState;
    }

    // 翻牌后从 Button 左侧第一个仍可行动玩家开始。Heads-up 时这会自然落在 BB。
    newState.currentPlayerIndex = this.findNextActionableIndex(newState, state.dealerIndex);

    return newState;
  }

  private findNextActionableIndex(state: GameState, fromIndex: number): number {
    let nextIndex = (fromIndex + 1) % state.players.length;
    let safety = 0;
    while (
      (state.players[nextIndex].status === 'folded' || state.players[nextIndex].status === 'all_in') &&
      safety < state.players.length
    ) {
      nextIndex = (nextIndex + 1) % state.players.length;
      safety++;
    }
    return nextIndex;
  }

  private dealRemainingCardsAndShowdown(state: GameState): GameState {
    const newState: GameState = {
      ...state,
      players: state.players.map(p => ({ ...p, bet: 0 })),
      currentBet: 0,
      phase: 'river',
    };

    const missingCommunityCards = 5 - newState.communityCards.length;
    if (missingCommunityCards > 0) {
      newState.communityCards = [
        ...newState.communityCards,
        ...this.deck.dealMultiple(missingCommunityCards),
      ];
    }

    return this.showdown(newState);
  }

  private showdown(state: GameState): GameState {
    const activePlayers = state.players.filter(p => p.status !== 'folded');

    // Evaluate each player's best 5-card hand from their 2 hole cards + 5 community cards
    const hands = activePlayers.map(player => ({
      userId: player.userId,
      hand: HandEvaluator.findBestHand([...player.cards, ...state.communityCards]),
    }));

    const winners = this.orderPlayerIdsByOddChipPriority(
      this.findBestPlayerIds(hands),
      state.players,
      state.dealerIndex
    );

    const bestHand = hands.find(h => h.userId === winners[0])?.hand ?? hands[0].hand;

    // Calculate pots and distribute winnings
    const pots = PotCalculator.calculatePots(state.players);
    const allPots: Pot[] = [
      { amount: pots.mainPot, eligiblePlayerIds: activePlayers.map(p => p.userId) },
      ...pots.sidePots,
    ];

    const winnings = this.distributeShowdownPots(allPots, hands, state.players, state.dealerIndex);

    const updatedPlayers = state.players.map(p => ({
      ...p,
      chips: p.chips + (winnings.get(p.userId) || 0),
    }));

    return {
      ...state,
      players: updatedPlayers,
      status: 'finished',
      winnerId: winners[0],
      winnerIds: winners,
      winningHand: bestHand.description,
    };
  }

  private distributeShowdownPots(
    pots: Pot[],
    hands: { userId: string; hand: ReturnType<typeof HandEvaluator.findBestHand> }[],
    players: GamePlayer[],
    dealerIndex: number
  ): Map<string, number> {
    const winnings = new Map<string, number>();

    for (const pot of pots) {
      const eligibleHands = hands.filter(h => pot.eligiblePlayerIds.includes(h.userId));
      if (eligibleHands.length === 0) continue;

      const potWinnerIds = this.orderPlayerIdsByOddChipPriority(
        this.findBestPlayerIds(eligibleHands),
        players,
        dealerIndex
      );
      const potWinnings = PotCalculator.distributeWinnings([pot], potWinnerIds);
      for (const [userId, amount] of potWinnings.entries()) {
        winnings.set(userId, (winnings.get(userId) || 0) + amount);
      }
    }

    return winnings;
  }

  private orderPlayerIdsByOddChipPriority(
    playerIds: string[],
    players: GamePlayer[],
    dealerIndex: number
  ): string[] {
    const playerOrder = players.map((_, offset) => players[(dealerIndex + 1 + offset) % players.length].userId);
    return [...playerIds].sort((a, b) => playerOrder.indexOf(a) - playerOrder.indexOf(b));
  }

  private findBestPlayerIds(hands: { userId: string; hand: ReturnType<typeof HandEvaluator.findBestHand> }[]): string[] {
    let bestHands = [hands[0]];

    for (let i = 1; i < hands.length; i++) {
      const comparison = HandEvaluator.compareHands(hands[i].hand.cards, bestHands[0].hand.cards);
      if (comparison > 0) {
        bestHands = [hands[i]];
      } else if (comparison === 0) {
        bestHands.push(hands[i]);
      }
    }

    return bestHands.map(h => h.userId);
  }

  private finishGame(state: GameState, winnerId: string): GameState {
    const totalPot = state.pot;

    const updatedPlayers = state.players.map(p => ({
      ...p,
      chips: p.userId === winnerId ? p.chips + totalPot : p.chips,
    }));

    return {
      ...state,
      players: updatedPlayers,
      status: 'finished',
      winnerId,
      winnerIds: [winnerId],
    };
  }
}
