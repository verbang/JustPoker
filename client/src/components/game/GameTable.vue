<template>
  <div class="game-table">
    <div class="table-surface">
      <CommunityCards :cards="communityCards" />
      <div class="pot" v-if="pot > 0">底池: {{ pot }}</div>
    </div>
    <div class="seats">
      <PlayerSeat
        v-for="(player, displayIndex) in displayPlayers"
        :key="player.userId"
        :player="player"
        :is-me="player.userId === userId"
        :is-current-player="player.seatNumber === currentSeatNumber"
        :my-cards="player.userId === userId ? myCards : []"
        :emojis="getPlayerEmojis(player.userId)"
        :style="getSeatStyle(displayIndex, displayPlayers.length)"
        @tip="$emit('tip', player)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import PlayerSeat from './PlayerSeat.vue';
import CommunityCards from './CommunityCards.vue';

const props = defineProps<{
  players: any[];
  communityCards: any[];
  pot: number;
  currentPlayerIndex: number;
  userId: string;
  myCards: any[];
  activeEmojis: { id: number; userId: string; emoji: string }[];
}>();

defineEmits<{
  (e: 'tip', player: any): void;
}>();

function getPlayerEmojis(userId: string) {
  return props.activeEmojis.filter(e => e.userId === userId);
}

/**
 * The seat number of the current acting player from the game state.
 * We need to map currentPlayerIndex (array index in sorted seat order)
 * back to seat number.
 */
const currentSeatNumber = computed(() => {
  if (props.currentPlayerIndex < 0 || props.currentPlayerIndex >= props.players.length) return -1;
  return props.players[props.currentPlayerIndex]?.seatNumber ?? -1;
});

/**
 * Reorder players so "me" is always first (display position = bottom).
 * Other players follow in clockwise seat-number order from my left.
 */
const displayPlayers = computed(() => {
  const myIndex = props.players.findIndex(p => p.userId === props.userId);
  if (myIndex === -1) return props.players;

  const total = props.players.length;
  const result = [];
  for (let i = 0; i < total; i++) {
    result.push(props.players[(myIndex + i) % total]);
  }
  return result;
});

/**
 * Position seats in a first-person oval layout.
 * Index 0 (me) = bottom center (6 o'clock).
 * Others spread clockwise: left-bottom, left, left-top, top, right-top, right, right-bottom.
 */
function getSeatStyle(displayIndex: number, total: number) {
  if (total <= 1) {
    return { left: '50%', top: '85%', transform: 'translate(-50%, -50%)' };
  }

  // Me (index 0) is always at bottom center
  if (displayIndex === 0) {
    return { left: '50%', top: '88%', transform: 'translate(-50%, -50%)' };
  }

  // Other players spread along the top arc (from left to right)
  const otherCount = total - 1;
  // Spread from -70° to +70° around the top (12 o'clock = -90° in standard math)
  const spreadAngle = 150; // degrees total spread
  const startAngle = -90 - spreadAngle / 2; // left side
  const stepAngle = spreadAngle / (otherCount - 1 || 1);
  const angle = (startAngle + stepAngle * (displayIndex - 1)) * (Math.PI / 180);

  const radiusX = 44;
  const radiusY = 40;
  const x = 50 + radiusX * Math.cos(angle);
  const y = 50 + radiusY * Math.sin(angle);

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
  max-width: min(900px, 100%);
  height: min(560px, 100%);
  min-height: 360px;
  margin: 0 auto;
}

.table-surface {
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 55%;
  height: 38%;
  background: #1b5e20;
  border-radius: 50%;
  border: 8px solid #4e342e;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
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

@media (orientation: landscape) and (max-width: 900px) {
  .game-table {
    height: 100%;
    min-height: 0;
    max-width: none;
  }

  .table-surface {
    top: 48%;
    width: 54%;
    height: 42%;
    border-width: 5px;
    gap: 5px;
  }

  .pot {
    font-size: 13px;
  }
}

@media (max-height: 430px) and (orientation: landscape) {
  .table-surface {
    width: 50%;
    height: 36%;
  }
}
</style>
