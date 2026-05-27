<template>
  <div class="sound-toggle">
    <button @click="toggle" :class="{ active: enabled }">
      {{ enabled ? '🔊' : '🔇' }}
    </button>
    <span>音效{{ enabled ? '开启' : '关闭' }}</span>
  </div>
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
