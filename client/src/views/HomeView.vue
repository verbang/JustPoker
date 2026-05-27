<template>
  <div class="home">
    <h1>JustPoker</h1>
    <div class="actions">
      <button @click="showCreate = true">创建房间</button>
      <button @click="showJoin = true">加入房间</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const showCreate = ref(false);
const showJoin = ref(false);
</script>
