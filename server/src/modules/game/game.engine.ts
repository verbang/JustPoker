import { v4 as uuidv4 } from 'uuid';
import { GameState, GamePlayer, PlayerAction, Card } from '@shared/types/game.types';
import { Deck } from './deck';
import { HandEvaluator } from './hand-evaluator';
import { PotCalculator } from './pot-calculator';

export class GameEngine {
  private deck: Deck = new Deck();

  /**
   * Track which players have acted in the current betting round.
   * This is not part of GameState - it's internal engine state that
   * needs to be threaded through playerAction calls.
   */
  private actedPlayers: Set<string> = new Set();

  startGame(roomId: string, players: GamePlayer[], smallBlind: number, bigBlind: number): GameState {
    this.deck.reset();
    this.deck.shuffle();

    const isHeadsUp = players.length === 2;

    // Set dealer and blinds
    const dealerIndex = 0;
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

    // Post blinds - set bet/totalBet without deducting from chips
    gamePlayers[smallBlindIndex].bet = smallBlind;
    gamePlayers[smallBlindIndex].totalBet = smallBlind;

    gamePlayers[bigBlindIndex].bet = bigBlind;
    gamePlayers[bigBlindIndex].totalBet = bigBlind;

    // Deal 2 hole cards to each player
    for (const player of gamePlayers) {
      player.cards = this.deck.dealMultiple(2);
    }

    // Determine first actor for preflop
    const firstActorIndex = isHeadsUp
      ? dealerIndex
      : (bigBlindIndex + 1) % players.length;

    // Reset acted tracking - blinds have not "acted" yet
    this.actedPlayers = new Set();

    return {
      id: uuidv4(),
      roomId,
      phase: 'preflop',
      pot: smallBlind + bigBlind,
      communityCards: [],
      currentPlayerIndex: firstActorIndex,
      dealerIndex,
      smallBlindIndex,
      bigBlindIndex,
      currentBet: bigBlind,
      minRaise: bigBlind,
      players: gamePlayers,
      sidePots: [],
      status: 'playing',
    };
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
        player.chips -= callAmount;
        player.bet = state.currentBet;
        player.totalBet += callAmount;
        newState.pot += callAmount;
        break;
      }

      case 'raise': {
        if (!amount || amount <= state.currentBet) {
          throw new Error('Raise amount must be greater than current bet');
        }
        const raiseAmount = amount - player.bet;
        player.chips -= raiseAmount;
        player.bet = amount;
        player.totalBet += raiseAmount;
        newState.currentBet = amount;
        newState.minRaise = amount - state.currentBet;
        newState.pot += raiseAmount;
        // Reset acted tracking - everyone needs to act again after a raise
        this.actedPlayers = new Set();
        break;
      }

      case 'all_in': {
        const allInAmount = player.chips;
        player.bet = allInAmount;
        player.totalBet += allInAmount;
        player.chips = 0;
        player.status = 'all_in';
        newState.pot += allInAmount;
        if (player.bet > state.currentBet) {
          newState.currentBet = player.bet;
          // Reset acted tracking - everyone needs to act again after an all-in raise
          this.actedPlayers = new Set();
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

  private checkRoundComplete(state: GameState): GameState {
    const activePlayers = state.players.filter(p => p.status !== 'folded');

    // Only one player left - they win the pot
    if (activePlayers.length === 1) {
      return this.finishGame(state, activePlayers[0].userId);
    }

    // Check if all active non-all-in players have matched the current bet
    const nonAllInPlayers = activePlayers.filter(p => p.status !== 'all_in');
    const allBetsEqual = nonAllInPlayers.length === 0 ||
      nonAllInPlayers.every(p => p.bet === state.currentBet);

    if (!allBetsEqual) {
      return this.moveToNextPlayer(state);
    }

    // All bets are equal - check if every active player has had a chance to act
    const allActed = activePlayers.every(p => this.actedPlayers.has(p.userId));

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

    // Reset acted tracking for the new betting round
    this.actedPlayers = new Set();

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

    // Post-flop: determine who acts first
    // In heads-up, dealer/SB acts first on all streets
    // In multi-player, first active player after dealer acts first
    const isHeadsUp = state.players.length === 2;
    newState.currentPlayerIndex = isHeadsUp
      ? state.dealerIndex
      : (state.dealerIndex + 1) % state.players.length;

    let safety = 0;
    while (
      (newState.players[newState.currentPlayerIndex].status === 'folded' ||
       newState.players[newState.currentPlayerIndex].status === 'all_in') &&
      safety < state.players.length
    ) {
      newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % newState.players.length;
      safety++;
    }

    return newState;
  }

  private showdown(state: GameState): GameState {
    const activePlayers = state.players.filter(p => p.status !== 'folded');

    // Evaluate each player's best 5-card hand from their 2 hole cards + 5 community cards
    const hands = activePlayers.map(player => ({
      userId: player.userId,
      hand: HandEvaluator.findBestHand([...player.cards, ...state.communityCards]),
    }));

    // Find winner(s) by comparing hands
    let bestHands = [hands[0]];

    for (let i = 1; i < hands.length; i++) {
      const comparison = HandEvaluator.compareHands(hands[i].hand.cards, bestHands[0].hand.cards);
      if (comparison > 0) {
        bestHands = [hands[i]];
      } else if (comparison === 0) {
        bestHands.push(hands[i]);
      }
    }

    const winners = bestHands.map(h => h.userId);

    // Calculate pots and distribute winnings
    const pots = PotCalculator.calculatePots(state.players);
    const allPots = [
      { amount: pots.mainPot, eligiblePlayerIds: activePlayers.map(p => p.userId) },
      ...pots.sidePots,
    ];

    const winnings = PotCalculator.distributeWinnings(state.players, allPots, winners);

    const updatedPlayers = state.players.map(p => ({
      ...p,
      chips: p.chips + (winnings.get(p.userId) || 0),
    }));

    return {
      ...state,
      players: updatedPlayers,
      status: 'finished',
      winnerId: winners[0],
      winningHand: bestHands[0].hand.description,
    };
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
    };
  }
}
