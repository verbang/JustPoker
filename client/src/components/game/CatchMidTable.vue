<template>
  <div class="catch-mid-table">
    <div class="table-header">
      <div>
        <div class="mode-title">抓兔</div>
        <div class="mode-meta">{{ phaseText }}</div>
      </div>
      <div class="round-badge">
        <span class="round-label">Round {{ state?.round ?? '-' }}</span>
        <span class="round-separator">·</span>
        <span class="score-label">{{ currentBetText }}</span>
      </div>
    </div>

    <div v-if="!state" class="empty-state">
      <div class="empty-title">等待开局</div>
      <div class="empty-meta">至少 3 名玩家准备后开始抓兔</div>
    </div>

    <template v-else>
      <section class="players-grid">
        <div
          v-for="player in state.players"
          :key="player.userId"
          class="player-panel"
          :class="{
            me: player.userId === userId,
            out: player.status === 'out',
            confirmed: isPlayerConfirmed(player)
          }"
        >
          <div
            v-if="shouldShowActionCountdown(player)"
            class="action-ring"
            :style="{ '--action-progress': `${actionProgress}deg` }"
          ></div>
          <div
            v-if="shouldShowActionCountdown(player)"
            class="action-mask"
            :style="{ '--action-progress': `${actionProgress}deg` }"
          ></div>

          <div class="emoji-container">
            <transition-group name="emoji-float">
              <span
                v-for="emoji in getPlayerEmojis(player.userId)"
                :key="emoji.id"
                class="floating-emoji"
              >{{ emoji.emoji }}</span>
            </transition-group>
          </div>
          <div class="player-row">
            <span class="nickname">{{ player.nickname }}</span>
            <span
              v-if="!shouldShowActionCountdown(player) && getPlayerConfirmLabel(player)"
              class="confirm-badge"
            >
              <span class="confirm-check">✓</span>
              {{ getPlayerConfirmLabel(player) }}
            </span>
          </div>
          <div class="player-status">
            <span>{{ getPlayerStatusText(player) }}</span>
          </div>
          <span v-if="shouldShowActionCountdown(player)" class="action-countdown">
            {{ actionRemainingSeconds }}
          </span>
        </div>
      </section>

      <section class="community-section">
        <div class="section-label">公共牌</div>
        <div class="card-row">
          <button
            v-for="(item, index) in state.communityCards"
            :key="`${index}-${getCardId(item.card)}`"
            type="button"
            class="playing-card community-card"
            :class="[
              getSuitClass(item.card),
              {
                active: isCurrentCommunityCard(index),
                dimmed: shouldDimCommunityCard(index)
              }
            ]"
            disabled
          >
            <template v-if="item.visible">
              <span class="rank">{{ getCardRank(item.card) }}</span>
              <span class="suit">{{ getSuitSymbol(item.card) }}</span>
            </template>
            <span v-else class="card-back-mark"></span>
          </button>
        </div>
      </section>

      <section class="hand-section">
        <div class="section-label">我的手牌</div>
        <div v-if="myPlayer" class="card-row hand-row">
          <button
            v-for="card in myPlayer.cards"
            :key="getCardId(card)"
            type="button"
            class="playing-card"
            :class="[
              getSuitClass(card),
              {
                selected: isCardSelected(card),
                dimmed: shouldDimHandCard(card)
              }
            ]"
            :disabled="!canSelectCards"
            @click="toggleCard(card)"
          >
            <span class="rank">{{ getCardRank(card) }}</span>
            <span class="suit">{{ getSuitSymbol(card) }}</span>
          </button>
        </div>
        <div v-else class="empty-meta">未加入本局</div>

        <div class="action-row">
          <button
            v-if="canSelectCards"
            class="primary-action"
            type="button"
            :disabled="selectedCardIds.length !== 2"
            @click="$emit('confirmCards', selectedCardIds)"
          >
            确认选牌
          </button>
          <button
            v-if="canConfirmReveal"
            class="primary-action"
            type="button"
            @click="$emit('confirmReveal')"
          >
            确认亮牌
          </button>
          <button
            v-if="canAdvance"
            class="continue-action"
            type="button"
            @click="$emit('advanceRound')"
          >
            继续
          </button>
        </div>
      </section>

      <section v-if="state.lastRoundResult" class="settlement-panel">
        <div class="section-label">Round {{ state.lastRoundResult.round }} 结算</div>
        <div class="result-grid">
          <div
            v-for="selection in state.lastRoundResult.selections"
            :key="selection.userId"
            class="result-item"
            :class="{ winner: isRoundWinner(selection.userId) }"
          >
            <div v-if="isRoundWinner(selection.userId)" class="settlement-crown">👑</div>
            <div class="result-player">{{ getNickname(selection.userId) }}</div>
            <div class="mini-cards">
              <span
                v-for="card in selection.compareCards"
                :key="`${selection.userId}-${getCardId(card)}`"
                class="mini-card"
                :class="getSuitClass(card)"
              >
                {{ getCardRank(card) }}{{ getSuitSymbol(card) }}
              </span>
            </div>
            <div class="hand-name">{{ selection.hand.description }}</div>
          </div>
        </div>

        <div v-if="state.lastRoundResult.settlement.payments.length" class="payments">
          <div
            v-for="payment in state.lastRoundResult.settlement.payments"
            :key="`${payment.fromUserId}-${payment.toUserId}-${payment.amount}`"
            class="payment-row"
          >
            {{ getNickname(payment.fromUserId) }} → {{ getNickname(payment.toUserId) }}
            <strong>${{ payment.amount }}</strong>
            <span v-if="payment.multiplier === 2" class="double-badge">炸弹x2</span>
          </div>
        </div>
        <div v-else class="empty-meta">本轮无人支付</div>
      </section>

      <section v-if="state.phase === 'game_over' || state.phase === 'game_draw' || state.phase === 'finished'" class="settlement-panel">
        <div class="section-label">本局结束</div>
        <div class="payment-row">出局玩家：{{ eliminatedText }}</div>
        <div class="payment-row">最终排名：{{ rankingText }}</div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import type { CatchMidCard, CatchMidGameState, CatchMidPlayer } from '../../../../shared/types/catch-mid.types';
import type { RoomPlayer } from '../../../../shared/types/room.types';

interface ActiveEmoji {
  id: number;
  userId: string;
  emoji: string;
}

const props = defineProps<{
  state: CatchMidGameState | null;
  players: RoomPlayer[];
  userId: string;
  activeEmojis: ActiveEmoji[];
}>();

defineEmits<{
  (e: 'confirmCards', cardIds: string[]): void;
  (e: 'confirmReveal'): void;
  (e: 'advanceRound'): void;
}>();

const selectedCardIds = ref<string[]>([]);
const localActionRemainingSeconds = ref<number | null>(null);
let actionCountdownTimer: ReturnType<typeof setInterval> | null = null;

const myPlayer = computed(() => props.state?.players.find(player => player.userId === props.userId) ?? null);
const actionRemainingSeconds = computed(() => localActionRemainingSeconds.value);
const actionProgress = computed(() => {
  if (actionRemainingSeconds.value === null) return 0;
  return Math.max(0, Math.min(360, (actionRemainingSeconds.value / 60) * 360));
});

const phaseText = computed(() => {
  if (!props.state) return '等待玩家准备';
  const map: Record<CatchMidGameState['phase'], string> = {
    waiting: '等待中',
    selecting: props.state.round === 4 ? '暗牌轮选牌' : '选牌中',
    round_result: '结算展示',
    confirm_reveal: '等待确认亮牌',
    finished: '可进入下一局',
    game_draw: '本局平局',
    game_over: '游戏结束',
  };
  return map[props.state.phase];
});

const currentBetText = computed(() => {
  const round = props.state?.round;
  if (!round) return '积分 -';
  return `积分 $${round}`;
});

const canSelectCards = computed(() => {
  if (!props.state || !myPlayer.value) return false;
  return props.state.phase === 'selecting'
    && props.state.round >= 1
    && props.state.round <= 4
    && !myPlayer.value.confirmed;
});

const canConfirmReveal = computed(() => {
  if (!props.state || !myPlayer.value) return false;
  return props.state.phase === 'confirm_reveal' && !myPlayer.value.revealConfirmed;
});

const canAdvance = computed(() => {
  if (!props.state || !myPlayer.value) return false;
  return props.state.phase === 'round_result'
    && props.state.round < 5
    && !myPlayer.value.confirmed;
});

const displayedSelectedCardIds = computed(() => {
  if (canSelectCards.value) return selectedCardIds.value;
  if (props.state?.phase === 'selecting' && myPlayer.value?.confirmed) {
    return myPlayer.value.selectedCardIds;
  }
  return selectedCardIds.value;
});
const hasHandSelection = computed(() => displayedSelectedCardIds.value.length > 0);

const eliminatedText = computed(() => {
  const ids = props.state?.eliminatedPlayerIds ?? [];
  return ids.length ? ids.map(getNickname).join('、') : '无';
});

const rankingText = computed(() => {
  const ids = props.state?.finalRanking ?? [];
  return ids.length ? ids.map(getNickname).join(' > ') : '暂无';
});

watch(
  () => `${props.state?.id ?? ''}-${props.state?.round ?? ''}-${props.state?.phase ?? ''}`,
  () => {
    selectedCardIds.value = [];
  }
);

watch(
  () => `${props.state?.id ?? ''}-${props.state?.round ?? ''}-${props.state?.phase ?? ''}-${props.state?.actionRemainingMs ?? ''}`,
  () => {
    if (props.state?.actionRemainingMs == null) {
      stopActionCountdown();
      localActionRemainingSeconds.value = null;
      return;
    }

    startActionCountdown(Math.ceil(props.state.actionRemainingMs / 1000));
  },
  { immediate: true }
);

onUnmounted(() => {
  stopActionCountdown();
});

function startActionCountdown(remainingSeconds: number) {
  stopActionCountdown();
  localActionRemainingSeconds.value = remainingSeconds;
  actionCountdownTimer = setInterval(() => {
    if (localActionRemainingSeconds.value === null) return;
    localActionRemainingSeconds.value = Math.max(0, localActionRemainingSeconds.value - 1);
  }, 1000);
}

function stopActionCountdown() {
  if (!actionCountdownTimer) return;
  clearInterval(actionCountdownTimer);
  actionCountdownTimer = null;
}

function toggleCard(card: CatchMidCard) {
  const cardId = getCardId(card);
  if (selectedCardIds.value.includes(cardId)) {
    selectedCardIds.value = selectedCardIds.value.filter(id => id !== cardId);
    return;
  }
  if (selectedCardIds.value.length >= 2) return;
  selectedCardIds.value = [...selectedCardIds.value, cardId];
}

function getPlayerStatusText(player: CatchMidPlayer): string {
  if (player.status === 'out') return '已出局';
  if (isFinishedPhase.value) {
    const roomStatus = getRoomPlayerStatus(player.userId);
    if (roomStatus === 'ready') return '已准备';
    if (roomStatus === 'seated') return '未准备';
    if (roomStatus === 'out') return '已出局';
  }
  if (props.state?.phase === 'selecting' && player.confirmed) return '已选牌';
  if (props.state?.phase === 'round_result' && player.confirmed) return '已继续';
  if (props.state?.phase === 'confirm_reveal' && player.revealConfirmed) return '已确认亮牌';
  return '游戏中';
}

function getPlayerConfirmLabel(player: CatchMidPlayer): string {
  if (isFinishedPhase.value) {
    const roomStatus = getRoomPlayerStatus(player.userId);
    if (roomStatus === 'ready') return '已准备';
    return '';
  }
  if (props.state?.phase === 'selecting' && player.confirmed) return '已选牌';
  if (props.state?.phase === 'round_result' && props.state.round < 5 && player.confirmed) return '已继续';
  if (props.state?.phase === 'confirm_reveal' && player.revealConfirmed) return '已亮牌';
  return '';
}

const isFinishedPhase = computed(() => {
  if (!props.state) return false;
  return props.state.phase === 'finished'
    || props.state.phase === 'game_draw'
    || props.state.phase === 'game_over';
});

function isPlayerConfirmed(player: CatchMidPlayer): boolean {
  if (isFinishedPhase.value) return getRoomPlayerStatus(player.userId) === 'ready';
  if (props.state?.phase === 'confirm_reveal') return player.revealConfirmed;
  return player.confirmed;
}

function shouldDimHandCard(card: CatchMidCard): boolean {
  return props.state?.phase === 'selecting'
    && hasHandSelection.value
    && !isCardSelected(card);
}

function isCardSelected(card: CatchMidCard): boolean {
  return displayedSelectedCardIds.value.includes(getCardId(card));
}

function isCurrentCommunityCard(index: number): boolean {
  if (!props.state || props.state.phase !== 'selecting') return false;
  return index + 1 === props.state.round;
}

function shouldDimCommunityCard(index: number): boolean {
  if (!props.state) return false;
  if (props.state.round === 5 || props.state.phase === 'confirm_reveal') return true;
  if (props.state.phase !== 'selecting') return false;
  return index + 1 !== props.state.round;
}

function shouldShowActionCountdown(player: CatchMidPlayer): boolean {
  if (!props.state || actionRemainingSeconds.value === null || player.status !== 'playing') return false;
  if (props.state.phase === 'selecting') return !player.confirmed;
  if (props.state.phase === 'confirm_reveal') return !player.revealConfirmed;
  return false;
}

function getRoomPlayerStatus(userId: string): RoomPlayer['status'] | undefined {
  return props.players.find(item => item.userId === userId)?.status;
}

function isRoundWinner(userId: string): boolean {
  return props.state?.lastRoundResult?.settlement.winnerIds.includes(userId) ?? false;
}

function getPlayerEmojis(userId: string): ActiveEmoji[] {
  return props.activeEmojis.filter(emoji => emoji.userId === userId);
}

function getNickname(userId: string): string {
  return props.state?.players.find(player => player.userId === userId)?.nickname
    ?? props.players.find(player => player.userId === userId)?.nickname
    ?? userId;
}

function getCardId(card: CatchMidCard): string {
  return `${card.suit}-${card.rank}`;
}

function getCardRank(card: CatchMidCard): string {
  if (card.rank === 'small_joker') return 'JOKER';
  if (card.rank === 'big_joker') return 'JOKER';
  return card.rank;
}

function getSuitSymbol(card: CatchMidCard): string {
  if (card.suit === 'joker') return card.rank === 'big_joker' ? 'COLOR' : 'B/W';
  const symbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  return symbols[card.suit];
}

function getSuitClass(card: CatchMidCard): string {
  if (card.suit === 'joker') return card.rank === 'big_joker' ? 'joker big-joker' : 'joker small-joker';
  return card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black';
}
</script>

<style scoped>
.catch-mid-table {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--outline);
  border-radius: 8px;
  background: var(--surface-container-soft);
  overflow: auto;
}

.table-header,
.player-row,
.action-row,
.payment-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.mode-title {
  font-family: 'Russo One', sans-serif;
  font-size: 20px;
  color: var(--on-surface);
}

.mode-meta,
.empty-meta,
.player-status {
  font-size: 12px;
  color: var(--on-surface-variant);
}

.round-badge {
  padding: 6px 10px;
  border: 1px solid var(--outline);
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
}

.round-label {
  color: var(--on-surface);
}

.round-separator {
  color: #52525B;
}

.score-label {
  color: var(--secondary);
}

.empty-state,
.community-section,
.hand-section,
.settlement-panel,
.player-panel {
  border: 1px solid var(--outline);
  border-radius: 8px;
  background: var(--surface-container);
}

.empty-state {
  padding: 30px;
  text-align: center;
}

.empty-title {
  font-size: 18px;
  color: var(--on-surface);
  margin-bottom: 6px;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.player-panel {
  position: relative;
  padding: 10px;
  overflow: visible;
}

.player-panel.me {
  border-color: var(--primary);
}

.player-panel.confirmed {
  border-color: rgba(34,197,94,0.72);
  box-shadow: 0 0 0 2px rgba(34,197,94,0.18);
}

.player-panel.out {
  opacity: 0.5;
}

.action-ring {
  position: absolute;
  inset: -5px;
  border-radius: 10px;
  background: conic-gradient(from -90deg, var(--error) var(--action-progress), rgba(239,68,68,0.1) 0);
  z-index: 0;
  pointer-events: none;
}

.action-ring::after {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 8px;
  background: var(--surface-container);
}

.action-mask {
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: conic-gradient(from -90deg, rgba(0,0,0,0.24) var(--action-progress), transparent 0);
  z-index: 1;
  pointer-events: none;
}

.player-panel > :not(.action-ring):not(.action-mask):not(.emoji-container) {
  position: relative;
  z-index: 2;
}

.action-countdown {
  position: absolute;
  right: 8px;
  top: 8px;
  min-width: 26px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  border: 1px solid rgba(239,68,68,0.72);
  background: rgba(127,29,29,0.96);
  color: #fff;
  font-family: 'Chakra Petch', sans-serif;
  font-size: 13px;
  font-weight: 900;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.35);
}

.nickname,
.result-player {
  font-weight: 700;
  color: var(--on-surface);
}

.confirm-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px 2px 4px;
  border-radius: 999px;
  background: rgba(34,197,94,0.88);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.confirm-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  color: #fff;
  font-size: 11px;
  font-weight: 900;
}

.community-section,
.hand-section,
.settlement-panel {
  padding: 12px;
}

.section-label {
  margin-bottom: 8px;
  color: var(--on-surface-variant);
  font-size: 13px;
  font-weight: 700;
}

.card-row,
.mini-cards {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.playing-card {
  position: relative;
  overflow: hidden;
  width: 54px;
  height: 74px;
  border: 2px solid var(--outline);
  border-radius: 6px;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  cursor: pointer;
  color: #111;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, filter 160ms ease;
}

.playing-card:disabled {
  cursor: default;
}

.playing-card.selected {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(168,85,247,0.45), 0 8px 18px rgba(0,0,0,0.38);
  transform: translateY(-8px);
  z-index: 2;
}

.community-card.active {
  border-color: var(--secondary);
  box-shadow: 0 0 0 3px rgba(251,146,60,0.42), 0 8px 18px rgba(0,0,0,0.34);
  transform: translateY(-8px);
  z-index: 2;
}

.playing-card.dimmed::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.56);
  pointer-events: none;
  z-index: 3;
}

.rank {
  font-size: 14px;
}

.suit {
  font-size: 17px;
}

.red,
.mini-card.red {
  color: #d32f2f;
}

.black,
.mini-card.black {
  color: #111;
}

.joker,
.mini-card.joker {
  color: #7c3aed;
}

.card-back-mark {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 4px;
  background:
    linear-gradient(135deg, rgba(148,163,184,0.18) 25%, transparent 25%) 0 0 / 8px 8px,
    linear-gradient(135deg, #3F3F46, #1E1E1E);
  box-shadow: inset 0 0 0 2px rgba(255,255,255,0.05);
}

.playing-card.joker {
  gap: 2px;
  color: #111;
}

.playing-card.joker .rank {
  font-size: 10px;
  letter-spacing: 0;
}

.playing-card.joker .suit {
  width: 28px;
  height: 34px;
  border-radius: 50% 50% 44% 44%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  line-height: 1;
  color: #111;
  border: 1px solid #111;
  background:
    radial-gradient(circle at 35% 38%, #111 0 2px, transparent 3px),
    radial-gradient(circle at 65% 38%, #111 0 2px, transparent 3px),
    linear-gradient(#fff, #e5e7eb);
}

.playing-card.joker .suit {
  position: relative;
  text-indent: -999px;
}

.playing-card.joker .suit::before {
  content: '';
  position: absolute;
  top: -7px;
  left: 3px;
  width: 20px;
  height: 10px;
  clip-path: polygon(0 100%, 18% 0, 38% 100%, 62% 0, 82% 100%, 100% 0, 100% 100%);
  background: #111;
}

.playing-card.joker .suit::after {
  content: '';
  position: absolute;
  bottom: 7px;
  left: 8px;
  width: 12px;
  height: 4px;
  border-bottom: 2px solid currentColor;
  border-radius: 50%;
}

.playing-card.joker .rank {
  color: #111;
}

.playing-card.big-joker .rank {
  color: #7c3aed;
}

.playing-card.big-joker .suit {
  border-color: #7c3aed;
  background:
    radial-gradient(circle at 35% 38%, #111 0 2px, transparent 3px),
    radial-gradient(circle at 65% 38%, #111 0 2px, transparent 3px),
    linear-gradient(135deg, #fde047 0 24%, #fb7185 24% 48%, #60a5fa 48% 72%, #86efac 72%);
}

.playing-card.big-joker .suit::before {
  background: linear-gradient(90deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7);
}

.action-row {
  justify-content: flex-start;
  margin-top: 12px;
}

.primary-action {
  border: 1px solid rgba(168,85,247,0.58);
  border-radius: 8px;
  padding: 9px 18px;
  background: rgba(168,85,247,0.18);
  color: #e9d5ff;
  font-family: 'Chakra Petch', 'Noto Sans SC', sans-serif;
  font-weight: 700;
  cursor: pointer;
  transition: all 200ms;
}

.primary-action:hover {
  background: rgba(168,85,247,0.3);
  color: #f5e8ff;
}

.continue-action {
  border: 1px solid rgba(34,197,94,0.5);
  border-radius: 8px;
  padding: 9px 18px;
  background: rgba(34,197,94,0.15);
  color: #86EFAC;
  font-family: 'Chakra Petch', 'Noto Sans SC', sans-serif;
  font-weight: 700;
  cursor: pointer;
  transition: all 200ms;
}

.continue-action:hover {
  background: rgba(34,197,94,0.24);
  color: #BBF7D0;
}

.primary-action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.result-item {
  position: relative;
  padding: 10px;
  border: 1px solid var(--outline);
  border-radius: 8px;
  background: var(--surface);
}

.result-item.winner {
  border-color: rgba(202,138,4,0.62);
  box-shadow: 0 0 0 2px rgba(202,138,4,0.16), 0 0 16px rgba(202,138,4,0.22);
}

.settlement-crown {
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 24px;
  filter: drop-shadow(0 2px 6px rgba(255,215,0,0.7));
  animation: crown-bounce 1s ease-in-out infinite;
  pointer-events: none;
}

@keyframes crown-bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-6px); }
}

.mini-card {
  min-width: 34px;
  padding: 3px 5px;
  border: 1px solid var(--outline);
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}

.hand-name {
  margin-top: 7px;
  color: var(--secondary);
  font-weight: 800;
}

.payments {
  display: grid;
  gap: 6px;
  margin-top: 10px;
}

.payment-row {
  justify-content: flex-start;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(255,255,255,0.04);
  color: var(--on-surface);
  font-size: 13px;
}

.double-badge {
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(239,68,68,0.2);
  color: #fca5a5;
  font-size: 11px;
}

.emoji-container {
  position: absolute;
  top: -34px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  pointer-events: none;
  min-width: 40px;
  z-index: 5;
}

.player-panel > .emoji-container {
  position: absolute;
}

.floating-emoji {
  font-size: 28px;
  animation: emoji-rise 3s ease-out forwards;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}

@keyframes emoji-rise {
  0% { opacity: 1; transform: translateY(0) scale(1); }
  70% { opacity: 1; transform: translateY(-30px) scale(1.1); }
  100% { opacity: 0; transform: translateY(-60px) scale(0.8); }
}

.emoji-float-enter-active { animation: emoji-rise 3s ease-out forwards; }
.emoji-float-leave-active { transition: opacity 0.3s; }
.emoji-float-leave-to { opacity: 0; }

@media (max-width: 760px) {
  .players-grid,
  .result-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .playing-card {
    width: 46px;
    height: 64px;
  }
}
</style>
