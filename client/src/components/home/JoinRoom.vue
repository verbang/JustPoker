<template>
  <div class="form-card">
    <div class="form-card-header">
      <div class="form-card-title">加入房间</div>
      <button class="form-card-close" @click="$emit('back')">&times;</button>
    </div>

    <div class="field">
      <label class="field-label">房间号</label>
      <input
        class="field-input"
        v-model="roomCode"
        placeholder="输入 2 位房间号"
        maxlength="2"
        inputmode="numeric"
        @input="handleRoomCodeInput"
      />
    </div>

    <NicknameInput
      label="昵称"
      placeholder="1-5 个字符"
      :existing-nicknames="existingNicknames"
      @update:nickname="nickname = $event"
      @valid="isNicknameValid = $event"
    />

    <ChipSelector
      label="带入筹码"
      :options="[100, 200, 500]"
      v-model="chips"
    />

    <div class="field">
      <label class="field-label">房间密码</label>
      <input
        class="field-input"
        v-model="password"
        type="text"
        placeholder="无密码可留空"
        maxlength="4"
        inputmode="numeric"
        @input="handlePasswordInput"
      />
    </div>

    <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>

    <button
      class="btn-primary"
      :disabled="!isNicknameValid || !roomCode"
      @click="joinRoom"
    >加入房间</button>
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

defineEmits<{ (e: 'back'): void }>();

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
.form-card {
  background: var(--surface-container);
  border-radius: var(--radius-card);
  padding: 24px;
  border: 1px solid var(--outline);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-card-title {
  font-family: 'Russo One', sans-serif;
  font-size: 18px;
  color: var(--on-surface);
}

.form-card-close {
  background: none;
  border: none;
  color: var(--on-surface-variant);
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background-color 200ms;
  line-height: 1;
}

.form-card-close:hover {
  background: var(--surface-container-high);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  color: var(--on-surface-variant);
  font-weight: 500;
}

.field-input {
  padding: 12px 14px;
  border: 1px solid var(--outline);
  border-radius: var(--radius-input);
  background: var(--surface);
  color: var(--on-surface);
  font-family: 'Chakra Petch', 'Noto Sans SC', sans-serif;
  font-size: 15px;
  outline: none;
  transition: border-color 200ms, box-shadow 200ms;
}

.field-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
}

.field-input::placeholder {
  color: var(--on-surface-variant);
  opacity: 0.6;
}

.error-msg {
  font-size: 13px;
  color: var(--error);
  text-align: center;
  margin: 0;
}

.btn-primary {
  width: 100%;
  padding: 14px 0;
  border: none;
  border-radius: var(--radius-button);
  background: var(--primary);
  color: #fff;
  font-family: 'Chakra Petch', 'Noto Sans SC', sans-serif;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 200ms, transform 100ms;
  margin-top: 4px;
}

.btn-primary:hover {
  filter: brightness(1.15);
}

.btn-primary:active {
  transform: scale(0.97);
}

.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-primary:disabled:hover {
  background: var(--primary);
}
</style>
