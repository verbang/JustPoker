<template>
  <div class="create-room">
    <h2>创建房间</h2>
    <NicknameInput
      label="设置昵称"
      placeholder="2-10个字符"
      :existing-nicknames="[]"
      @update:nickname="nickname = $event"
      @valid="isNicknameValid = $event"
    />
    <ChipSelector
      label="设置初始筹码"
      :options="[100, 200, 500]"
      v-model="initialChips"
    />
    <div class="password-field">
      <label>房间密码（可选）</label>
      <input
        v-model="password"
        type="text"
        placeholder="4位数字，留空则无密码"
        maxlength="4"
        @input="password = password.replace(/\D/g, '')"
      />
    </div>
    <button :disabled="!isNicknameValid" @click="createRoom">创建房间</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { roomApi } from '../../services/api';
import { useUserStore } from '../../stores/user';
import { useRoomStore } from '../../stores/room';
import NicknameInput from '../common/NicknameInput.vue';
import ChipSelector from '../common/ChipSelector.vue';

const router = useRouter();
const userStore = useUserStore();
const roomStore = useRoomStore();

const nickname = ref('');
const initialChips = ref(100);
const password = ref('');
const isNicknameValid = ref(false);

async function createRoom() {
  try {
    const response = await roomApi.createRoom(nickname.value, initialChips.value, password.value || undefined);
    const { roomCode, roomId, userId } = response.data;

    userStore.setUser(userId, nickname.value);
    roomStore.setRoom(roomCode, roomId, initialChips.value);

    router.push(`/room/${roomCode}`);
  } catch (error) {
    console.error('Failed to create room:', error);
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
</style>
