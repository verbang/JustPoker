import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface GameState {
  phase: string;
  pot: number;
  communityCards: any[];
  currentPlayerIndex: number;
  currentBet: number;
  status: string;
}

export const useGameStore = defineStore('game', () => {
  const gameState = ref<GameState | null>(null);
  const myCards = ref<any[]>([]);
  const isMyTurn = ref(false);

  function updateGameState(state: GameState) {
    gameState.value = state;
  }

  function setMyCards(cards: any[]) {
    myCards.value = cards;
  }

  function setMyTurn(isTurn: boolean) {
    isMyTurn.value = isTurn;
  }

  function clearGame() {
    gameState.value = null;
    myCards.value = [];
    isMyTurn.value = false;
  }

  return { gameState, myCards, isMyTurn, updateGameState, setMyCards, setMyTurn, clearGame };
});
