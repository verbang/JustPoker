<template>
  <transition name="countdown-fade">
    <div v-if="visible" class="countdown-overlay">
      <transition name="countdown-pop" mode="out-in">
        <span :key="displayText" class="countdown-text" :class="{ 'go': displayText === 'Go!' }">
          {{ displayText }}
        </span>
      </transition>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';

const props = defineProps<{
  count: number | null;
}>();

const visible = ref(false);
const displayText = ref('');
let goTimer: ReturnType<typeof setTimeout> | null = null;

watch(() => props.count, (newCount) => {
  if (newCount === null) {
    visible.value = false;
    return;
  }

  visible.value = true;

  if (newCount > 0) {
    displayText.value = String(newCount);
  } else {
    displayText.value = 'Go!';
    // Hide after "Go!" animation
    goTimer = setTimeout(() => {
      visible.value = false;
      goTimer = null;
    }, 1000);
  }
});

onUnmounted(() => {
  if (goTimer) {
    clearTimeout(goTimer);
    goTimer = null;
  }
});
</script>

<style scoped>
.countdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.3);
}

.countdown-text {
  font-family: 'Russo One', sans-serif;
  font-size: 120px;
  color: #fff;
  text-shadow:
    0 0 20px rgba(99,102,241,0.6),
    0 0 40px rgba(99,102,241,0.3);
  user-select: none;
}

.countdown-text.go {
  color: var(--tertiary);
  text-shadow:
    0 0 20px rgba(34,197,94,0.8),
    0 0 40px rgba(34,197,94,0.4);
  font-size: 140px;
}

.countdown-pop-enter-active {
  animation: pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.countdown-pop-leave-active {
  animation: pop-out 0.2s ease-in;
}

@keyframes pop-in {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes pop-out {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.5);
  }
}

.countdown-fade-enter-active {
  transition: opacity 0.3s;
}
.countdown-fade-leave-active {
  transition: opacity 0.5s;
}
.countdown-fade-enter-from,
.countdown-fade-leave-to {
  opacity: 0;
}
</style>
