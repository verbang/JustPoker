<template>
  <div class="form-card">
    <div class="form-card-header">
      <div class="form-card-title">创建房间</div>
      <button class="form-card-close" @click="$emit('back')">&times;</button>
    </div>

    <NicknameInput
      label="昵称"
      placeholder="1-5 个字符"
      :existing-nicknames="[]"
      @update:nickname="nickname = $event"
      @valid="isNicknameValid = $event"
    />

    <div class="field">
      <label class="field-label">游戏类型</label>
      <div class="game-type-group">
        <button
          type="button"
          class="game-type-option"
          :class="{ active: gameType === 'texas-holdem' }"
          @click="gameType = 'texas-holdem'"
        >
          <span class="game-type-title">德扑</span>
          <span class="game-type-meta">2-10 人</span>
        </button>
        <button
          type="button"
          class="game-type-option"
          :class="{ active: gameType === 'catch-mid' }"
          @click="gameType = 'catch-mid'"
        >
          <span class="game-type-title">抓兔</span>
          <span class="game-type-meta">3-4 人</span>
        </button>
      </div>
    </div>

    <ChipSelector
      v-if="gameType === 'texas-holdem'"
      label="初始筹码"
      :options="texasChipOptions"
      v-model="texasInitialChips"
    />
    <ChipSelector
      v-else
      label="初始筹码"
      :options="catchMidChipOptions"
      v-model="catchMidInitialChips"
    />

    <div class="field">
      <label class="field-label">房间密码（可选）</label>
      <input
        class="field-input"
        v-model="password"
        type="text"
        placeholder="4 位数字，留空则无密码"
        maxlength="4"
        inputmode="numeric"
        @input="handlePasswordInput"
      />
      <span v-if="passwordError" class="field-error">{{ passwordError }}</span>
    </div>

    <div class="toggle-row">
      <span class="toggle-label">行动倒计时</span>
      <input v-model="actionTimeoutEnabled" type="checkbox" class="toggle" />
    </div>

    <p v-if="errorMessage" class="error-msg">{{ errorMessage }}</p>

    <button
      class="btn-primary"
      :disabled="!isNicknameValid"
      @click="createRoom"
    >创建房间</button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { roomApi } from '../../services/api';
import { useUserStore } from '../../stores/user';
import { useRoomStore } from '../../stores/room';
import type { GameType } from '../../../../shared/types/room.types';
import { CATCH_MID_CHIP_OPTIONS, CHIP_OPTIONS } from '../../../../shared/constants/game.constants';
import NicknameInput from '../common/NicknameInput.vue';
import ChipSelector from '../common/ChipSelector.vue';

defineEmits<{ (e: 'back'): void }>();

const router = useRouter();
const userStore = useUserStore();
const roomStore = useRoomStore();

const nickname = ref('');
const texasInitialChips = ref(100);
const catchMidInitialChips = ref(50);
const gameType = ref<GameType>('texas-holdem');
const password = ref('');
const actionTimeoutEnabled = ref(false);
const isNicknameValid = ref(false);
const passwordError = ref('');
const errorMessage = ref('');

const texasChipOptions = [...CHIP_OPTIONS];
const catchMidChipOptions = [...CATCH_MID_CHIP_OPTIONS];
const initialChips = computed(() => gameType.value === 'catch-mid' ? catchMidInitialChips.value : texasInitialChips.value);

function handlePasswordInput() {
  password.value = password.value.replace(/\D/g, '').slice(0, 4);
  validatePassword();
}

function validatePassword() {
  passwordError.value = '';
  if (!password.value) return;

  if (!/^\d{0,4}$/.test(password.value) || password.value.length !== 4) {
    passwordError.value = '密码仅支持 4 位纯数字';
  }
}

async function createRoom() {
  validatePassword();
  if (passwordError.value) return;
  errorMessage.value = '';

  try {
    const response = await roomApi.createRoom(
      nickname.value,
      initialChips.value,
      password.value || undefined,
      actionTimeoutEnabled.value,
      gameType.value
    );
    const { roomCode, roomId, userId } = response.data;

    userStore.setUser(userId, nickname.value, roomCode);
    roomStore.setRoom(roomCode, roomId, initialChips.value, actionTimeoutEnabled.value, response.data.gameType, userId);

    router.push(`/room/${roomCode}`);
  } catch (error) {
    console.error('Failed to create room:', error);
    if (axios.isAxiosError<{ error?: string }>(error)) {
      errorMessage.value = error.response?.data?.error || '创建房间失败';
      return;
    }
    errorMessage.value = '创建房间失败，请稍后重试';
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

.field-error {
  font-size: 12px;
  color: var(--error);
}

.game-type-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.game-type-option {
  border: 1px solid var(--outline);
  border-radius: 8px;
  background: var(--surface);
  color: var(--on-surface);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  cursor: pointer;
  font-family: 'Chakra Petch', 'Noto Sans SC', sans-serif;
  text-align: left;
}

.game-type-option.active {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.16);
}

.game-type-title {
  font-size: 14px;
  font-weight: 600;
}

.game-type-meta {
  font-size: 12px;
  color: var(--on-surface-variant);
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}

.toggle-label {
  font-size: 14px;
  color: var(--on-surface);
}

.toggle {
  position: relative;
  width: 44px;
  height: 24px;
  appearance: none;
  background: var(--outline);
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 200ms;
  border: none;
  flex-shrink: 0;
}

.toggle::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  background: var(--on-surface);
  border-radius: 50%;
  transition: transform 200ms;
}

.toggle:checked {
  background: #22c55e;
}

.toggle:checked::after {
  transform: translateX(20px);
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
