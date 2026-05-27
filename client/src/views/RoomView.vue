<template>
  <div class="room">
    <h2>房间: {{ roomCode }}</h2>
    <GameTable
      :players="players"
      :community-cards="communityCards"
      :pot="pot"
      :current-player-index="currentPlayerIndex"
      :user-id="userId"
      :my-cards="myCards"
      @tip="handleTip"
    />
    <ActionPanel
      v-if="isMyTurn"
      :is-my-turn="isMyTurn"
      :current-bet="currentBet"
      :min-raise="minRaise"
      :max-chips="maxChips"
      @fold="handleFold"
      @call="handleCall"
      @raise="handleRaise"
      @all-in="handleAllIn"
    />
    <EmojiPanel
      :is-cooldown="isCooldown"
      @send="handleEmoji"
    />
    <Scoreboard :players="scoreboardPlayers" />
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

const route = useRoute();
const userStore = useUserStore();
const roomStore = useRoomStore();
const gameStore = useGameStore();

const roomCode = computed(() => route.params.roomCode as string);
const userId = computed(() => userStore.userId || '');
const players = computed(() => roomStore.players);
const communityCards = computed(() => gameStore.gameState?.communityCards || []);
const pot = computed(() => gameStore.gameState?.pot || 0);
const currentPlayerIndex = computed(() => gameStore.gameState?.currentPlayerIndex || 0);
const currentBet = computed(() => gameStore.gameState?.currentBet || 0);
const minRaise = computed(() => 10);
const maxChips = computed(() => 1000);
const myCards = computed(() => gameStore.myCards);
const isMyTurn = computed(() => gameStore.isMyTurn);
const isCooldown = ref(false);
const scoreboardPlayers = ref<any[]>([]);

onMounted(() => {
  socketService.connect();
  socketService.joinRoom(roomCode.value, userId.value);

  socketService.onRoomUpdate((data) => {
    roomStore.setPlayers(data.players);
  });

  socketService.onGameUpdate((data) => {
    gameStore.updateGameState(data);
  });

  socketService.onPlayerJoined(() => {
    soundManager.playJoin();
  });

  socketService.onPlayerLeft(() => {
    soundManager.playLeave();
  });

  socketService.onNewEmoji(() => {
    soundManager.playEmoji();
  });

  socketService.onGameStart(() => {
    soundManager.playDeal();
  });
});

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
  socketService.sendEmoji(roomCode.value, emoji);
  isCooldown.value = true;
  setTimeout(() => {
    isCooldown.value = false;
  }, 1000);
}

function handleTip(player: any) {
  // Implement tip functionality
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
</style>
