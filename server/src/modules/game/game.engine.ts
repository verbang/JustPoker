import { v4 as uuidv4 } from 'uuid';
import { GameState, GamePlayer, PlayerAction, Card } from '../../../../shared/types/game.types';
import { Deck } from './deck';
import { HandEvaluator } from './hand-evaluator';
import { Pot, PotCalculator } from './pot-calculator';

/**
 * 德州扑克游戏引擎
 *
 * 设计约束：每个 GameEngine 实例仅用于一局游戏。
 * - 引擎持有可变内部状态（actedPlayers、raiseLockedPlayers、deck、bigBlind），
 *   这些状态在一局游戏的生命周期内持续更新。
 * - startGame() 会重置所有内部状态，确保新一局从干净状态开始。
 * - 不要在多个游戏间复用同一个 GameEngine 实例。
 */
export class GameEngine {
  private deck: Deck = new Deck();
  private bigBlind = 0;
  private raiseLockedPlayers: Set<string> = new Set();

  /**
   * 记录当前下注轮中已行动过的玩家。
   * 不属于 GameState——这是引擎内部状态，在 playerAction 调用间保持。
   */
  private actedPlayers: Set<string> = new Set();

  /**
   * 重置引擎内部状态，为新一局做准备。
   * 每局游戏开始前调用，确保引擎从干净状态启动。
   */
  private resetEngineState(bigBlind: number): void {
    this.deck.reset();
    this.deck.shuffle();
    this.bigBlind = bigBlind;
    this.actedPlayers = new Set();
    this.raiseLockedPlayers = new Set();
  }

  startGame(roomId: string, players: GamePlayer[], smallBlind: number, bigBlind: number, previousDealerSeatNumber?: number): GameState {
    this.resetEngineState(bigBlind);

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

    this.dealHoleCards(gamePlayers, (dealerIndex + 1) % players.length);

    // Determine first actor for preflop
    const preferredFirstActorIndex = isHeadsUp
      ? dealerIndex
      : (bigBlindIndex + 1) % players.length;
    const firstActorIndex = this.findActionableIndexFrom(gamePlayers, preferredFirstActorIndex) ?? preferredFirstActorIndex;

    const initialState: GameState = {
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
      minRaiseTo: Math.max(actualSmallBlind, actualBigBlind) + bigBlind,
      players: gamePlayers,
      sidePots: [],
      status: 'playing',
    };

    if (this.findActionableIndexFrom(gamePlayers, firstActorIndex) === null) {
      return this.dealRemainingCardsAndShowdown(initialState);
    }

    this.updateSidePots(initialState);
    return initialState;
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

  private findActionableIndexFrom(players: GamePlayer[], startIndex: number): number | null {
    for (let offset = 0; offset < players.length; offset++) {
      const playerIndex = (startIndex + offset) % players.length;
      if (this.isActionablePlayer(players[playerIndex])) {
        return playerIndex;
      }
    }
    return null;
  }

  private isActionablePlayer(player: GamePlayer): boolean {
    return player.status === 'playing';
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
    if (!state.players.some(p => p.status === 'playing')) {
      return this.checkRoundComplete(state);
    }
    if (playerIndex !== state.currentPlayerIndex) throw new Error('Not your turn');
    if (state.players[playerIndex].status !== 'playing') throw new Error('Player cannot act');

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
        newState.minRaiseTo = amount + amount;
        newState.pot += betAmount;
        this.actedPlayers = new Set();
        this.raiseLockedPlayers = new Set();
        break;
      }

      case 'raise': {
        if (!amount || amount < state.minRaiseTo) {
          throw new Error('Raise amount must be at least current bet plus minimum raise');
        }
        if (this.raiseLockedPlayers.has(userId)) {
          throw new Error('Cannot raise after incomplete all-in');
        }
        const raiseAmount = amount - player.bet;
        if (raiseAmount > player.chips) {
          throw new Error('Not enough chips to raise');
        }
        const fullRaiseAmount = amount - this.getLastFullRaiseBet(state);
        player.chips -= raiseAmount;
        player.bet = amount;
        player.totalBet += raiseAmount;
        if (player.chips === 0) {
          player.status = 'all_in';
        }
        newState.currentBet = amount;
        newState.minRaise = fullRaiseAmount;
        newState.minRaiseTo = amount + newState.minRaise;
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

        const fullRaiseAmount = player.bet - this.getLastFullRaiseBet(state);
        const allInRaise = player.bet - state.currentBet;
        // 只有完整加注才会重新开放行动权
        if (player.bet > state.currentBet) {
          newState.currentBet = player.bet;
        }
        if (player.bet >= state.minRaiseTo) {
          newState.minRaise = fullRaiseAmount;
          newState.minRaiseTo = player.bet + fullRaiseAmount;
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

    // Record last action for frontend sound effects
    newState.lastAction = { userId, action, amount };

    // Check if round is complete
    const result = this.checkRoundComplete(newState);
    this.updateSidePots(result);
    return result;
  }

  private updateSidePots(state: GameState): void {
    const pots = PotCalculator.calculatePots(state.players);
    state.sidePots = pots.sidePots;
  }

  private getLastFullRaiseBet(state: GameState): number {
    return state.minRaiseTo - state.minRaise;
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
      const result = this.checkRoundComplete(newState);
      this.updateSidePots(result);
      return result;
    }

    const activePlayers = newState.players.filter(p => p.status !== 'folded');
    if (activePlayers.length === 1) {
      return this.finishGame(newState, activePlayers[0].userId);
    }

    this.updateSidePots(newState);
    return newState;
  }

  private checkRoundComplete(state: GameState): GameState {
    const activePlayers = state.players.filter(p => p.status !== 'folded' && p.status !== 'out');

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
      !this.isActionablePlayer(state.players[nextIndex]) && safety < state.players.length
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
    newState.minRaiseTo = this.bigBlind;

    // Reset acted tracking for the new betting round
    this.actedPlayers = new Set();
    this.raiseLockedPlayers = new Set();

    switch (state.phase) {
      case 'preflop':
        newState.phase = 'flop';
        newState.communityCards = this.dealFlopCards();
        break;

      case 'flop':
        newState.phase = 'turn';
        newState.communityCards = [...state.communityCards, this.dealStreetCard()];
        break;

      case 'turn':
        newState.phase = 'river';
        newState.communityCards = [...state.communityCards, this.dealStreetCard()];
        break;

      case 'river':
        return this.showdown(newState);

      default:
        return newState;
    }

    // 翻牌后从 Button 左侧第一个仍可行动玩家开始。Heads-up 时这会自然落在 BB。
    newState.currentPlayerIndex = this.findNextActionableIndex(newState, state.dealerIndex);
    this.updateSidePots(newState);

    return newState;
  }

  private findNextActionableIndex(state: GameState, fromIndex: number): number {
    let nextIndex = (fromIndex + 1) % state.players.length;
    let safety = 0;
    while (
      !this.isActionablePlayer(state.players[nextIndex]) && safety < state.players.length
    ) {
      nextIndex = (nextIndex + 1) % state.players.length;
      safety++;
    }
    return nextIndex;
  }

  private burnCard(): void {
    const burned = this.deck.deal();
    if (!burned) {
      throw new Error('Not enough cards in deck');
    }
  }

  private dealFlopCards(): Card[] {
    this.burnCard();
    return this.deck.dealMultiple(3);
  }

  private dealStreetCard(): Card {
    this.burnCard();
    const card = this.deck.deal();
    if (!card) {
      throw new Error('Not enough cards in deck');
    }
    return card;
  }

  private dealRemainingCardsAndShowdown(state: GameState): GameState {
    const newState: GameState = {
      ...state,
      players: state.players.map(p => ({ ...p, bet: 0 })),
      currentBet: 0,
      minRaiseTo: this.bigBlind,
      phase: 'river',
    };

    let communityCards = [...newState.communityCards];
    if (state.phase === 'preflop') {
      communityCards = this.dealFlopCards();
    }
    if (communityCards.length < 4) {
      communityCards = [...communityCards, this.dealStreetCard()];
    }
    if (communityCards.length < 5) {
      communityCards = [...communityCards, this.dealStreetCard()];
    }
    newState.communityCards = communityCards;

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
      { amount: pots.mainPot, eligiblePlayerIds: pots.mainPotEligiblePlayerIds },
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
      isFoldWin: false,
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
      if (eligibleHands.length === 0) {
        throw new Error('No eligible players for pot');
      }

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
      isFoldWin: true,
    };
  }
}
