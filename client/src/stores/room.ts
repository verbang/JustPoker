import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface RoomPlayer {
  userId: string;
  nickname: string;
  seatNumber: number | null;
  chips: number;
  status: string;
}

export const useRoomStore = defineStore('room', () => {
  const roomCode = ref<string | null>(null);
  const roomId = ref<string | null>(null);
  const players = ref<RoomPlayer[]>([]);
  const initialChips = ref(100);

  function setRoom(code: string, id: string, chips: number) {
    roomCode.value = code;
    roomId.value = id;
    initialChips.value = chips;
  }

  function setPlayers(newPlayers: RoomPlayer[]) {
    players.value = newPlayers;
  }

  function clearRoom() {
    roomCode.value = null;
    roomId.value = null;
    players.value = [];
  }

  return { roomCode, roomId, players, initialChips, setRoom, setPlayers, clearRoom };
});
