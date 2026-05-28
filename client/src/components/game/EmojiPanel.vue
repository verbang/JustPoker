<template>
  <div class="emoji-panel">
    <button
      v-for="emoji in emojis"
      :key="emoji"
      class="emoji-btn"
      @click="$emit('send', emoji)"
      :disabled="isCooldown"
    >
      {{ emoji }}
    </button>
    <span v-if="isCooldown" class="cooldown">太快了，停一下</span>
  </div>
</template>

<script setup lang="ts">
import { EMOJIS } from '../../../../shared/constants/game.constants';

defineProps<{
  isCooldown: boolean;
}>();

defineEmits<{
  (e: 'send', emoji: string): void;
}>();

const emojis = EMOJIS;
</script>

<style scoped>
.emoji-panel {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  flex-wrap: wrap;
}

.emoji-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.emoji-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.cooldown {
  color: #ff9800;
  font-size: 12px;
  margin-left: 8px;
}

@media (orientation: landscape) and (max-width: 900px) {
  .emoji-panel {
    gap: 4px;
    padding: 6px;
    border-radius: 6px;
  }

  .emoji-btn {
    width: 30px;
    height: 30px;
    border-radius: 5px;
    font-size: 17px;
  }

  .cooldown {
    width: 100%;
    margin-left: 0;
    font-size: 10px;
    text-align: center;
  }
}
</style>
