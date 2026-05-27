<template>
  <div
    class="player-seat"
    :class="{
      'is-me': isMe,
      'is-dealer': player.isDealer,
      'is-current': isCurrentPlayer,
      'is-folded': player.status === 'folded',
      'is-out': player.status === 'out'
    }"
    @click="handleClick"
  >
    <div class="avatar">
      <span class="nickname" @click="handleTip">{{ player.nickname }}</span>
      <span class="chips">{{ player.chips }}</span>
    </div>
    <div v-if="isMe && myCards && myCards.length" class="cards">
      <div v-for="card in myCards" :key="`${card.suit}-${card.rank}`" class="card">
        {{ card.rank }}{{ getSuitSymbol(card.suit) }}
      </div>
    </div>
    <div v-if="player.isDealer" class="dealer-badge">D</div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  player: {
    userId: string;
    nickname: string;
    chips: number;
    status: string;
    isDealer: boolean;
  };
  isMe: boolean;
  isCurrentPlayer: boolean;
  myCards?: any[];
}>();

const emit = defineEmits<{
  (e: 'tip'): void;
}>();

function getSuitSymbol(suit: string): string {
  const symbols: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  return symbols[suit] || '';
}

function handleClick() {
  // Handle click for seat selection if needed
}

function handleTip() {
  if (!props.isMe) {
    emit('tip');
  }
}
</script>

<style scoped>
.player-seat {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease;
}

.player-seat.is-me {
  border: 2px solid #4caf50;
}

.player-seat.is-current {
  border: 2px solid #ffeb3b;
  box-shadow: 0 0 10px rgba(255, 235, 59, 0.5);
}

.player-seat.is-folded {
  opacity: 0.5;
}

.player-seat.is-out {
  opacity: 0.3;
}

.avatar {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.nickname {
  font-size: 14px;
  font-weight: bold;
  color: #fff;
  cursor: pointer;
}

.nickname:hover {
  text-decoration: underline;
}

.chips {
  font-size: 12px;
  color: #ffd700;
}

.cards {
  display: flex;
  gap: 2px;
}

.card {
  width: 30px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 12px;
  font-weight: bold;
}

.dealer-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  background: #ff9800;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
}
</style>
