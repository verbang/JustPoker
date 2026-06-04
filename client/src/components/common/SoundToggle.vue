<template>
  <button class="sound-btn" @click="toggle">
    {{ enabled ? '🔊 音效开' : '🔇 音效关' }}
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { soundManager } from '../../utils/sounds';

const enabled = ref(soundManager.isEnabled());

function toggle() {
  enabled.value = !enabled.value;
  soundManager.setEnabled(enabled.value);
}
</script>

<style scoped>
.sound-btn {
  background: var(--surface-container);
  border: 1px solid var(--outline);
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  font-family: 'Chakra Petch', 'Noto Sans SC', sans-serif;
  color: var(--on-surface-variant);
  transition: background-color 200ms;
  display: flex;
  align-items: center;
  gap: 4px;
}

.sound-btn:hover {
  background: var(--surface-container-high);
}
</style>
