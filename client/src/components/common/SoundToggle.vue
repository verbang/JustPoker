<template>
  <button class="sound-toggle" @click="toggleSound">
    {{ soundEnabled ? '🔊' : '🔇' }}
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const soundEnabled = ref(true);

function toggleSound() {
  soundEnabled.value = !soundEnabled.value;
}
</script>
