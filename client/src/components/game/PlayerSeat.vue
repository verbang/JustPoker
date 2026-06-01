<template>
  <div
    class="player-seat"
    :class="{
      'is-me': isMe,
      'is-current': isCurrentPlayer,
      'is-folded': player.status === 'folded',
      'is-out': player.status === 'out',
      'is-showdown-winner': isShowdownWinner
    }"
  >
    <div
      v-if="isCurrentPlayer && actionProgress !== null"
      class="action-ring"
      :style="{ '--action-progress': `${actionProgress}deg` }"
    ></div>

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
      <span v-if="player.isDealer" class="badge dealer">BTN</span>
      <span v-if="player.isSmallBlind" class="badge sb">SB</span>
      <span v-if="player.isBigBlind" class="badge bb">BB</span>
    </div>

    <!-- Winner crown -->
    <div v-if="isWinner" class="crown-container">
      <span class="crown">&#x1F451;</span>
    </div>

    <div class="player-info">
      <span v-if="isCurrentPlayer && actionRemainingSeconds !== null" class="action-countdown">
        {{ actionRemainingSeconds }}
      </span>
      <span class="nickname" @click="handleTip">{{ player.nickname }}</span>
      <span class="chips">&#x1F4B0; {{ player.chips }}</span>
      <span v-if="seatStatusText" class="seat-status" :class="`status-${player.status}`">
        {{ seatStatusText }}
      </span>
    </div>

    <!-- 自己的牌（正面） -->
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
    <!-- 摊牌时其他玩家亮牌 -->
    <div v-else-if="isShowdownRevealed && myCards && myCards.length" class="cards">
      <div
        v-for="card in myCards"
        :key="`reveal-${card.suit}-${card.rank}`"
        class="card revealed-card"
        :class="getSuitClass(card.suit)"
      >
        <span class="card-rank">{{ card.rank }}</span>
        <span class="card-suit">{{ getSuitSymbol(card.suit) }}</span>
      </div>
    </div>
    <!-- 游戏中其他玩家牌背 -->
    <div v-else-if="player.status === 'playing' && !isMe" class="cards">
      <div class="card card-back"></div>
      <div class="card card-back"></div>
    </div>
    <!-- 摊牌时显示牌型 -->
    <div v-if="isShowdownRevealed && showdownHandDescription" class="showdown-hand-badge" :class="{ 'winner-badge': isShowdownWinner }">
      {{ showdownHandDescription }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Card, Suit } from '../../../../shared/types/game.types';

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
  myCards?: Card[];
  emojis?: { id: number; userId: string; emoji: string }[];
  actionRemainingSeconds?: number | null;
  isShowdownRevealed?: boolean;
  isShowdownWinner?: boolean;
  showdownHandDescription?: string;
}>();

const emit = defineEmits<{
  (e: 'tip'): void;
}>();

const seatStatusText = computed(() => {
  if (props.player.status === 'seated') return '未准备';
  if (props.player.status === 'ready') return '已准备';
  return '';
});

const actionProgress = computed(() => {
  if (!props.isCurrentPlayer || props.actionRemainingSeconds === null || props.actionRemainingSeconds === undefined) {
    return null;
  }

  return Math.max(0, Math.min(360, (props.actionRemainingSeconds / 60) * 360));
});

function getSuitSymbol(suit: Suit): string {
  const symbols: Record<Suit, string> = {
    hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
  };
  return symbols[suit] || '';
}

function getSuitClass(suit: Suit): string {
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
  pointer-events: auto;
  transition: all 0.3s ease;
  min-width: 80px;
  max-width: 110px;
  border: 2px solid transparent;
}

.player-seat.is-me {
  border: 2px solid #4caf50;
  background: rgba(0, 0, 0, 0.7);
}

.player-seat.is-current {
  border: 2px solid #FF513D;
  box-shadow:
    0 0 0 2px rgba(255, 81, 61, 0.4),
    0 0 18px rgba(255, 81, 61, 0.8);
}

.player-seat.is-folded {
  opacity: 0.45;
}

.player-seat.is-out {
  opacity: 0.3;
}

.player-seat.is-showdown-winner {
  border: 2px solid #ffd700;
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.4);
}

.player-seat.is-me.is-showdown-winner {
  border: 2px solid #4caf50;
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.4);
}

.action-ring {
  position: absolute;
  inset: -7px;
  border-radius: 14px;
  background:
    conic-gradient(from -90deg, #FF513D var(--action-progress), rgba(255, 81, 61, 0.08) 0);
  pointer-events: none;
  z-index: -1;
}

.action-ring::after {
  content: '';
  position: absolute;
  inset: 5px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.74);
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
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.action-countdown {
  position: absolute;
  top: -26px;
  left: 50%;
  min-width: 30px;
  padding: 2px 7px;
  transform: translateX(-50%);
  border: 2px solid #FF513D;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.82);
  color: #FF513D;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.25;
  text-align: center;
  box-shadow: 0 0 10px rgba(255, 81, 61, 0.55);
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

.seat-status {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  line-height: 1.4;
}

.seat-status.status-seated {
  color: #ffd54f;
  background: rgba(255, 213, 79, 0.16);
}

.seat-status.status-ready {
  color: #8ee59a;
  background: rgba(76, 175, 80, 0.18);
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

/* 摊牌亮牌样式 */
.revealed-card {
  animation: card-flip-in 0.4s ease-out;
}

@keyframes card-flip-in {
  from { opacity: 0; transform: rotateY(90deg); }
  to { opacity: 1; transform: rotateY(0deg); }
}

.showdown-hand-badge {
  font-size: 11px;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ccc;
  white-space: nowrap;
  margin-top: 2px;
}

.showdown-hand-badge.winner-badge {
  color: #ffd700;
  border-color: rgba(255, 215, 0, 0.5);
  background: rgba(255, 215, 0, 0.12);
  text-shadow: 0 0 6px rgba(255, 215, 0, 0.3);
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
  .player-seat.is-current,
  .player-seat.is-showdown-winner {
    border-width: 1px;
  }

  .action-ring {
    inset: -5px;
    border-radius: 10px;
  }

  .action-ring::after {
    inset: 4px;
    border-radius: 7px;
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

  .action-countdown {
    top: -21px;
    min-width: 24px;
    padding: 1px 5px;
    border-width: 1px;
    font-size: 12px;
  }

  .chips {
    font-size: 11px;
  }

  .seat-status {
    padding: 1px 4px;
    font-size: 9px;
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

  .showdown-hand-badge {
    font-size: 9px;
    padding: 1px 6px;
  }
}
</style>
