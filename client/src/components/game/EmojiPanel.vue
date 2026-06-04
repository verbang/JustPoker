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
  background: var(--surface-container);
  border-radius: var(--radius-card);
  padding: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.emoji-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--surface-container-high);
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  transition: all 200ms;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emoji-btn:hover:not(:disabled) {
  background: var(--outline);
  transform: scale(1.1);
}

.emoji-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.cooldown {
  font-size: 11px;
  color: var(--secondary);
  margin-left: 4px;
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

@media (orientation: portrait) {
  .emoji-panel {
    flex: 1;
    min-width: 200px;
  }
}
</style>
