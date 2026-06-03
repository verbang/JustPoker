import { defineStore } from 'pinia';
import { ref } from 'vue';

const STORAGE_KEY = 'justpoker_user';

interface StoredUser {
  userId: string;
  nickname: string;
  roomCode: string;
}

export const useUserStore = defineStore('user', () => {
  const userId = ref<string | null>(null);
  const nickname = ref<string | null>(null);
  const roomCode = ref<string | null>(null);

  function setUser(id: string, name: string, room?: string) {
    userId.value = id;
    nickname.value = name;
    roomCode.value = room || null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId: id, nickname: name, roomCode: room || '' } as StoredUser));
  }

  function clearUser() {
    userId.value = null;
    nickname.value = null;
    roomCode.value = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  function loadUser(): boolean {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    try {
      const data: StoredUser = JSON.parse(raw);
      if (data.userId && data.nickname) {
        userId.value = data.userId;
        nickname.value = data.nickname;
        roomCode.value = data.roomCode || null;
        return true;
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    return false;
  }

  return { userId, nickname, roomCode, setUser, clearUser, loadUser };
});
