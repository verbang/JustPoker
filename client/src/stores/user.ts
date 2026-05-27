import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('user', () => {
  const userId = ref<string | null>(null);
  const nickname = ref<string | null>(null);

  function setUser(id: string, name: string) {
    userId.value = id;
    nickname.value = name;
  }

  function clearUser() {
    userId.value = null;
    nickname.value = null;
  }

  return { userId, nickname, setUser, clearUser };
});
