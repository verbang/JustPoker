<template>
  <div class="room">
    <h2>房间: {{ roomCode }}</h2>

    <!-- Seat Selection (when player hasn't selected a seat) -->
    <SeatSelection
      v-if="!mySeatNumber"
      :players="players"
      :user-id="userId"
      :max-seats="10"
      @select="handleSelectSeat"
    />

    <!-- Game Table (when player has selected a seat) -->
    <template v-else>
      <GameTable
        :players="seatedPlayers"
        :community-cards="communityCards"
        :pot="pot"
        :current-player-index="currentPlayerIndex"
        :user-id="userId"
        :my-cards="myCards"
        :active-emojis="activeEmojis"
        @tip="handleTip"
      />

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
    </template>

    <!-- Countdown Overlay -->
    <Countdown :count="countdownValue" />

    <EmojiPanel
      :is-cooldown="isCooldown"
      @send="handleEmoji"
    />
    <Scoreboard :players="players" :game-state="gameStore.gameState" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
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
  return me?.seatNumber || null;
});
const myStatus = computed(() => {
  const me = players.value.find(p => p.userId === userId.value);
  return me?.status || null;
});
const seatedPlayers = computed(() =>
  players.value
    .filter(p => p.seatNumber !== null)
    .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0))
);
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
    gameStore.clearGame();
  });
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
  min-height: 100vh;
  background: #0d47a1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

h2 {
  color: #fff;
  margin: 0;
}

.ready-btn {
  padding: 14px 48px;
  font-size: 18px;
  font-weight: bold;
  color: #fff;
  background: linear-gradient(135deg, #4caf50, #388e3c);
  border: none;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
  letter-spacing: 2px;
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
  padding: 10px 24px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 20px;
  color: #aaa;
  font-size: 14px;
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
</style>
