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
import { ref, watch } from 'vue';

const props = defineProps<{
  count: number | null;
}>();

const visible = ref(false);
const displayText = ref('');

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
    setTimeout(() => {
      visible.value = false;
    }, 1000);
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
  font-size: 120px;
  font-weight: 900;
  color: #fff;
  text-shadow:
    0 0 20px rgba(255, 235, 59, 0.8),
    0 0 40px rgba(255, 235, 59, 0.4);
  user-select: none;
}

.countdown-text.go {
  color: #4caf50;
  text-shadow:
    0 0 20px rgba(76, 175, 80, 0.8),
    0 0 40px rgba(76, 175, 80, 0.4);
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
