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

    <!-- Winner crown -->
    <div v-if="isWinner" class="crown-container">
      <span class="crown">&#x1F451;</span>
    </div>

    <div class="player-info">
      <span class="nickname" @click="handleTip">{{ player.nickname }}</span>
      <span class="chips">&#x1F4B0; {{ player.chips }}</span>
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
  isWinner?: boolean;
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
  min-width: 80px;
  max-width: 110px;
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

/* Winner crown */
.crown-container {
  position: absolute;
  top: -28px;
  left: 50%;
  transform: translateX(-50%);
  animation: crown-bounce 1s ease-in-out infinite;
  pointer-events: none;
  z-index: 10;
}

.crown {
  font-size: 28px;
  filter: drop-shadow(0 2px 6px rgba(255, 215, 0, 0.8));
}

@keyframes crown-bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-6px); }
}

/* Player info */
.player-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.nickname {
  font-size: 16px;
  font-weight: bold;
  color: #fff;
  cursor: pointer;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
}

.nickname:hover {
  text-decoration: underline;
}

.chips {
  font-size: 13px;
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

@media (orientation: landscape) and (max-width: 900px) {
  .player-seat {
    gap: 2px;
    min-width: 64px;
    max-width: 90px;
    padding: 4px 6px;
    border-radius: 7px;
  }

  .player-seat.is-me,
  .player-seat.is-current {
    border-width: 1px;
  }

  .position-badges {
    gap: 2px;
    margin-bottom: 0;
  }

  .badge {
    font-size: 8px;
    padding: 1px 3px;
  }

  .player-info {
    gap: 1px;
  }

  .nickname {
    max-width: 80px;
    font-size: 13px;
  }

  .chips {
    font-size: 11px;
  }

  .cards {
    gap: 2px;
    margin-top: 1px;
  }

  .card {
    width: 22px;
    height: 31px;
    border-radius: 3px;
  }

  .card-rank {
    font-size: 10px;
  }

  .card-suit {
    font-size: 9px;
  }

  .emoji-container {
    top: -28px;
  }

  .floating-emoji {
    font-size: 22px;
  }

  .crown-container {
    top: -22px;
  }

  .crown {
    font-size: 22px;
  }
}
</style>
