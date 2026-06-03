<template>
  <div class="game-table">
    <div class="table-surface">
      <CommunityCards :cards="communityCards" />
      <template v-if="pot > 0">
        <div v-if="sidePots.length > 0" class="pots-container">
          <div class="pot pot-main">主池: {{ mainPotAmount }}</div>
          <div v-for="(sp, i) in sidePots" :key="i" class="pot pot-side">边池: {{ sp.amount }}</div>
        </div>
        <div v-else class="pot">底池: {{ pot }}</div>
      </template>
      <button
        v-if="winnerCanReveal"
        class="reveal-btn"
        type="button"
        @click="$emit('revealCards')"
      >
        亮牌
      </button>
      <div v-if="showdownMode && winningHandDescription" class="winning-hand-banner">
        <span class="winning-hand-icon">&#x1F3C6;</span>
        <span class="winning-hand-text">{{ winningHandDescription }}</span>
      </div>
    </div>
    <div class="seats">
      <PlayerSeat
        v-for="(player, displayIndex) in displayPlayers"
        :key="player.userId"
        :player="player"
        :is-me="player.userId === userId"
        :is-current-player="player.seatNumber === currentSeatNumber"
        :is-winner="winnerIds.includes(player.userId)"
        :disconnected="disconnectedPlayerIds?.has(player.userId) ?? false"
        :my-cards="getPlayerCards(player)"
        :emojis="getPlayerEmojis(player.userId)"
        :action-remaining-seconds="player.seatNumber === currentSeatNumber ? actionRemainingSeconds : null"
        :is-showdown-revealed="showdownMode && showdownPlayers?.has(player.userId) === true"
        :is-showdown-winner="showdownMode && winnerIds.includes(player.userId)"
        :showdown-hand-description="showdownPlayers?.get(player.userId)?.handDescription ?? ''"
        :style="getSeatStyle(displayIndex, displayPlayers.length)"
        @tip="$emit('tip', player)"
      />

      <div
        v-if="mySeatOverlayStyle"
        class="my-seat-overlay"
        :style="mySeatOverlayStyle"
      >
        <button
          v-if="showReadyButton"
          class="ready-btn"
          type="button"
          @click="$emit('ready')"
        >
          准备
        </button>
        <HandDisplay
          v-if="handHoleCards.length && handCommunityCards.length"
          :hole-cards="handHoleCards"
          :community-cards="handCommunityCards"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import PlayerSeat from './PlayerSeat.vue';
import CommunityCards from './CommunityCards.vue';
import HandDisplay from './HandDisplay.vue';
import type { Card, GamePlayer, SidePot } from '../../../../shared/types/game.types';
import type { RoomPlayer } from '../../../../shared/types/room.types';

interface ShowdownPlayerData {
  cards: Card[];
  handDescription: string;
}

export type TablePlayer = Omit<RoomPlayer, 'status'> & {
  status: RoomPlayer['status'] | GamePlayer['status'];
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
};

const props = defineProps<{
  players: TablePlayer[];
  communityCards: Card[];
  pot: number;
  mainPotAmount: number;
  sidePots: SidePot[];
  currentPlayerIndex: number;
  userId: string;
  myCards: Card[];
  winnerId?: string;
  winnerIds?: string[];
  disconnectedPlayerIds?: Set<string>;
  activeEmojis: { id: number; userId: string; emoji: string }[];
  actionRemainingSeconds?: number | null;
  showReadyButton?: boolean;
  handHoleCards?: Card[];
  handCommunityCards?: Card[];
  showdownMode?: boolean;
  showdownPlayers?: Map<string, ShowdownPlayerData>;
  winningHandDescription?: string;
  winnerCanReveal?: boolean;
}>();

const winnerIds = computed(() => props.winnerIds || (props.winnerId ? [props.winnerId] : []));

defineEmits<{
  (e: 'tip', player: TablePlayer): void;
  (e: 'ready'): void;
  (e: 'revealCards'): void;
}>();

const handHoleCards = computed(() => props.handHoleCards ?? []);
const handCommunityCards = computed(() => props.handCommunityCards ?? []);

function getPlayerEmojis(userId: string) {
  return props.activeEmojis.filter(e => e.userId === userId);
}

function getPlayerCards(player: TablePlayer): Card[] {
  if (player.userId === props.userId) return props.myCards;
  const showdown = props.showdownPlayers?.get(player.userId);
  return showdown?.cards ?? [];
}

/**
 * 当前操作玩家的座位号
 * 需要将 currentPlayerIndex（原始数组索引）映射到 displayPlayers 中的显示位置
 */
const currentSeatNumber = computed(() => {
  if (props.currentPlayerIndex < 0 || props.currentPlayerIndex >= props.players.length) return -1;

  // 获取当前玩家的 userId
  const currentUserId = props.players[props.currentPlayerIndex]?.userId;
  if (!currentUserId) return -1;

  // 在 displayPlayers 中找到该玩家并返回其座位号
  const displayIndex = displayPlayers.value.findIndex(p => p.userId === currentUserId);
  if (displayIndex === -1) return -1;

  return displayPlayers.value[displayIndex]?.seatNumber ?? -1;
});

/**
 * Reorder players so "me" is always first (display position = bottom).
 * Other players follow in clockwise seat-number order from my left.
 */
const displayPlayers = computed(() => {
  const myIndex = props.players.findIndex(p => p.userId === props.userId);
  if (myIndex === -1) return props.players;

  const total = props.players.length;
  const result: TablePlayer[] = [];
  for (let i = 0; i < total; i++) {
    result.push(props.players[(myIndex + i) % total]);
  }
  return result;
});

const mySeatOverlayStyle = computed(() => {
  const myDisplayIndex = displayPlayers.value.findIndex(p => p.userId === props.userId);
  if (myDisplayIndex === -1) return null;

  return getSeatOverlayStyle(myDisplayIndex, displayPlayers.value.length);
});

/**
 * Position seats in a first-person oval layout.
 * Index 0 (me) = bottom center (6 o'clock).
 * Others spread clockwise: left-bottom, left, left-top, top, right-top, right, right-bottom.
 */
function getSeatStyle(displayIndex: number, total: number) {
  if (total <= 1) {
    return { left: '50%', top: 'var(--my-seat-top)', transform: 'translate(-50%, -50%)' };
  }

  // Me (index 0) is always at bottom center
  if (displayIndex === 0) {
    return { left: '50%', top: 'var(--my-seat-top)', transform: 'translate(-50%, -50%)' };
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

function getSeatOverlayStyle(displayIndex: number, total: number) {
  const seatStyle = getSeatStyle(displayIndex, total);
  return {
    ...seatStyle,
    top: `calc(${seatStyle.top} + var(--my-seat-overlay-offset))`,
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
  --my-seat-top: 88%;
  --my-seat-overlay-offset: 82px;
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

.pots-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.pot-side {
  font-size: 13px;
  opacity: 0.85;
}

.reveal-btn {
  padding: 6px 20px;
  font-size: 14px;
  font-weight: bold;
  color: #fff;
  background: linear-gradient(135deg, #ff9800, #f57c00);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 3px 8px rgba(255, 152, 0, 0.4);
  animation: reveal-btn-pulse 1.5s ease-in-out infinite;
}

.reveal-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 12px rgba(255, 152, 0, 0.6);
}

@keyframes reveal-btn-pulse {
  0%, 100% { box-shadow: 0 3px 8px rgba(255, 152, 0, 0.4); }
  50% { box-shadow: 0 3px 16px rgba(255, 152, 0, 0.7); }
}

.winning-hand-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  background: rgba(255, 215, 0, 0.15);
  border: 1px solid rgba(255, 215, 0, 0.5);
  border-radius: 20px;
  animation: banner-fade-in 0.6s ease-out;
}

.winning-hand-icon {
  font-size: 16px;
}

.winning-hand-text {
  color: #ffd700;
  font-size: 14px;
  font-weight: bold;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
}

@keyframes banner-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.seats {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.my-seat-overlay {
  position: absolute;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: auto;
  gap: 6px;
  width: max-content;
  max-width: min(280px, 80vw);
}

.ready-btn {
  min-height: 38px;
  padding: 8px 28px;
  font-size: 15px;
  font-weight: bold;
  color: #fff;
  background: linear-gradient(135deg, #4caf50, #388e3c);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

.ready-btn:hover {
  transform: scale(1.04);
  box-shadow: 0 6px 16px rgba(76, 175, 80, 0.6);
}

.ready-btn:active {
  transform: scale(0.98);
}

@media (orientation: landscape) and (max-width: 900px) {
  .game-table {
    height: 100%;
    min-height: 0;
    max-width: none;
    --my-seat-top: 76%;
    --my-seat-overlay-offset: 52px;
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

  .pot-side {
    font-size: 11px;
  }

  .winning-hand-banner {
    padding: 4px 10px;
  }

  .winning-hand-icon {
    font-size: 13px;
  }

  .winning-hand-text {
    font-size: 11px;
  }

  .my-seat-overlay {
    gap: 4px;
  }

  .ready-btn {
    min-height: 30px;
    padding: 5px 18px;
    font-size: 12px;
    border-radius: 6px;
  }

  .reveal-btn {
    padding: 4px 14px;
    font-size: 12px;
  }
}

@media (max-height: 430px) and (orientation: landscape) {
  .game-table {
    --my-seat-top: 72%;
    --my-seat-overlay-offset: 46px;
  }

  .table-surface {
    width: 50%;
    height: 36%;
  }
}
</style>
