<template>
  <div v-if="visible" class="reconnect-overlay">
    <div class="reconnect-card">
      <div v-if="reconnectFailed" class="reconnect-failed">
        <div class="icon">&#x26A0;</div>
        <h3>重连超时</h3>
        <p>连接已断开，请检查网络连接</p>
        <button class="home-btn" @click="$emit('goHome')">返回首页</button>
      </div>
      <div v-else class="reconnect-progress">
        <div class="spinner"></div>
        <h3 v-if="isReconnecting">正在重连... ({{ attempt }})</h3>
        <h3 v-else>连接断开</h3>
        <p>{{ countdown }} 秒后自动弃牌</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';

const props = defineProps<{
  visible: boolean;
  isReconnecting: boolean;
  attempt: number;
  reconnectFailed: boolean;
  timeoutMs: number;
}>();

defineEmits<{
  goHome: [];
}>();

const countdown = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

watch(() => props.visible, (v) => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (v && !props.reconnectFailed) {
    countdown.value = Math.ceil(props.timeoutMs / 1000);
    timer = setInterval(() => {
      countdown.value = Math.max(0, countdown.value - 1);
    }, 1000);
  }
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<style scoped>
.reconnect-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
}

.reconnect-card {
  background: #1e293b;
  border-radius: 16px;
  padding: 40px 48px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  min-width: 280px;
}

.icon {
  font-size: 48px;
  margin-bottom: 12px;
}

h3 {
  margin: 0 0 8px;
  font-size: 20px;
  color: #f1f5f9;
}

p {
  margin: 0 0 20px;
  font-size: 14px;
  color: #94a3b8;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 16px;
  border: 4px solid rgba(255, 255, 255, 0.15);
  border-top-color: #60a5fa;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.home-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  background: #3b82f6;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.home-btn:hover {
  background: #2563eb;
}
</style>
