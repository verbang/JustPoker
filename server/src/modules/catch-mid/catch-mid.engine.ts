import { v4 as uuidv4 } from 'uuid';
import {
  CatchMidCard,
  CatchMidGameState,
  CatchMidPlayer,
  CatchMidRoundParticipant,
  CatchMidRoundResult,
  CatchMidRoundSelection
} from '../../../../shared/types/catch-mid.types';
import { RoomPlayer } from '../../../../shared/types/room.types';
import { CatchMidDeck } from './catch-mid.deck';
import { CatchMidHandEvaluator } from './catch-mid.hand-evaluator';
import { CatchMidSettlement } from './catch-mid.settlement';

const ROUND_BASE_BETS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5
};

export class CatchMidEngine {
  private deck = new CatchMidDeck();

  startGame(roomId: string, roomPlayers: RoomPlayer[]): CatchMidGameState {
    if (roomPlayers.length < 3 || roomPlayers.length > 4) {
      throw new Error('Catch Mid requires 3 to 4 players');
    }

    this.deck.reset();
    this.deck.shuffle();

    const players: CatchMidPlayer[] = roomPlayers
      .sort((a, b) => {
        const seatDiff = (a.seatNumber ?? Number.MAX_SAFE_INTEGER) - (b.seatNumber ?? Number.MAX_SAFE_INTEGER);
        if (seatDiff !== 0) return seatDiff;
        return a.joinedAt.getTime() - b.joinedAt.getTime();
      })
      .map(player => ({
        userId: player.userId,
        nickname: player.nickname,
        seatNumber: player.seatNumber ?? 0,
        chips: player.chips,
        cards: this.deck.dealMultiple(5),
        status: 'playing',
        selectedCardIds: [],
        confirmed: false,
        revealConfirmed: false
      }));

    const communityCards: { card: CatchMidCard; visible: boolean }[] = [];
    for (let i = 0; i < 4; i++) {
      this.burnCard();
      const card = this.deck.deal();
      if (!card) {
        throw new Error('Not enough cards in deck');
      }
      communityCards.push({ card, visible: i < 3 });
    }

    return {
      id: uuidv4(),
      roomId,
      phase: 'selecting',
      round: 1,
      players,
      communityCards,
      deckRemaining: this.deck.remaining(),
      discardPile: [],
      roundResults: [],
      eliminatedPlayerIds: [],
      canStartNextHand: false,
      finalRanking: []
    };
  }

  selectCards(state: CatchMidGameState, userId: string, cardIds: string[]): CatchMidGameState {
    if (state.phase !== 'selecting') {
      throw new Error('Current phase does not allow card selection');
    }
    if (state.round < 1 || state.round > 4) {
      throw new Error('Current round does not allow manual selection');
    }
    if (cardIds.length !== 2 || new Set(cardIds).size !== 2) {
      throw new Error('Must select exactly 2 cards');
    }

    const newState = this.cloneState(state);
    const player = this.getPlayer(newState, userId);
    const handCardIds = new Set(player.cards.map(card => this.getCardId(card)));
    if (!cardIds.every(cardId => handCardIds.has(cardId))) {
      throw new Error('Selected card is not in player hand');
    }

    player.selectedCardIds = cardIds;
    player.confirmed = false;
    return newState;
  }

  confirmSelection(state: CatchMidGameState, userId: string): CatchMidGameState {
    if (state.phase !== 'selecting') {
      throw new Error('Current phase does not allow confirmation');
    }

    const newState = this.cloneState(state);
    const player = this.getPlayer(newState, userId);
    if (player.selectedCardIds.length !== 2) {
      throw new Error('Player has not selected 2 cards');
    }

    player.confirmed = true;
    if (this.getPlayingPlayers(newState).every(item => item.confirmed)) {
      return this.resolveCurrentRound(newState);
    }
    return newState;
  }

  autoConfirmCurrentPhase(state: CatchMidGameState, userId: string): CatchMidGameState {
    if (state.phase === 'selecting') {
      return this.autoConfirmSelection(state, userId);
    }
    if (state.phase === 'round_result') {
      return this.confirmContinueAfterRoundResult(state, userId);
    }
    if (state.phase === 'confirm_reveal') {
      return this.confirmReveal(state, userId);
    }
    return state;
  }

  confirmContinueAfterRoundResult(state: CatchMidGameState, userId: string): CatchMidGameState {
    if (state.phase !== 'round_result') {
      throw new Error('Current phase is not round_result');
    }

    const newState = this.cloneState(state);
    const player = this.getPlayer(newState, userId);
    player.confirmed = true;

    if (!this.getPlayingPlayers(newState).every(item => item.confirmed)) {
      return newState;
    }

    return this.advanceAfterRoundResult(newState);
  }

  advanceAfterRoundResult(state: CatchMidGameState): CatchMidGameState {
    if (state.phase !== 'round_result') {
      throw new Error('Current phase is not round_result');
    }

    const newState = this.cloneState(state);
    if (newState.round >= 5) {
      return this.finishHand(newState);
    }
    if (newState.round === 4) {
      newState.phase = 'confirm_reveal';
      delete newState.lastRoundResult;
      newState.players.forEach(player => {
        player.revealConfirmed = false;
        player.confirmed = false;
      });
      return newState;
    }

    this.drawCardsAfterRound(newState);
    newState.deckRemaining = this.deck.remaining();
    newState.round += 1;
    newState.phase = 'selecting';
    delete newState.lastRoundResult;
    this.resetRoundPlayerFlags(newState);
    return newState;
  }

  confirmReveal(state: CatchMidGameState, userId: string): CatchMidGameState {
    if (state.phase !== 'confirm_reveal') {
      throw new Error('Current phase does not allow reveal confirmation');
    }

    const newState = this.cloneState(state);
    const player = this.getPlayer(newState, userId);
    player.revealConfirmed = true;

    if (!this.getPlayingPlayers(newState).every(item => item.revealConfirmed)) {
      return newState;
    }

    newState.round = 5;
    return this.resolveCurrentRound(newState);
  }

  private resolveCurrentRound(state: CatchMidGameState): CatchMidGameState {
    const roundResult = state.round === 5
      ? this.buildFinalRoundResult(state)
      : this.buildCommunityRoundResult(state);

    this.applySettlement(state, roundResult);
    state.roundResults.push(roundResult);
    state.lastRoundResult = roundResult;
    state.phase = 'round_result';
    state.players.forEach(player => {
      player.confirmed = false;
    });
    state.deckRemaining = this.deck.remaining();
    if (state.round === 5) {
      return this.finishHand(state);
    }
    return state;
  }

  private buildCommunityRoundResult(state: CatchMidGameState): CatchMidRoundResult {
    const communityCard = state.communityCards[state.round - 1];
    if (!communityCard) {
      throw new Error('Community card not found');
    }
    if (state.round === 4) {
      communityCard.visible = true;
    }

    const selections = state.players.map<CatchMidRoundSelection>(player => {
      const selectedCards = this.takeSelectedCards(player);
      const compareCards = [...selectedCards, communityCard.card];
      return {
        userId: player.userId,
        selectedCards,
        compareCards,
        hand: CatchMidHandEvaluator.evaluate(compareCards)
      };
    });

    this.discardUsedCards(state, selections, communityCard.card);

    return this.buildRoundResult(state.round, selections, communityCard);
  }

  private buildFinalRoundResult(state: CatchMidGameState): CatchMidRoundResult {
    const selections = state.players.map<CatchMidRoundSelection>(player => {
      if (player.cards.length !== 3) {
        throw new Error('Round 5 requires exactly 3 cards per player');
      }
      const compareCards = [...player.cards];
      return {
        userId: player.userId,
        selectedCards: [...player.cards],
        compareCards,
        hand: CatchMidHandEvaluator.evaluate(compareCards)
      };
    });

    selections.forEach(selection => state.discardPile.push(...selection.compareCards));
    state.players.forEach(player => {
      player.cards = [];
    });

    return this.buildRoundResult(5, selections);
  }

  private buildRoundResult(
    round: number,
    selections: CatchMidRoundSelection[],
    communityCard?: { card: CatchMidCard; visible: boolean }
  ): CatchMidRoundResult {
    const participants: CatchMidRoundParticipant[] = selections.map(selection => ({
      userId: selection.userId,
      hand: selection.hand
    }));
    const sortedSelections = [...selections].sort((a, b) => CatchMidHandEvaluator.compareResults(b.hand, a.hand));

    return {
      round,
      baseBet: ROUND_BASE_BETS[round],
      communityCard,
      selections: sortedSelections,
      settlement: CatchMidSettlement.settleRound(participants, ROUND_BASE_BETS[round])
    };
  }

  private applySettlement(state: CatchMidGameState, roundResult: CatchMidRoundResult): void {
    roundResult.settlement.payments.forEach(payment => {
      const fromPlayer = this.getPlayer(state, payment.fromUserId);
      const toPlayer = this.getPlayer(state, payment.toUserId);
      fromPlayer.chips -= payment.amount;
      toPlayer.chips += payment.amount;
    });
  }

  private finishHand(state: CatchMidGameState): CatchMidGameState {
    const eliminatedPlayerIds = state.players
      .filter(player => player.chips <= 0)
      .map(player => player.userId);
    state.eliminatedPlayerIds = eliminatedPlayerIds;
    state.players.forEach(player => {
      if (eliminatedPlayerIds.includes(player.userId)) {
        player.status = 'out';
      }
    });

    const activePlayers = state.players.filter(player => player.status === 'playing');
    state.finalRanking = [...state.players]
      .sort((a, b) => b.chips - a.chips)
      .map(player => player.userId);

    if (activePlayers.length === 0) {
      state.phase = 'game_draw';
      state.canStartNextHand = false;
      return state;
    }

    state.canStartNextHand = activePlayers.length >= 3;
    state.phase = state.canStartNextHand ? 'finished' : 'game_over';
    return state;
  }

  private takeSelectedCards(player: CatchMidPlayer): CatchMidCard[] {
    const selectedCardIdSet = new Set(player.selectedCardIds);
    const selectedCards = player.cards.filter(card => selectedCardIdSet.has(this.getCardId(card)));
    if (selectedCards.length !== 2) {
      throw new Error('Selected cards not found');
    }

    player.cards = player.cards.filter(card => !selectedCardIdSet.has(this.getCardId(card)));
    return selectedCards;
  }

  private discardUsedCards(
    state: CatchMidGameState,
    selections: CatchMidRoundSelection[],
    communityCard: CatchMidCard
  ): void {
    selections.forEach(selection => state.discardPile.push(...selection.selectedCards));
    state.discardPile.push(communityCard);
  }

  private burnCard(): void {
    const burned = this.deck.deal();
    if (!burned) {
      throw new Error('Not enough cards in deck');
    }
  }

  private drawCardsAfterRound(state: CatchMidGameState): void {
    state.players.forEach(player => {
      player.cards.push(...this.deck.dealMultiple(2));
    });
  }

  private resetRoundPlayerFlags(state: CatchMidGameState): void {
    state.players.forEach(player => {
      player.selectedCardIds = [];
      player.confirmed = false;
      player.revealConfirmed = false;
    });
  }

  private autoConfirmSelection(state: CatchMidGameState, userId: string): CatchMidGameState {
    if (state.phase !== 'selecting') {
      return state;
    }

    let newState = this.cloneState(state);
    const player = this.getPlayer(newState, userId);
    if (player.status !== 'playing' || player.confirmed) {
      return newState;
    }

    if (player.selectedCardIds.length !== 2) {
      player.selectedCardIds = player.cards.slice(0, 2).map(card => this.getCardId(card));
    }

    newState = this.confirmSelection(newState, userId);
    return newState;
  }

  private getPlayingPlayers(state: CatchMidGameState): CatchMidPlayer[] {
    return state.players.filter(player => player.status === 'playing');
  }

  private cloneState(state: CatchMidGameState): CatchMidGameState {
    return {
      ...state,
      players: state.players.map(player => ({
        ...player,
        cards: [...player.cards],
        selectedCardIds: [...player.selectedCardIds]
      })),
      communityCards: state.communityCards.map(item => ({ ...item })),
      discardPile: [...state.discardPile],
      roundResults: [...state.roundResults],
      eliminatedPlayerIds: [...state.eliminatedPlayerIds],
      finalRanking: [...state.finalRanking]
    };
  }

  private getPlayer(state: CatchMidGameState, userId: string): CatchMidPlayer {
    const player = state.players.find(item => item.userId === userId);
    if (!player) {
      throw new Error('Player not found');
    }
    return player;
  }

  private getCardId(card: CatchMidCard): string {
    return `${card.suit}-${card.rank}`;
  }
}
