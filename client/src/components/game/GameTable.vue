<template>
  <div class="game-table">
    <div class="table-surface">
      <CommunityCards :cards="communityCards" />
      <template v-if="pot > 0">
        <div v-if="sidePots.length > 0" class="pots-container">
          <div class="pot pot-main"><span class="pot-label">主池</span> ${{ mainPotAmount }}</div>
          <div v-for="(sp, i) in sidePots" :key="i" class="pot pot-side"><span class="pot-label">边池</span> ${{ sp.amount }}</div>
        </div>
        <div v-else class="pot"><span class="pot-label">底池</span> ${{ pot }}</div>
      </template>
      <button
        v-if="winnerCanReveal"
        class="reveal-btn"
        type="button"
        @click="$emit('revealCards')"
      >
        亮牌
      </button>
    </div>
    <div class="seats">
      <PlayerSeat
        v-for="(player, displayIndex) in displayPlayers"
        :key="player.userId"
        :player="player"
        :is-me="player.userId === userId"
        :is-current-player="player.userId === currentPlayerId"
        :is-winner="winnerIds.includes(player.userId)"
        :disconnected="disconnectedPlayerIds?.has(player.userId) ?? false"
        :my-cards="getPlayerCards(player)"
        :emojis="getPlayerEmojis(player.userId)"
        :action-remaining-seconds="player.userId === currentPlayerId ? actionRemainingSeconds : null"
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
        <HandDisplay
          v-if="showHandDisplay"
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

export type TablePlayer = {
  id?: string;
  roomId?: string;
  userId: string;
  nickname: string;
  seatNumber: number | null;
  chips: number;
  status: RoomPlayer['status'] | GamePlayer['status'];
  joinedAt?: Date;
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
  currentPlayerId?: string | null;
  userId: string;
  myCards: Card[];
  winnerId?: string;
  winnerIds?: string[];
  disconnectedPlayerIds?: Set<string>;
  activeEmojis: { id: number; userId: string; emoji: string }[];
  actionRemainingSeconds?: number | null;
  handHoleCards?: Card[];
  handCommunityCards?: Card[];
  showdownMode?: boolean;
  showdownPlayers?: Map<string, ShowdownPlayerData>;
  winnerCanReveal?: boolean;
}>();

const winnerIds = computed(() => props.winnerIds || (props.winnerId ? [props.winnerId] : []));

defineEmits<{
  (e: 'tip', player: TablePlayer): void;
  (e: 'revealCards'): void;
}>();

const handHoleCards = computed(() => props.handHoleCards ?? []);
const handCommunityCards = computed(() => props.handCommunityCards ?? []);
const showHandDisplay = computed(() => {
  return !props.showdownMode && handHoleCards.value.length > 0 && handCommunityCards.value.length > 0;
});

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

interface SeatPosition {
  left: number;
  top: number;
}

function createSeatStyle(position: SeatPosition) {
  return {
    left: `${position.left}%`,
    top: `${position.top}%`,
    transform: 'translate(-50%, -50%) scale(var(--player-seat-scale, 1))',
  };
}

function getArcSeatPosition(
  order: number,
  count: number,
  startDeg: number,
  endDeg: number,
  radiusX: number,
  radiusY: number,
  centerX: number,
  centerY: number,
): SeatPosition {
  const ratio = count <= 1 ? 0.5 : order / (count - 1);
  const angle = (startDeg + (endDeg - startDeg) * ratio) * (Math.PI / 180);

  return {
    left: centerX + radiusX * Math.cos(angle),
    top: centerY + radiusY * Math.sin(angle),
  };
}

const portraitSeatPositions: Record<number, SeatPosition[]> = {
  2: [
    { left: 50, top: 17 },
  ],
  3: [
    { left: 17, top: 37 },
    { left: 83, top: 37 },
  ],
  4: [
    { left: 16, top: 47 },
    { left: 50, top: 17 },
    { left: 84, top: 47 },
  ],
  5: [
    { left: 16, top: 50 },
    { left: 28, top: 23 },
    { left: 72, top: 23 },
    { left: 84, top: 50 },
  ],
  6: [
    { left: 14, top: 55 },
    { left: 20, top: 31 },
    { left: 50, top: 17 },
    { left: 80, top: 31 },
    { left: 86, top: 55 },
  ],
  7: [
    { left: 13, top: 58 },
    { left: 17, top: 38 },
    { left: 37, top: 19 },
    { left: 63, top: 19 },
    { left: 83, top: 38 },
    { left: 87, top: 58 },
  ],
  8: [
    { left: 13, top: 60 },
    { left: 14, top: 42 },
    { left: 29, top: 23 },
    { left: 50, top: 16 },
    { left: 71, top: 23 },
    { left: 86, top: 42 },
    { left: 87, top: 60 },
  ],
  9: [
    { left: 13, top: 62 },
    { left: 13, top: 47 },
    { left: 22, top: 30 },
    { left: 39, top: 19 },
    { left: 61, top: 19 },
    { left: 78, top: 30 },
    { left: 87, top: 47 },
    { left: 87, top: 62 },
  ],
  10: [
    { left: 13, top: 63 },
    { left: 13, top: 50 },
    { left: 18, top: 36 },
    { left: 31, top: 24 },
    { left: 50, top: 17 },
    { left: 69, top: 24 },
    { left: 82, top: 36 },
    { left: 87, top: 50 },
    { left: 87, top: 63 },
  ],
  11: [
    { left: 13, top: 64 },
    { left: 13, top: 52 },
    { left: 16, top: 39 },
    { left: 27, top: 27 },
    { left: 41, top: 19 },
    { left: 59, top: 19 },
    { left: 73, top: 27 },
    { left: 84, top: 39 },
    { left: 87, top: 52 },
    { left: 87, top: 64 },
  ],
  12: [
    { left: 13, top: 65 },
    { left: 13, top: 54 },
    { left: 14, top: 42 },
    { left: 22, top: 31 },
    { left: 35, top: 22 },
    { left: 50, top: 17 },
    { left: 65, top: 22 },
    { left: 78, top: 31 },
    { left: 86, top: 42 },
    { left: 87, top: 54 },
    { left: 87, top: 65 },
  ],
};

/**
 * 第一人称牌桌座位布局。
 * displayIndex 0（自己）固定在底部，其余座位从左侧到右侧顺时针排列。
 */
function getSeatStyle(displayIndex: number, total: number) {
  if (total <= 1) {
    return {
      left: '50%',
      top: 'var(--my-seat-top)',
      transform: 'translate(-50%, -50%) scale(var(--player-seat-scale, 1))',
      '--player-seat-scale': 'var(--seat-scale)',
    };
  }

  // Me (index 0) is always at bottom center
  if (displayIndex === 0) {
    return {
      left: '50%',
      top: 'var(--my-seat-top)',
      transform: 'translate(-50%, -50%) scale(var(--player-seat-scale, 1))',
      '--player-seat-scale': 'var(--seat-scale)',
    };
  }

  const otherCount = total - 1;
  const order = displayIndex - 1;

  const portraitPosition = portraitSeatPositions[total]?.[order];
  const desktopPosition = getArcSeatPosition(order, otherCount, 205, 335, 45, 40, 50, 52);

  return {
    ...createSeatStyle(desktopPosition),
    '--player-seat-scale': 'var(--other-seat-scale)',
    '--portrait-left': `${portraitPosition?.left ?? desktopPosition.left}%`,
    '--portrait-top': `${portraitPosition?.top ?? desktopPosition.top}%`,
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
  --my-seat-overlay-offset: 86px;
  --seat-scale: 1;
  --other-seat-scale: 1;
}

.game-table:has(.player-seat:nth-child(9)) {
  --other-seat-scale: 0.88;
}

.table-surface {
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 55%;
  height: 38%;
  background: linear-gradient(145deg, #0D2137, #132D4A);
  border-radius: 50%;
  border: 8px solid #1A1A1A;
  box-shadow:
    inset 0 0 42px rgba(0,0,0,0.42),
    inset 0 1px 14px rgba(148,163,184,0.08),
    0 0 0 2px #2C2C2C,
    var(--shadow-table);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.pot {
  font-size: 16px;
  font-weight: 700;
  color: var(--secondary);
  text-shadow: 0 0 8px rgba(202,138,4,0.3);
}

.pot-label {
  font-size: 12px;
  color: #A1A1AA;
  font-weight: 500;
  margin-right: 2px;
}

.pot-main,
.pot-side {
  color: var(--secondary);
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
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: rgba(202,138,4,0.18);
  border: 1px solid rgba(202,138,4,0.55);
  border-radius: 8px;
  cursor: pointer;
  transition: all 200ms;
  font-family: 'Chakra Petch', 'Noto Sans SC', sans-serif;
}

.reveal-btn:hover {
  background: rgba(202,138,4,0.28);
  filter: brightness(1.12);
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

@media (orientation: landscape) and (max-width: 900px) {
  .game-table {
    width: 100%;
    height: 100%;
    min-height: 0;
    max-width: none;
    margin: 0;
    --my-seat-top: 78%;
    --my-seat-overlay-offset: 48px;
    --seat-scale: 0.88;
    --other-seat-scale: 0.78;
  }

  .table-surface {
    top: 50%;
    width: 50%;
    height: 40%;
    border-width: 5px;
    gap: 6px;
  }

  .pot {
    font-size: 13px;
  }

  .pot-side {
    font-size: 11px;
  }

  .my-seat-overlay {
    gap: 4px;
  }

  .reveal-btn {
    padding: 4px 14px;
    font-size: 12px;
  }
}

@media (max-height: 430px) and (orientation: landscape) {
  .game-table {
    --my-seat-top: 76%;
    --my-seat-overlay-offset: 40px;
    --seat-scale: 0.82;
    --other-seat-scale: 0.72;
  }

  .table-surface {
    width: 46%;
    height: 34%;
  }
}

@media (orientation: portrait) and (max-width: 700px) {
  .game-table {
    min-height: 610px;
    --my-seat-top: 88%;
    --my-seat-overlay-offset: 64px;
    --seat-scale: 0.9;
    --other-seat-scale: 0.82;
  }

  .table-surface {
    top: 48%;
    width: 68%;
    height: 30%;
    border-width: 6px;
  }

  .game-table :deep(.player-seat) {
    left: var(--portrait-left) !important;
    top: var(--portrait-top) !important;
  }

  .game-table :deep(.player-seat.is-me) {
    left: 50% !important;
    top: var(--my-seat-top) !important;
  }
}

@media (orientation: portrait) and (max-width: 420px) {
  .game-table {
    min-height: 600px;
    --seat-scale: 0.86;
    --other-seat-scale: 0.76;
  }

  .table-surface {
    width: 72%;
    height: 29%;
  }
}
</style>
