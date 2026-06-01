<template>
  <div class="room">
    <header class="room-header">
      <h2>房间: {{ roomCode }}</h2>
    </header>

    <!-- Seat Selection (when player hasn't selected a seat) -->
    <SeatSelection
      v-if="mySeatNumber === null"
      :players="players"
      :user-id="userId"
      :max-seats="10"
      @select="handleSelectSeat"
    />

    <!-- Game Table (when player has selected a seat) -->
    <div v-else class="game-layout">
      <main class="table-zone">
        <GameTable
          :players="seatedPlayers"
          :community-cards="communityCards"
          :pot="pot"
          :current-player-index="currentPlayerIndex"
          :user-id="userId"
          :my-cards="myCards"
          :winner-id="winnerId"
          :winner-ids="winnerIds"
          :active-emojis="activeEmojis"
          :action-remaining-seconds="actionRemainingSeconds"
          :show-ready-button="myStatus === 'seated'"
          :hand-hole-cards="myCards"
          :hand-community-cards="communityCards"
          :showdown-mode="showdownMode"
          :showdown-players="showdownPlayers"
          :winning-hand-description="winningHandDescription"
          :winner-can-reveal="winnerCanReveal"
          @ready="handleReady"
          @tip="handleTip"
          @reveal-cards="handleRevealCards"
        />
      </main>

      <aside class="control-zone">
        <ActionPanel
          v-if="isMyTurn"
          :is-my-turn="isMyTurn"
          :current-bet="currentBet"
          :my-bet="myBet"
          :min-raise="minRaise"
          :min-raise-to="minRaiseTo"
          :max-chips="maxChips"
          @fold="handleFold"
          @check="handleCheck"
          @call="handleCall"
          @bet="handleBet"
          @raise="handleRaise"
          @all-in="handleAllIn"
        />
        <EmojiPanel
          :is-cooldown="isCooldown"
          @send="handleEmoji"
        />
        <Scoreboard :players="players" :game-state="gameStore.gameState" />
      </aside>
    </div>

    <!-- Countdown Overlay -->
    <Countdown :count="countdownValue" />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '../stores/user';
import { useRoomStore } from '../stores/room';
import { useGameStore } from '../stores/game';
import { socketService } from '../services/socket';
import { roomApi } from '../services/api';
import { soundManager } from '../utils/sounds';
import { ACTION_TIMEOUT } from '../../../shared/constants/game.constants';
import { evaluateBestHand } from '../utils/handEvaluator';
import type { GamePlayer, Card, GameState } from '../../../shared/types/game.types';
import type { RoomPlayer } from '../../../shared/types/room.types';
import GameTable from '../components/game/GameTable.vue';
import type { TablePlayer } from '../components/game/GameTable.vue';
import ActionPanel from '../components/game/ActionPanel.vue';
import EmojiPanel from '../components/game/EmojiPanel.vue';
import Scoreboard from '../components/game/Scoreboard.vue';
import SeatSelection from '../components/game/SeatSelection.vue';
import Countdown from '../components/game/Countdown.vue';

const route = useRoute();
const userStore = useUserStore();
const roomStore = useRoomStore();
const gameStore = useGameStore();

const roomCode = computed(() => route.params.roomCode as string);
const userId = computed(() => userStore.userId || '');
const players = computed(() => roomStore.players);
const mySeatNumber = computed(() => {
  const me = players.value.find(p => p.userId === userId.value);
  return me?.seatNumber ?? null;
});
const myStatus = computed(() => {
  const me = players.value.find(p => p.userId === userId.value);
  return me?.status || null;
});
const seatedPlayers = computed(() => {
  const roomSeated = players.value
    .filter(p => p.seatNumber !== null)
    .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0));

  // During gameplay, merge game state data into room players.
  // After a hand finishes, keep cards/community cards for review but let room status drive ready indicators.
  if (gameStore.gameState) {
    const isPlaying = gameStore.gameState.status === 'playing';
    return roomSeated.map<TablePlayer>(p => {
      const gp = gameStore.gameState!.players.find(gp => gp.userId === p.userId);
      return {
        ...p,
        chips: gp?.chips ?? p.chips,
        status: isPlaying ? (gp?.status ?? p.status) : p.status,
        isDealer: gp?.isDealer ?? false,
        isSmallBlind: gp?.isSmallBlind ?? false,
        isBigBlind: gp?.isBigBlind ?? false,
      };
    });
  }
  return roomSeated.map<TablePlayer>(p => ({
    ...p,
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
  }));
});

const lastWinnerIds = ref<string[]>([]);
const lastGameState = ref<GameState | null>(null);

interface ShowdownPlayerData {
  cards: Card[];
  handDescription: string;
}

// 摊牌场景：正常摊牌（2+ 未弃牌玩家）或弃牌获胜后赢家主动亮牌
const showdownPlayers = computed(() => {
  const gs = lastGameState.value;
  if (!gs || gs.status !== 'finished') return new Map<string, ShowdownPlayerData>();

  // 场景 1：正常摊牌（2+ 未弃牌玩家）
  const activePlayers = gs.players.filter(p => p.status !== 'folded' && p.cards && p.cards.length >= 2);
  if (activePlayers.length >= 2) {
    const map = new Map<string, ShowdownPlayerData>();
    for (const gp of activePlayers) {
      const handResult = evaluateBestHand(gp.cards, gs.communityCards);
      map.set(gp.userId, {
        cards: gp.cards,
        handDescription: handResult?.description ?? '',
      });
    }
    return map;
  }

  // 场景 2：弃牌获胜 + 赢家已主动亮牌
  if (gs.isFoldWin && revealedCards.value) {
    const map = new Map<string, ShowdownPlayerData>();
    const totalCards = revealedCards.value.cards.length + gs.communityCards.length;
    const handResult = totalCards >= 5 ? evaluateBestHand(revealedCards.value.cards, gs.communityCards) : null;
    map.set(revealedCards.value.userId, {
      cards: revealedCards.value.cards,
      handDescription: handResult?.description ?? '已亮牌',
    });
    return map;
  }

  return new Map<string, ShowdownPlayerData>();
});

const winningHandDescription = computed(() => lastGameState.value?.winningHand ?? '');
const showdownMode = computed(() => showdownPlayers.value.size > 0);

// 是否为弃牌获胜（只有赢家一人，其他玩家全部弃牌）
const isFoldWin = computed(() => lastGameState.value?.isFoldWin === true);

// 赢家是否可以主动亮牌（弃牌获胜 + 当前用户是赢家 + 尚未亮牌）
const winnerCanReveal = computed(() => {
  if (!isFoldWin.value) return false;
  if (!lastGameState.value?.winnerId) return false;
  if (lastGameState.value.winnerId !== userId.value) return false;
  if (revealedCards.value) return false;
  if (revealWindowExpired.value) return false;
  return true;
});

// 已亮牌的数据（由 CARDS_REVEALED 事件设置）
const revealedCards = ref<{ userId: string; cards: Card[] } | null>(null);
// 亮牌窗口是否已过期（与服务端 30 秒超时同步）
const revealWindowExpired = ref(false);
let revealWindowTimer: ReturnType<typeof setTimeout> | null = null;

const winnerId = computed(() => gameStore.gameState?.winnerId);
const winnerIds = computed(() => {
  if (gameStore.gameState?.status === 'playing') return [];
  return gameStore.gameState?.winnerIds || lastWinnerIds.value || (winnerId.value ? [winnerId.value] : []);
});
const communityCards = computed(() => gameStore.gameState?.communityCards || []);
const pot = computed(() => gameStore.gameState?.pot || 0);
const currentPlayerIndex = computed(() => {
  const state = gameStore.gameState;
  if (!state || state.status !== 'playing') return -1;
  return state.currentPlayerIndex;
});
const currentBet = computed(() => gameStore.gameState?.currentBet || 0);
const minRaise = computed(() => gameStore.gameState?.minRaise || 10);
const minRaiseTo = computed(() => gameStore.gameState?.minRaiseTo);
const myBet = computed(() => gameStore.myPlayer?.bet || 0);
const maxChips = computed(() => (gameStore.myPlayer?.chips || 0) + myBet.value);
const myCards = computed(() => gameStore.myCards);
const isMyTurn = computed(() => gameStore.isMyTurn);
const actionTimeoutEnabled = computed(() => roomStore.actionTimeoutEnabled);
const isCooldown = ref(false);
const emojiTimestamps: number[] = [];
const emojiTimers = new Map<number, ReturnType<typeof setTimeout>>();
let cooldownTimer: ReturnType<typeof setTimeout> | null = null;
interface ActiveEmoji { id: number; userId: string; emoji: string; }
let emojiIdCounter = 0;
const activeEmojis = ref<ActiveEmoji[]>([]);
const countdownValue = ref<number | null>(null);
const actionRemainingSeconds = ref<number | null>(null);
let actionCountdownTimer: ReturnType<typeof setInterval> | null = null;

const activeActionKey = computed(() => {
  if (!actionTimeoutEnabled.value) return null;

  const state = gameStore.gameState;
  if (!state || state.status !== 'playing') return null;

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.status !== 'playing') return null;

  return `${state.id}:${state.phase}:${state.currentPlayerIndex}:${currentPlayer.userId}:${state.currentBet}:${currentPlayer.bet}`;
});

onMounted(async () => {
  try {
    const response = await roomApi.getRoomInfo(roomCode.value);
    roomStore.setActionTimeoutEnabled(response.data.room.actionTimeoutEnabled ?? false);
  } catch (error) {
    console.error('Failed to get room info:', error);
  }

  socketService.connect();
  socketService.joinRoom(roomCode.value, userId.value);

  socketService.onRoomUpdate((data) => {
    roomStore.setPlayers(data.players);
  });

  socketService.onCountdownStart((data) => {
    if (data.count !== undefined) {
      countdownValue.value = data.count;
    } else {
      // Countdown started (initial signal before 3)
      countdownValue.value = null;
    }
  });

  socketService.onGameUpdate((data) => {
    gameStore.updateGameState(data);
    if (data.status === 'finished') {
      lastGameState.value = data;
      lastWinnerIds.value = data.winnerIds || (data.winnerId ? [data.winnerId] : []);
      // 弃牌获胜时启动 30 秒亮牌窗口
      if (data.isFoldWin) {
        revealWindowExpired.value = false;
        if (revealWindowTimer) clearTimeout(revealWindowTimer);
        revealWindowTimer = setTimeout(() => {
          revealWindowExpired.value = true;
          revealWindowTimer = null;
        }, 30000);
      }
    }
    if (data.status === 'playing') {
      lastWinnerIds.value = [];
      lastGameState.value = null;
      revealedCards.value = null;
      revealWindowExpired.value = false;
      if (revealWindowTimer) {
        clearTimeout(revealWindowTimer);
        revealWindowTimer = null;
      }
    }
    // Clear countdown when game starts
    countdownValue.value = null;
  });

  socketService.onPlayerJoined(() => {
    soundManager.playJoin();
  });

  socketService.onPlayerLeft(() => {
    soundManager.playLeave();
  });

  socketService.onNewEmoji((data: { userId: string; emoji: string }) => {
    soundManager.playEmoji();
    const id = ++emojiIdCounter;
    activeEmojis.value.push({ id, userId: data.userId, emoji: data.emoji });
    if (activeEmojis.value.length > 3) {
      activeEmojis.value.shift();
    }
    const timer = setTimeout(() => {
      activeEmojis.value = activeEmojis.value.filter(e => e.id !== id);
      emojiTimers.delete(id);
    }, 3000);
    emojiTimers.set(id, timer);
  });

  socketService.onGameStart(() => {
    soundManager.playDeal();
    countdownValue.value = null;
  });

  socketService.onGameOver((data) => {
    lastWinnerIds.value = data.winnerIds || (data.winnerId ? [data.winnerId] : []);
    actionRemainingSeconds.value = null;
  });

  socketService.onCardsRevealed((data) => {
    // 仅在游戏已结束时接受亮牌数据，防止旧事件污染新一局
    if (lastGameState.value?.status === 'finished') {
      revealedCards.value = data;
    }
  });

  socketService.onError((data) => {
    alert(data.message);
  });

  socketService.onRebuyRequired((data) => {
    alert(data.message || '筹码不足，请重新买入');
  });
});

onUnmounted(() => {
  socketService.offAll();
  stopActionCountdown();
  emojiTimers.forEach(timer => clearTimeout(timer));
  emojiTimers.clear();
  if (cooldownTimer) {
    clearTimeout(cooldownTimer);
    cooldownTimer = null;
  }
  if (revealWindowTimer) {
    clearTimeout(revealWindowTimer);
    revealWindowTimer = null;
  }
});

watch(activeActionKey, (key) => {
  stopActionCountdown();

  if (!key) {
    actionRemainingSeconds.value = null;
    return;
  }

  actionRemainingSeconds.value = ACTION_TIMEOUT;
  actionCountdownTimer = setInterval(() => {
    if (actionRemainingSeconds.value === null) return;
    actionRemainingSeconds.value = Math.max(0, actionRemainingSeconds.value - 1);
  }, 1000);
});

function stopActionCountdown() {
  if (!actionCountdownTimer) return;

  clearInterval(actionCountdownTimer);
  actionCountdownTimer = null;
}

function handleSelectSeat(seatNumber: number) {
  socketService.selectSeat(roomCode.value, seatNumber);
}

function handleReady() {
  socketService.playerReady(roomCode.value);
}

function handleCheck() {
  socketService.playerAction(roomCode.value, 'check');
}

function handleFold() {
  socketService.playerAction(roomCode.value, 'fold');
}

function handleCall() {
  socketService.playerAction(roomCode.value, 'call');
}

function handleBet(amount: number) {
  socketService.playerAction(roomCode.value, 'bet', amount);
}

function handleRaise(amount: number) {
  socketService.playerAction(roomCode.value, 'raise', amount);
}

function handleAllIn() {
  socketService.playerAction(roomCode.value, 'all_in');
}

function handleEmoji(emoji: string) {
  if (isCooldown.value) return;

  const now = Date.now();
  emojiTimestamps.push(now);

  while (emojiTimestamps.length > 0 && emojiTimestamps[0] < now - 5000) {
    emojiTimestamps.shift();
  }

  socketService.sendEmoji(roomCode.value, emoji);

  if (emojiTimestamps.length >= 5) {
    isCooldown.value = true;
    emojiTimestamps.length = 0;
    cooldownTimer = setTimeout(() => {
      isCooldown.value = false;
      cooldownTimer = null;
    }, 10000);
  }
}

function handleTip(player: TablePlayer | GamePlayer | RoomPlayer) {
  console.log('Tip player:', player.nickname);
}

function handleRevealCards() {
  socketService.revealCards(roomCode.value);
}
</script>

<style scoped>
.room {
  min-height: 100dvh;
  background: #0d47a1;
  padding: max(8px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right))
    max(8px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  overflow: hidden;
}

.room-header {
  width: 100%;
  flex: 0 0 auto;
}

h2 {
  color: #fff;
  margin: 0;
  font-size: 18px;
  line-height: 1.2;
  text-align: center;
}

.game-layout {
  width: 100%;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(230px, 28vw);
  gap: 10px;
  align-items: stretch;
}

.table-zone {
  min-width: 0;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.control-zone {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

@media (orientation: landscape) and (max-width: 900px) {
  .room {
    gap: 6px;
  }

  .room-header {
    position: absolute;
    top: max(6px, env(safe-area-inset-top));
    left: max(8px, env(safe-area-inset-left));
    z-index: 5;
    width: auto;
    padding: 4px 8px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.45);
  }

  h2 {
    font-size: 13px;
  }

  .game-layout {
    grid-template-columns: minmax(0, 1fr) minmax(184px, 27vw);
    grid-template-rows: 1fr;
    gap: 6px;
    height: calc(100dvh - max(16px, env(safe-area-inset-top)) - max(12px, env(safe-area-inset-bottom)));
  }

  .control-zone {
    gap: 6px;
    overflow-y: auto;
  }

}

@media (orientation: portrait) {
  .room {
    overflow: auto;
  }

  .game-layout {
    display: flex;
    flex-direction: column;
  }

  .table-zone {
    min-height: 420px;
  }

}
</style>
