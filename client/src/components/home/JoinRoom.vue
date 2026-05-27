<template>
  <div class="join-room">
    <h2>加入房间</h2>
    <input v-model="roomCode" placeholder="输入房间号" maxlength="2" />
    <NicknameInput
      label="设置昵称"
      placeholder="2-10个字符"
      :existing-nicknames="[]"
      @update:nickname="nickname = $event"
      @valid="isNicknameValid = $event"
    />
    <ChipSelector
      label="设置带入筹码"
      :options="[100, 200, 500]"
      v-model="chips"
    />
    <button :disabled="!isNicknameValid || !roomCode" @click="joinRoom">加入房间</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { roomApi } from '../../services/api';
import { useUserStore } from '../../stores/user';
import NicknameInput from '../common/NicknameInput.vue';
import ChipSelector from '../common/ChipSelector.vue';

const router = useRouter();
const userStore = useUserStore();

const roomCode = ref('');
const nickname = ref('');
const chips = ref(100);
const isNicknameValid = ref(false);

async function joinRoom() {
  try {
    const response = await roomApi.joinRoom(roomCode.value, nickname.value, chips.value);
    const { userId } = response.data;

    userStore.setUser(userId, nickname.value);
    router.push(`/room/${roomCode.value}`);
  } catch (error) {
    console.error('Failed to join room:', error);
  }
}
</script>
