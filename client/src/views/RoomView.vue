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
          @ready="handleReady"
          @tip="handleTip"
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
import type { GamePlayer } from '../../../shared/types/game.types';
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
const winnerId = computed(() => gameStore.gameState?.winnerId);
const winnerIds = computed(() => {
  if (gameStore.gameState?.status === 'playing') return [];
  return gameStore.gameState?.winnerIds || lastWinnerIds.value || (winnerId.value ? [winnerId.value] : []);
});
const communityCards = computed(() => gameStore.gameState?.communityCards || []);
const pot = computed(() => gameStore.gameState?.pot || 0);
const currentPlayerIndex = computed(() => gameStore.gameState?.currentPlayerIndex || 0);
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
    if (data.status === 'playing') {
      lastWinnerIds.value = [];
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
    setTimeout(() => {
      activeEmojis.value = activeEmojis.value.filter(e => e.id !== id);
    }, 3000);
  });

  socketService.onGameStart(() => {
    soundManager.playDeal();
    countdownValue.value = null;
  });

  socketService.onGameOver((data) => {
    lastWinnerIds.value = data.winnerIds || (data.winnerId ? [data.winnerId] : []);
    actionRemainingSeconds.value = null;
  });
});

onUnmounted(() => {
  socketService.offAll();
  stopActionCountdown();
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
    setTimeout(() => {
      isCooldown.value = false;
    }, 10000);
  }
}

function handleTip(player: TablePlayer | GamePlayer | RoomPlayer) {
  console.log('Tip player:', player.nickname);
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
    gap: 6px;
    height: calc(100dvh - max(16px, env(safe-area-inset-top)) - max(12px, env(safe-area-inset-bottom)));
  }

  .control-zone {
    gap: 6px;
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
