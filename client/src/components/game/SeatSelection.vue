<template>
  <div class="seat-selection">
    <h3>选择座位</h3>
    <div class="table-container">
      <!-- Center table -->
      <div class="table-surface">
        <span class="table-label">点击空位入座</span>
      </div>
      <!-- Seats arranged clockwise around the table -->
      <button
        v-for="seat in seats"
        :key="seat.number"
        class="seat-node"
        :class="{
          'available': seat.isAvailable,
          'occupied': !seat.isAvailable,
          'my-seat': seat.isMySeat
        }"
        :disabled="!seat.isAvailable"
        :style="getSeatStyle(seat.number)"
        @click="selectSeat(seat.number)"
      >
        <span class="seat-number">{{ seat.number }}</span>
        <span v-if="seat.player" class="seat-player">{{ seat.player.nickname }}</span>
        <span v-else class="seat-empty">空位</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  players: any[];
  userId: string;
  maxSeats: number;
}>();

const emit = defineEmits<{
  (e: 'select', seatNumber: number): void;
}>();

const seats = computed(() => {
  return Array.from({ length: props.maxSeats }, (_, i) => {
    const seatNumber = i + 1;
    const player = props.players.find(p => p.seatNumber === seatNumber);
    return {
      number: seatNumber,
      player,
      isAvailable: !player,
      isMySeat: player?.userId === props.userId
    };
  });
});

/**
 * Position seats clockwise around the table.
 * Seat 1 at bottom (6 o'clock), seat 2 at left-bottom, etc.
 * Angle: seat N is at (N-1) * (360/maxSeats) degrees clockwise from bottom.
 */
function getSeatStyle(seatNumber: number) {
  const angle = ((seatNumber - 1) * (360 / props.maxSeats) - 90) * (Math.PI / 180);
  const radiusX = 44;
  const radiusY = 42;
  const x = 50 + radiusX * Math.cos(angle);
  const y = 50 + radiusY * Math.sin(angle);
  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: 'translate(-50%, -50%)',
  };
}

function selectSeat(seatNumber: number) {
  emit('select', seatNumber);
}
</script>

<style scoped>
.seat-selection {
  color: #fff;
  width: 100%;
  max-width: 700px;
}

.seat-selection h3 {
  margin: 0 0 12px 0;
  text-align: center;
  color: #ffd700;
  font-size: 18px;
}

.table-container {
  position: relative;
  width: 100%;
  height: 420px;
}

.table-surface {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50%;
  height: 45%;
  background: #1b5e20;
  border-radius: 50%;
  border: 6px solid #4e342e;
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-label {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
}

.seat-node {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 70px;
  height: 56px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  font-family: inherit;
}

.seat-node.available {
  background: rgba(76, 175, 80, 0.35);
  border-color: #4caf50;
  color: #fff;
}

.seat-node.available:hover {
  background: rgba(76, 175, 80, 0.6);
  transform: translate(-50%, -50%) scale(1.1);
  box-shadow: 0 0 12px rgba(76, 175, 80, 0.5);
}

.seat-node.occupied {
  background: rgba(100, 100, 100, 0.4);
  border-color: #777;
  cursor: not-allowed;
  color: #ccc;
}

.seat-node.my-seat {
  background: rgba(33, 150, 243, 0.5);
  border-color: #2196f3;
  color: #fff;
}

.seat-number {
  font-size: 16px;
  font-weight: bold;
}

.seat-player {
  font-size: 10px;
  color: #ffd700;
  margin-top: 2px;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seat-empty {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
}
</style>
