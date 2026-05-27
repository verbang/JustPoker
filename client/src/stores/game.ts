import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useUserStore } from './user';

export interface GamePlayer {
  userId: string;
  nickname: string;
  chips: number;
  bet: number;
  totalBet: number;
  cards: any[];
  status: string;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
}

export interface GameState {
  id: string;
  roomId: string;
  phase: string;
  pot: number;
  communityCards: any[];
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  currentBet: number;
  minRaise: number;
  players: GamePlayer[];
  sidePots: any[];
  status: string;
  winnerId?: string;
  winningHand?: string;
}

export const useGameStore = defineStore('game', () => {
  const gameState = ref<GameState | null>(null);
  const userStore = useUserStore();

  const myCards = computed(() => {
    if (!gameState.value || !userStore.userId) return [];
    const me = gameState.value.players.find(p => p.userId === userStore.userId);
    return me?.cards || [];
  });

  const isMyTurn = computed(() => {
    if (!gameState.value || !userStore.userId) return false;
    if (gameState.value.status !== 'playing') return false;
    const myIndex = gameState.value.players.findIndex(p => p.userId === userStore.userId);
    return myIndex === gameState.value.currentPlayerIndex;
  });

  const myPlayer = computed(() => {
    if (!gameState.value || !userStore.userId) return null;
    return gameState.value.players.find(p => p.userId === userStore.userId) || null;
  });

  function updateGameState(state: GameState) {
    gameState.value = state;
  }

  function clearGame() {
    gameState.value = null;
  }

  return { gameState, myCards, isMyTurn, myPlayer, updateGameState, clearGame };
});
