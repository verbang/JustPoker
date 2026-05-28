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
          :active-emojis="activeEmojis"
          @tip="handleTip"
        />

        <div class="table-status">
          <!-- Ready Button (visible when I am 'seated') -->
          <button
            v-if="myStatus === 'seated'"
            class="ready-btn"
            @click="handleReady"
          >
            准备
          </button>

          <!-- Waiting indicator (when I am 'ready' and game hasn't started) -->
          <div v-if="myStatus === 'ready' && !gameStore.gameState" class="waiting-indicator">
            <span class="waiting-dot"></span>
            等待其他玩家准备...
          </div>

          <HandDisplay
            v-if="gameStore.gameState"
            :hole-cards="myCards"
            :community-cards="communityCards"
          />
        </div>
      </main>

      <aside class="control-zone">
        <ActionPanel
          v-if="isMyTurn"
          :is-my-turn="isMyTurn"
          :current-bet="currentBet"
          :my-bet="myBet"
          :min-raise="minRaise"
          :max-chips="maxChips"
          @fold="handleFold"
          @check="handleCheck"
          @call="handleCall"
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '../stores/user';
import { useRoomStore } from '../stores/room';
import { useGameStore } from '../stores/game';
import { socketService } from '../services/socket';
import { soundManager } from '../utils/sounds';
import GameTable from '../components/game/GameTable.vue';
import ActionPanel from '../components/game/ActionPanel.vue';
import EmojiPanel from '../components/game/EmojiPanel.vue';
import Scoreboard from '../components/game/Scoreboard.vue';
import SeatSelection from '../components/game/SeatSelection.vue';
import HandDisplay from '../components/game/HandDisplay.vue';
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

  // During gameplay, merge game state data (chips, status) into room players
  if (gameStore.gameState) {
    return roomSeated.map(p => {
      const gp = gameStore.gameState!.players.find(gp => gp.userId === p.userId);
      return gp ? { ...p, chips: gp.chips, status: gp.status } : p;
    });
  }
  return roomSeated;
});

const winnerId = computed(() => gameStore.gameState?.winnerId);
const communityCards = computed(() => gameStore.gameState?.communityCards || []);
const pot = computed(() => gameStore.gameState?.pot || 0);
const currentPlayerIndex = computed(() => gameStore.gameState?.currentPlayerIndex || 0);
const currentBet = computed(() => gameStore.gameState?.currentBet || 0);
const minRaise = computed(() => gameStore.gameState?.minRaise || 10);
const myBet = computed(() => gameStore.myPlayer?.bet || 0);
const maxChips = computed(() => gameStore.myPlayer?.chips || 1000);
const myCards = computed(() => gameStore.myCards);
const isMyTurn = computed(() => gameStore.isMyTurn);
const isCooldown = ref(false);
const emojiTimestamps: number[] = [];
interface ActiveEmoji { id: number; userId: string; emoji: string; }
let emojiIdCounter = 0;
const activeEmojis = ref<ActiveEmoji[]>([]);
const countdownValue = ref<number | null>(null);

onMounted(() => {
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

  socketService.onGameOver(() => {
    // Keep game state so winner crown remains visible
    // Game state will be cleared when next game starts
  });
});

onUnmounted(() => {
  socketService.offAll();
});

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

function handleTip(player: any) {
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

.table-status {
  position: absolute;
  left: 50%;
  bottom: 6px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transform: translateX(-50%);
  pointer-events: none;
}

.table-status > * {
  pointer-events: auto;
}

.control-zone {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.ready-btn {
  min-height: 44px;
  padding: 10px 34px;
  font-size: 16px;
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
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(76, 175, 80, 0.6);
}

.ready-btn:active {
  transform: scale(0.98);
}

.waiting-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  color: #aaa;
  font-size: 13px;
  white-space: nowrap;
}

.waiting-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ffc107;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
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

  .table-status {
    bottom: 4px;
  }

  .ready-btn {
    min-height: 38px;
    padding: 8px 24px;
    font-size: 14px;
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

  .table-status {
    position: static;
    margin-top: -38px;
    transform: none;
  }
}
</style>
