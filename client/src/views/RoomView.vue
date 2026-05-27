<template>
  <div class="room">
    <h2>房间: {{ roomCode }}</h2>
    <!-- Game content will be added here -->
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const roomCode = computed(() => route.params.roomCode as string);
</script>
