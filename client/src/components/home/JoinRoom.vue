<template>
  <div class="join-room">
    <h2>加入房间</h2>
    <input
      v-model="roomCode"
      placeholder="输入房间号"
      maxlength="2"
      inputmode="numeric"
      @input="handleRoomCodeInput"
    />
    <NicknameInput
      label="设置昵称"
      placeholder="1-5个字符"
      :existing-nicknames="existingNicknames"
      @update:nickname="nickname = $event"
      @valid="isNicknameValid = $event"
    />
    <ChipSelector
      label="设置带入筹码"
      :options="[100, 200, 500]"
      v-model="chips"
    />
    <div class="password-field">
      <label>房间密码</label>
      <input
        v-model="password"
        type="text"
        placeholder="4位数字（无密码可留空）"
        maxlength="4"
        inputmode="numeric"
        @input="handlePasswordInput"
      />
    </div>
    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <button :disabled="!isNicknameValid || !roomCode" @click="joinRoom">加入房间</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { roomApi } from '../../services/api';
import { useUserStore } from '../../stores/user';
import NicknameInput from '../common/NicknameInput.vue';
import ChipSelector from '../common/ChipSelector.vue';

const router = useRouter();
const userStore = useUserStore();

const roomCode = ref('');
const nickname = ref('');
const chips = ref(100);
const password = ref('');
const isNicknameValid = ref(false);
const errorMessage = ref('');
const existingNicknames = ref<string[]>([]);
let roomInfoRequestId = 0;

async function handleRoomCodeInput() {
  roomCode.value = roomCode.value.replace(/\D/g, '').slice(0, 2);
  errorMessage.value = '';
  existingNicknames.value = [];

  if (roomCode.value.length !== 2) return;

  const requestId = ++roomInfoRequestId;
  try {
    const response = await roomApi.getRoomInfo(roomCode.value);
    if (requestId !== roomInfoRequestId) return;

    existingNicknames.value = response.data.players.map(player => player.nickname);
  } catch {
    if (requestId !== roomInfoRequestId) return;
    existingNicknames.value = [];
  }
}

function handlePasswordInput() {
  password.value = password.value.replace(/\D/g, '').slice(0, 4);
}

async function joinRoom() {
  try {
    errorMessage.value = '';
    const response = await roomApi.joinRoom(roomCode.value, nickname.value, chips.value, password.value || undefined);
    const { userId } = response.data;

    userStore.setUser(userId, nickname.value, roomCode.value);
    router.push(`/room/${roomCode.value}`);
  } catch (error) {
    console.error('Failed to join room:', error);
    if (axios.isAxiosError<{ error?: string }>(error)) {
      errorMessage.value = error.response?.data?.error || '加入房间失败';
      return;
    }
    errorMessage.value = '加入房间失败';
  }
}
</script>

<style scoped>
.password-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.password-field label {
  font-size: 14px;
  color: #ccc;
}

.password-field input {
  padding: 10px 12px;
  border: 1px solid #555;
  border-radius: 6px;
  background: #2a2a2a;
  color: #fff;
  font-size: 16px;
  outline: none;
}

.password-field input:focus {
  border-color: #4caf50;
}

.password-field input::placeholder {
  color: #777;
}

.error-message {
  margin: 0;
  color: #ff6b6b;
  font-size: 14px;
  text-align: center;
}
</style>
