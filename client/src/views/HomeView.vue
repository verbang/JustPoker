<template>
  <div class="home">
    <!-- 音效开关 -->
    <div class="sound-toggle">
      <SoundToggle />
    </div>

    <!-- 品牌区域 -->
    <div class="brand">
      <div class="brand-logo">JUSTPOKER</div>
      <div class="brand-subtitle">与好友轻松对战</div>
    </div>

    <!-- 操作区域 -->
    <div class="actions">
      <!-- 创建房间 - 入口卡片 -->
      <div
        v-if="activeForm !== 'create'"
        class="action-card"
        @click="activeForm = 'create'"
      >
        <div class="action-card-title">创建房间</div>
        <div class="action-card-desc">设定规则，邀请好友加入</div>
      </div>

      <!-- 创建房间 - 表单 -->
      <CreateRoom v-else @back="activeForm = null" />

      <!-- 加入房间 - 入口卡片 -->
      <div
        v-if="activeForm !== 'join'"
        class="action-card"
        @click="activeForm = 'join'"
      >
        <div class="action-card-title">加入房间</div>
        <div class="action-card-desc">输入房间号，与朋友一起玩</div>
      </div>

      <!-- 加入房间 - 表单 -->
      <JoinRoom v-else @back="activeForm = null" />
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-text">JustPoker &copy; 2026</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import CreateRoom from '../components/home/CreateRoom.vue';
import JoinRoom from '../components/home/JoinRoom.vue';
import SoundToggle from '../components/common/SoundToggle.vue';

const activeForm = ref<'create' | 'join' | null>(null);
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 48px 16px 32px;
}

.sound-toggle {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 10;
}

.brand {
  text-align: center;
  margin-bottom: 48px;
}

.brand-logo {
  font-family: 'Russo One', sans-serif;
  font-size: 36px;
  color: var(--on-surface);
  letter-spacing: 2px;
  margin-bottom: 8px;
}

.brand-subtitle {
  font-size: 14px;
  color: var(--on-surface-variant);
  letter-spacing: 1px;
}

.actions {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-card {
  background: var(--surface-container);
  border-radius: var(--radius-card);
  padding: 24px;
  cursor: pointer;
  transition: background-color 200ms;
  border: 1px solid var(--outline);
}

.action-card:hover {
  background: var(--surface-container-high);
}

.action-card:active {
  transform: scale(0.97);
}

.action-card-title {
  font-family: 'Russo One', sans-serif;
  font-size: 18px;
  color: var(--on-surface);
  margin-bottom: 4px;
}

.action-card-desc {
  font-size: 13px;
  color: var(--on-surface-variant);
}

.footer {
  margin-top: auto;
  padding-top: 48px;
  text-align: center;
}

.footer-text {
  font-size: 12px;
  color: var(--on-surface-variant);
  opacity: 0.5;
}
</style>
