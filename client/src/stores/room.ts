import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { GameType, RoomPlayer } from '../../../shared/types/room.types';
import { GAME_TYPE_MAX_SEATS } from '../../../shared/constants/game.constants';

export type { RoomPlayer };

export const useRoomStore = defineStore('room', () => {
  const roomCode = ref<string | null>(null);
  const roomId = ref<string | null>(null);
  const hostId = ref<string | null>(null);
  const players = ref<RoomPlayer[]>([]);
  const initialChips = ref(100);
  const gameType = ref<GameType>('texas-holdem');
  const actionTimeoutEnabled = ref(false);

  function setRoom(code: string, id: string, chips: number, timeoutEnabled = false, type: GameType = 'texas-holdem', hostUserId: string | null = null) {
    roomCode.value = code;
    roomId.value = id;
    hostId.value = hostUserId;
    initialChips.value = chips;
    gameType.value = type;
    actionTimeoutEnabled.value = timeoutEnabled;
  }

  function setGameType(type: GameType) {
    gameType.value = type;
  }

  function setActionTimeoutEnabled(enabled: boolean) {
    actionTimeoutEnabled.value = enabled;
  }

  function setPlayers(newPlayers: RoomPlayer[]) {
    players.value = newPlayers;
  }

  function clearRoom() {
    roomCode.value = null;
    roomId.value = null;
    hostId.value = null;
    players.value = [];
    gameType.value = 'texas-holdem';
    actionTimeoutEnabled.value = false;
  }

  return {
    roomCode,
    roomId,
    hostId,
    players,
    initialChips,
    gameType,
    maxSeats: computed(() => GAME_TYPE_MAX_SEATS[gameType.value]),
    actionTimeoutEnabled,
    setRoom,
    setPlayers,
    setGameType,
    setActionTimeoutEnabled,
    clearRoom,
  };
});
