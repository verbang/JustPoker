<template>
  <div class="game-table">
    <div class="table-surface">
      <CommunityCards :cards="communityCards" />
      <div class="pot">底池: {{ pot }}</div>
    </div>
    <div class="seats">
      <PlayerSeat
        v-for="(player, index) in players"
        :key="player.userId"
        :player="player"
        :is-me="player.userId === userId"
        :is-current-player="index === currentPlayerIndex"
        :my-cards="player.userId === userId ? myCards : []"
        :style="getSeatStyle(index, players.length)"
        @tip="$emit('tip', player)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import PlayerSeat from './PlayerSeat.vue';
import CommunityCards from './CommunityCards.vue';

defineProps<{
  players: any[];
  communityCards: any[];
  pot: number;
  currentPlayerIndex: number;
  userId: string;
  myCards: any[];
}>();

defineEmits<{
  (e: 'tip', player: any): void;
}>();

function getSeatStyle(index: number, total: number) {
  const angle = (360 / total) * index - 90;
  const radius = 40;
  const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
  const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)',
  };
}
</script>

<style scoped>
.game-table {
  position: relative;
  width: 100%;
  max-width: 800px;
  height: 500px;
  margin: 0 auto;
}

.table-surface {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60%;
  height: 40%;
  background: #1b5e20;
  border-radius: 50%;
  border: 8px solid #4e342e;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.pot {
  color: #ffd700;
  font-size: 16px;
  font-weight: bold;
}

.seats {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
