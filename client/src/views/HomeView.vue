<template>
  <div class="home">
    <h1>JustPoker</h1>
    <SoundToggle />
    <div class="actions">
      <CreateRoom v-if="showCreate" />
      <JoinRoom v-if="showJoin" />
      <div v-if="!showCreate && !showJoin">
        <button @click="showCreate = true">创建房间</button>
        <button @click="showJoin = true">加入房间</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import CreateRoom from '../components/home/CreateRoom.vue';
import JoinRoom from '../components/home/JoinRoom.vue';
import SoundToggle from '../components/common/SoundToggle.vue';

const showCreate = ref(false);
const showJoin = ref(false);
</script>
