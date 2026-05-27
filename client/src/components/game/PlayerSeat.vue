<template>
  <div
    class="player-seat"
    :class="{
      'is-me': isMe,
      'is-current': isCurrentPlayer,
      'is-folded': player.status === 'folded',
      'is-out': player.status === 'out'
    }"
  >
    <!-- Floating emojis -->
    <div class="emoji-container">
      <transition-group name="emoji-float">
        <span
          v-for="e in emojis"
          :key="e.id"
          class="floating-emoji"
        >{{ e.emoji }}</span>
      </transition-group>
    </div>

    <!-- Position badges (D / SB / BB) -->
    <div class="position-badges">
      <span v-if="player.isDealer" class="badge dealer">D</span>
      <span v-if="player.isSmallBlind" class="badge sb">SB</span>
      <span v-if="player.isBigBlind" class="badge bb">BB</span>
    </div>

    <div class="avatar">
      <div class="avatar-circle" :class="{ 'active': isCurrentPlayer }">
        {{ player.nickname.charAt(0) }}
      </div>
      <span class="nickname" @click="handleTip">{{ player.nickname }}</span>
      <span class="chips">{{ player.chips }}</span>
    </div>

    <!-- My cards (face up) -->
    <div v-if="isMe && myCards && myCards.length" class="cards">
      <div
        v-for="card in myCards"
        :key="`${card.suit}-${card.rank}`"
        class="card"
        :class="getSuitClass(card.suit)"
      >
        <span class="card-rank">{{ card.rank }}</span>
        <span class="card-suit">{{ getSuitSymbol(card.suit) }}</span>
      </div>
    </div>
    <!-- Other players' cards (face down) during gameplay -->
    <div v-else-if="player.status === 'playing' && !isMe" class="cards">
      <div class="card card-back"></div>
      <div class="card card-back"></div>
    </div>
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
    isSmallBlind?: boolean;
    isBigBlind?: boolean;
  };
  isMe: boolean;
  isCurrentPlayer: boolean;
  myCards?: any[];
  emojis?: { id: number; userId: string; emoji: string }[];
}>();

const emit = defineEmits<{
  (e: 'tip'): void;
}>();

function getSuitSymbol(suit: string): string {
  const symbols: Record<string, string> = {
    hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
  };
  return symbols[suit] || '';
}

function getSuitClass(suit: string): string {
  if (suit === 'hearts' || suit === 'diamonds') return 'suit-red';
  return 'suit-black';
}

function handleTip() {
  if (!props.isMe) emit('tip');
}
</script>

<style scoped>
.player-seat {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.55);
  transition: all 0.3s ease;
  min-width: 72px;
}

.player-seat.is-me {
  border: 2px solid #4caf50;
  background: rgba(0, 0, 0, 0.7);
}

.player-seat.is-current {
  border: 2px solid #ffeb3b;
  box-shadow: 0 0 12px rgba(255, 235, 59, 0.5);
}

.player-seat.is-folded {
  opacity: 0.45;
}

.player-seat.is-out {
  opacity: 0.3;
}

/* Position badges */
.position-badges {
  display: flex;
  gap: 4px;
  margin-bottom: 2px;
}

.badge {
  font-size: 10px;
  font-weight: bold;
  padding: 1px 5px;
  border-radius: 4px;
  color: #fff;
  line-height: 1.3;
}

.badge.dealer {
  background: #ff9800;
}

.badge.sb {
  background: #2196f3;
}

.badge.bb {
  background: #f44336;
}

/* Emoji container */
.emoji-container {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 4px;
  pointer-events: none;
  min-width: 40px;
}

.floating-emoji {
  font-size: 28px;
  animation: emoji-rise 3s ease-out forwards;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}

@keyframes emoji-rise {
  0%   { opacity: 1; transform: translateY(0) scale(1); }
  70%  { opacity: 1; transform: translateY(-30px) scale(1.1); }
  100% { opacity: 0; transform: translateY(-60px) scale(0.8); }
}

.emoji-float-enter-active { animation: emoji-rise 3s ease-out forwards; }
.emoji-float-leave-active { transition: opacity 0.3s; }
.emoji-float-leave-to { opacity: 0; }

/* Avatar */
.avatar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #37474f, #263238);
  border: 2px solid #546e7a;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s;
}

.avatar-circle.active {
  border-color: #ffeb3b;
  box-shadow: 0 0 8px rgba(255, 235, 59, 0.6);
}

.nickname {
  font-size: 12px;
  font-weight: bold;
  color: #fff;
  cursor: pointer;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nickname:hover {
  text-decoration: underline;
}

.chips {
  font-size: 11px;
  color: #ffd700;
  font-weight: bold;
}

/* Cards */
.cards {
  display: flex;
  gap: 3px;
  margin-top: 2px;
}

.card {
  width: 30px;
  height: 42px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #bbb;
  border-radius: 4px;
  font-weight: bold;
  line-height: 1;
}

.card-rank { font-size: 13px; }
.card-suit { font-size: 11px; }

.card.suit-red { color: #d32f2f; }
.card.suit-black { color: #212121; }

.card-back {
  background: linear-gradient(135deg, #1565c0, #0d47a1);
  border-color: #0d47a1;
}
</style>
