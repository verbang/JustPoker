import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useUserStore } from './user';
import type { GamePlayer, GameState } from '../../../shared/types/game.types';

export type { GamePlayer, GameState };

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
    const currentPlayerId = gameState.value.currentPlayerId
      ?? gameState.value.players[gameState.value.currentPlayerIndex]?.userId;
    return currentPlayerId === userStore.userId;
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
