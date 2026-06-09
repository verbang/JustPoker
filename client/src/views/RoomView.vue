<template>
  <div class="room">
    <header class="room-header">
      <div class="room-code">房间 <span>{{ roomCode }}</span></div>
      <div class="header-actions">
        <button
          v-if="myStatus === 'seated'"
          class="ready-btn"
          @click="handleReady"
        >
          准备
        </button>
        <button class="leave-btn" @click="handleLeaveRoom">离开</button>
      </div>
    </header>

    <div v-if="!isRoomInfoLoaded" class="room-loading">
      <div class="loading-title">正在同步房间座位</div>
      <div class="loading-meta">请稍候...</div>
    </div>

    <!-- Seat Selection (when player hasn't selected a seat) -->
    <SeatSelection
      v-else-if="roomStore.gameType === 'texas-holdem' && mySeatNumber === null"
      :players="players"
      :user-id="userId"
      :max-seats="roomStore.maxSeats"
      @select="handleSelectSeat"
    />

    <!-- Game Table (when player has selected a seat) -->
    <div v-else class="game-layout">
      <main class="table-zone">
        <GameTable
          v-if="roomStore.gameType === 'texas-holdem'"
          :players="tablePlayers"
          :community-cards="communityCards"
          :pot="pot"
          :main-pot-amount="mainPotAmount"
          :side-pots="sidePots"
          :current-player-id="currentPlayerId"
          :user-id="userId"
          :my-cards="myCards"
          :winner-id="winnerId"
          :winner-ids="winnerIds"
          :disconnected-player-ids="disconnectedPlayers"
          :active-emojis="activeEmojis"
          :action-remaining-seconds="actionRemainingSeconds"
          :hand-hole-cards="myCards"
          :hand-community-cards="communityCards"
          :showdown-mode="showdownMode"
          :showdown-players="showdownPlayers"
          :winner-can-reveal="winnerCanReveal"
          @tip="handleTip"
          @reveal-cards="handleRevealCards"
        />
        <CatchMidTable
          v-else
          :state="catchMidState"
          :players="players"
          :user-id="userId"
          :active-emojis="activeEmojis"
          @confirm-cards="handleCatchMidConfirmCards"
          @confirm-reveal="handleCatchMidConfirmReveal"
          @advance-round="handleCatchMidAdvanceRound"
        />
      </main>

      <aside class="control-zone">
        <ActionPanel
          v-if="roomStore.gameType === 'texas-holdem' && isMyTurn"
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
        <Scoreboard
          :players="players"
          :game-state="gameStore.gameState"
          :catch-mid-state="catchMidState"
          :game-type="roomStore.gameType"
          :left-players="leftPlayers"
          :is-emoji-cooldown="isCooldown"
          @send-emoji="handleEmoji"
        />
      </aside>
    </div>

    <!-- Countdown Overlay -->
    <Countdown :count="countdownValue" />

    <!-- 断线重连覆盖层 -->
    <ReconnectOverlay
      :visible="isDisconnected"
      :is-reconnecting="isReconnecting"
      :attempt="reconnectAttempt"
      :reconnect-failed="reconnectFailed"
      :timeout-ms="RECONNECT_TIMEOUT_MS"
      @go-home="handleGoHome"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
import type { CatchMidGameState } from '../../../shared/types/catch-mid.types';
import GameTable from '../components/game/GameTable.vue';
import type { TablePlayer } from '../components/game/GameTable.vue';
import CatchMidTable from '../components/game/CatchMidTable.vue';
import ActionPanel from '../components/game/ActionPanel.vue';
import Scoreboard from '../components/game/Scoreboard.vue';
import SeatSelection from '../components/game/SeatSelection.vue';
import Countdown from '../components/game/Countdown.vue';
import ReconnectOverlay from '../components/game/ReconnectOverlay.vue';

const route = useRoute();
const router = useRouter();
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

const tablePlayers = computed<TablePlayer[]>(() => {
  const state = gameStore.gameState;
  if (state?.status === 'playing') {
    return state.players
      .slice()
      .sort((a, b) => a.seatNumber - b.seatNumber)
      .map(player => {
        const roomPlayer = players.value.find(p => p.userId === player.userId);
        return {
          id: roomPlayer?.id,
          roomId: roomPlayer?.roomId,
          userId: player.userId,
          nickname: player.nickname,
          seatNumber: player.seatNumber,
          chips: player.chips,
          status: player.status,
          joinedAt: roomPlayer?.joinedAt,
          isDealer: player.isDealer,
          isSmallBlind: player.isSmallBlind,
          isBigBlind: player.isBigBlind,
        };
      });
  }

  return seatedPlayers.value;
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
const sidePots = computed(() => gameStore.gameState?.sidePots || []);
const mainPotAmount = computed(() => {
  const sp = sidePots.value;
  if (sp.length === 0) return pot.value;
  const sidePotsTotal = sp.reduce((sum, s) => sum + s.amount, 0);
  return pot.value - sidePotsTotal;
});
const currentPlayerId = computed(() => {
  const state = gameStore.gameState;
  if (!state || state.status !== 'playing') return null;
  return state.currentPlayerId ?? state.players[state.currentPlayerIndex]?.userId ?? null;
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
const isRoomInfoLoaded = ref(false);
let actionCountdownTimer: ReturnType<typeof setInterval> | null = null;

// 断线重连状态
const isDisconnected = ref(false);
const isReconnecting = ref(false);
const reconnectAttempt = ref(0);
const reconnectFailed = ref(false);
let disconnectTimer: ReturnType<typeof setTimeout> | null = null;
const RECONNECT_TIMEOUT_MS = 30000;
// 是否已收到服务端倒计时同步（防止 watcher 重置）
let pendingActionSync = false;
// 断线玩家集合（用于显示断线标记）
const disconnectedPlayers = ref<Set<string>>(new Set());
// 已离开玩家列表（用于比分板显示）
const leftPlayers = ref<{ userId: string; nickname: string; chips: number }[]>([]);
const catchMidState = ref<CatchMidGameState | null>(null);
const lastCatchMidRoundKey = ref('');

const activeActionKey = computed(() => {
  if (!actionTimeoutEnabled.value) return null;

  const state = gameStore.gameState;
  if (!state || state.status !== 'playing') return null;

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.status !== 'playing') return null;

  const activePlayerId = state.currentPlayerId ?? currentPlayer.userId;
  return `${state.id}:${state.phase}:${activePlayerId}:${state.currentBet}:${currentPlayer.bet}`;
});

onMounted(async () => {
  try {
    const response = await roomApi.getRoomInfo(roomCode.value);
    roomStore.setRoom(
      response.data.room.roomCode,
      response.data.room.id,
      response.data.room.initialChips,
      response.data.room.actionTimeoutEnabled ?? false,
      response.data.room.gameType,
      response.data.room.hostId
    );
    roomStore.setPlayers(response.data.players);
    isRoomInfoLoaded.value = true;
  } catch (error) {
    console.error('Failed to get room info:', error);
  }

  // 标记等待服务端同步倒计时（防止页面刷新时 watcher 重置）
  pendingActionSync = true;
  // 超时清除标志（防止无游戏时卡住）
  setTimeout(() => { pendingActionSync = false; }, 3000);
  socketService.connect();
  socketService.joinRoom(roomCode.value, userId.value);

  socketService.onRoomUpdate((data) => {
    roomStore.setPlayers(data.players);
    isRoomInfoLoaded.value = true;
  });

  socketService.onCountdownStart((data) => {
    if (data.count != null) {
      countdownValue.value = data.count;
      // 倒计时出现3时开始播放游戏开始音效
      if (data.count === 3) {
        soundManager.playGameStart();
      }
    } else {
      // 倒计时取消（有人离开等原因），停止音效
      soundManager.stopGameStart();
      countdownValue.value = null;
    }
  });

  socketService.onGameUpdate((data) => {
    // 检测公共牌变化（发牌音效）
    const prevCommunityCards = gameStore.gameState?.communityCards?.length || 0;
    const newCommunityCards = data.communityCards?.length || 0;

    gameStore.updateGameState(data);

    // 播放操作音效
    if (data.lastAction) {
      const { action, userId: actionUserId } = data.lastAction;
      switch (action) {
        case 'call':
        case 'bet':
          soundManager.playBet();
          break;
        case 'raise':
          soundManager.playRaise();
          break;
        case 'check':
          soundManager.playKnock();
          break;
        case 'all_in':
          soundManager.playAllIn();
          break;
        case 'fold':
          soundManager.playFold();
          break;
      }
      // 轮到自己时播放提示音
      if (data.currentPlayerIndex !== undefined) {
        const currentPlayer = data.players[data.currentPlayerIndex];
        if (currentPlayer?.userId === userId.value && actionUserId !== userId.value) {
          soundManager.playYourTurn();
        }
      }
    }

    // 公共牌增加时播放发牌音效
    if (newCommunityCards > prevCommunityCards && newCommunityCards > 0) {
      soundManager.playDeal();
    }

    // 重连时服务端发送的倒计时剩余时间
    // 必须用 nextTick 延迟执行，确保 Vue watcher 先刷新（看到 pendingActionSync=true 并返回）
    if (data.actionRemainingMs != null && data.actionRemainingMs > 0) {
      const remaining = Math.ceil(data.actionRemainingMs / 1000);
      nextTick(() => {
        pendingActionSync = false;
        startActionCountdown(remaining);
      });
    }

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

  socketService.onPlayerJoined((data) => {
    // 移除断线标记
    disconnectedPlayers.value.delete(data.userId);
    disconnectedPlayers.value = new Set(disconnectedPlayers.value);

    // 当前行动玩家重连，用剩余时间恢复倒计时
    if (data.reconnected && data.remainingMs != null && data.remainingMs > 0) {
      pendingActionSync = false;
      const remaining = Math.ceil(data.remainingMs / 1000);
      nextTick(() => {
        startActionCountdown(remaining);
      });
    }
  });

  socketService.onPlayerLeft((data) => {
    // 有人离开时停止倒计时音效
    soundManager.stopGameStart();
    // 根据离开原因处理
    if (data.reason === 'disconnect' && data.reconnecting) {
      // 断线重连：标记该玩家为断线状态
      disconnectedPlayers.value.add(data.userId);
      disconnectedPlayers.value = new Set(disconnectedPlayers.value);

      // 如果断线的是当前行动玩家，暂停倒计时
      const state = gameStore.gameState;
      if (state && state.status === 'playing') {
        const currentPlayer = state.players[state.currentPlayerIndex];
        if (currentPlayer?.userId === data.userId) {
          stopActionCountdown(false);
          // 用服务端发送的剩余时间更新显示（不启动计时器）
          if (data.remainingMs != null) {
            actionRemainingSeconds.value = Math.ceil(data.remainingMs / 1000);
          }
        }
      }
    } else if (data.reason === 'leave' || data.reason === 'timeout') {
      // 主动离开或超时：从断线集合中移除（如果有）
      disconnectedPlayers.value.delete(data.userId);
      disconnectedPlayers.value = new Set(disconnectedPlayers.value);

      // 如果游戏中离开，将玩家添加到已离开列表（用于比分板显示）
      const state = gameStore.gameState;
      if (state && state.status === 'playing') {
        const gamePlayer = state.players.find(p => p.userId === data.userId);
        if (gamePlayer) {
          leftPlayers.value.push({
            userId: data.userId,
            nickname: gamePlayer.nickname,
            chips: gamePlayer.chips,
          });
        }
      }
      if (data.nickname != null && data.chips != null) {
        leftPlayers.value = [
          ...leftPlayers.value.filter(player => player.userId !== data.userId),
          {
            userId: data.userId,
            nickname: data.nickname,
            chips: data.chips,
          },
        ];
      }
    }
  });

  socketService.onNewEmoji((data: { userId: string; emoji: string }) => {
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
    countdownValue.value = null;
    // 游戏正式开始时停止倒计时音效
    soundManager.stopGameStart();
    disconnectedPlayers.value = new Set();
    leftPlayers.value = [];
  });

  socketService.onCatchMidGameStart((data) => {
    catchMidState.value = data.gameState;
    lastCatchMidRoundKey.value = `${data.gameState.id}:${data.gameState.round}:${data.gameState.phase}`;
    countdownValue.value = null;
    soundManager.stopGameStart();
  });

  socketService.onCatchMidGameUpdate((data) => {
    const previousState = catchMidState.value;
    catchMidState.value = data;
    const currentRoundKey = `${data.id}:${data.round}:${data.phase}`;
    if (
      previousState?.phase === 'round_result'
      && data.phase === 'selecting'
      && data.round >= 2
      && data.round <= 4
      && lastCatchMidRoundKey.value !== currentRoundKey
    ) {
      soundManager.playDeal();
    }
    lastCatchMidRoundKey.value = currentRoundKey;
    countdownValue.value = null;
  });

  socketService.onCatchMidRoundResult(() => {
    soundManager.playWin();
    soundManager.playBet();
  });

  socketService.onCatchMidGameOver((data) => {
    catchMidState.value = data.gameState ?? null;
    const eliminated = data.eliminatedPlayerIds;
    if (eliminated.includes(userId.value)) {
      alert('您的筹码已耗尽，无法继续游戏');
      userStore.clearUser();
      roomStore.clearRoom();
      gameStore.clearGame();
      router.push('/');
      return;
    }
    if (data.phase === 'game_draw') {
      alert('本局平局，所有玩家均已出局');
    }
  });

  socketService.onGameOver((data) => {
    lastWinnerIds.value = data.winnerIds || (data.winnerId ? [data.winnerId] : []);
    actionRemainingSeconds.value = null;
    // 如果当前用户是赢家，播放胜利音效
    if (data.winnerIds?.includes(userId.value) || data.winnerId === userId.value) {
      soundManager.playWin();
    }
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

  // 监听服务器广播的音效事件
  socketService.onPlaySound((data) => {
    if (data.sound === 'door') {
      soundManager.playDoor();
    }
  });

  socketService.onRebuyRequired((data) => {
    alert(data.message || '筹码不足，请重新买入');
  });


  // 断线重连事件监听
  socketService.onDisconnect(() => {
    isDisconnected.value = true;
    isReconnecting.value = false;
    reconnectFailed.value = false;
    reconnectAttempt.value = 0;
    // 暂停倒计时计时器
    stopActionCountdown();
    // 启动 30 秒超时计时器
    if (disconnectTimer) clearTimeout(disconnectTimer);
    disconnectTimer = setTimeout(() => {
      reconnectFailed.value = true;
    }, RECONNECT_TIMEOUT_MS);
  });

  // 连接成功时标记等待服务端同步（处理页面刷新的情况）
  socketService.onConnect(() => {
    pendingActionSync = true;
  });

  socketService.onReconnectAttempt((attempt) => {
    isReconnecting.value = true;
    reconnectAttempt.value = attempt;
    reconnectFailed.value = false;
  });

  socketService.onReconnect(() => {
    isDisconnected.value = false;
    isReconnecting.value = false;
    reconnectAttempt.value = 0;
    reconnectFailed.value = false;
    pendingActionSync = true; // 等待服务端同步倒计时
    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      disconnectTimer = null;
    }
  });

  socketService.onReconnectFailed(() => {
    isReconnecting.value = false;
    reconnectFailed.value = true;
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
  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    disconnectTimer = null;
  }
});

watch(activeActionKey, (key) => {
  stopActionCountdown();

  if (!key) {
    actionRemainingSeconds.value = null;
    return;
  }

  // 断线期间或等待服务端同步时，不重置倒计时
  if (isDisconnected.value || pendingActionSync) return;

  startActionCountdown(ACTION_TIMEOUT);
});

// 监控玩家数量变化：倒计时期间有人离开则停止音效
watch(() => players.value.length, (newCount, oldCount) => {
  if (newCount < oldCount && countdownValue.value != null) {
    console.log('[Sound] stopGameStart (players decreased during countdown)');
    soundManager.stopGameStart();
  }
});

function startActionCountdown(remainingSeconds: number) {
  stopActionCountdown();
  actionRemainingSeconds.value = remainingSeconds;
  actionCountdownTimer = setInterval(() => {
    if (actionRemainingSeconds.value === null) return;
    actionRemainingSeconds.value = Math.max(0, actionRemainingSeconds.value - 1);
  }, 1000);
}

function stopActionCountdown(clearRemaining = true) {
  if (actionCountdownTimer) {
    clearInterval(actionCountdownTimer);
    actionCountdownTimer = null;
  }
  if (clearRemaining) {
    actionRemainingSeconds.value = null;
  }
}

function handleSelectSeat(seatNumber: number) {
  socketService.selectSeat(roomCode.value, seatNumber);
}

function handleReady() {
  soundManager.playButton();
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
  soundManager.playButton();
  socketService.revealCards(roomCode.value);
}

function handleCatchMidConfirmCards(cardIds: string[]) {
  soundManager.playButton();
  socketService.catchMidSelectCards(roomCode.value, cardIds);
  socketService.catchMidConfirmCards(roomCode.value);
}

function handleCatchMidConfirmReveal() {
  soundManager.playButton();
  socketService.catchMidConfirmReveal(roomCode.value);
}

function handleCatchMidAdvanceRound() {
  soundManager.playButton();
  socketService.catchMidAdvanceRound(roomCode.value);
}

// 用户主动离开房间（仅点击"离开"按钮时触发）
function handleLeaveRoom() {
  // 根据玩家状态和游戏状态显示不同的确认文案
  const myStatus = players.value.find(p => p.userId === userId.value)?.status;
  const isTexasGameInProgress = gameStore.gameState?.status === 'playing';
  const isCatchMidGameInProgress = catchMidState.value
    && !['finished', 'game_draw', 'game_over'].includes(catchMidState.value.phase);

  let confirmMessage = '确定离开房间吗？';
  if (isTexasGameInProgress && myStatus === 'playing') {
    confirmMessage = '正在游戏中，确定离开吗？已投入的筹码将不会退还';
  } else if (isCatchMidGameInProgress && myStatus === 'playing') {
    confirmMessage = '游戏中离开房间需要支付所有玩家5筹码，确认离开吗？';
  }

  if (!confirm(confirmMessage)) {
    return;
  }

  // 播放离开音效并通知服务器广播给房间内其他成员
  soundManager.stopGameStart();
  soundManager.playDoor();
  socketService.leaveRoom(roomCode.value);
  userStore.clearUser();
  roomStore.clearRoom();
  gameStore.clearGame();
  router.push('/');
}

// 重连超时后返回首页
function handleGoHome() {
  userStore.clearUser();
  roomStore.clearRoom();
  gameStore.clearGame();
  router.push('/');
}
</script>

<style scoped>
.room {
  min-height: 100dvh;
  background:
    radial-gradient(ellipse at 50% 44%, rgba(63,63,70,0.24), transparent 34rem),
    linear-gradient(rgba(255,255,255,0.016) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px),
    var(--surface);
  background-size: auto, 24px 24px, 24px 24px, auto;
  padding: max(8px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right))
    max(8px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  overscroll-behavior-x: none;
}

.room-header {
  width: 100%;
  max-width: 1100px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 2px;
}

.room-code {
  font-family: 'Russo One', sans-serif;
  font-size: 16px;
  color: var(--on-surface-variant);
  letter-spacing: 1px;
}

.room-code span {
  color: var(--primary);
}

.leave-btn {
  padding: 6px 16px;
  border: 1px solid var(--outline);
  border-radius: 8px;
  background: var(--surface-container);
  color: var(--on-surface-variant);
  font-family: 'Chakra Petch', 'Noto Sans SC', sans-serif;
  font-size: 13px;
  cursor: pointer;
  transition: all 200ms;
}

.leave-btn:hover {
  background: var(--surface-container-high);
  color: var(--on-surface);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ready-btn {
  padding: 6px 16px;
  border: 1px solid rgba(34,197,94,0.5);
  border-radius: 8px;
  background: rgba(34,197,94,0.15);
  color: #86EFAC;
  font-family: 'Chakra Petch', 'Noto Sans SC', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms;
}

.ready-btn:hover {
  background: rgba(34,197,94,0.24);
  color: #BBF7D0;
}

.game-layout {
  width: 100%;
  max-width: 1100px;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 12px;
  align-items: stretch;
  overflow: hidden;
  overscroll-behavior-x: none;
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
  gap: 10px;
  overflow: hidden;
  min-width: 0;
  overscroll-behavior-x: none;
}

@media (orientation: landscape) and (max-width: 900px) {
  .room {
    height: 100dvh;
    gap: 6px;
    padding: max(6px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right))
      max(6px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
    align-items: stretch;
    overflow: hidden;
  }

  .room-header {
    position: absolute;
    top: max(6px, env(safe-area-inset-top));
    left: max(8px, env(safe-area-inset-left));
    z-index: 5;
    width: auto;
    padding: 5px 8px;
    border: 1px solid var(--outline-soft);
    border-radius: 8px;
    background: rgba(18,18,18,0.78);
    backdrop-filter: blur(10px);
    max-width: none;
    gap: 10px;
  }

  .room-code {
    font-size: 13px;
  }

  .game-layout {
    flex: 1 1 auto;
    grid-template-columns: minmax(0, 1fr) 220px;
    grid-template-rows: minmax(0, 1fr);
    gap: 8px;
    height: auto;
    min-height: 0;
    max-height: 100%;
    overflow: hidden;
    max-width: none;
    align-items: stretch;
  }

  .table-zone {
    width: 100%;
    height: 100%;
    align-items: flex-start;
    overflow: hidden;
  }

  .control-zone {
    height: 100%;
    max-height: 100%;
    gap: 6px;
    overflow: hidden;
    padding-right: 2px;
  }

}

@media (orientation: portrait) {
  .room {
    overflow: auto;
  }

  .game-layout {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: minmax(430px, 1fr) auto;
    max-width: none;
    overflow: visible;
  }

  .table-zone {
    min-height: 430px;
  }

  .control-zone {
    flex-direction: row;
    flex-wrap: wrap;
    overflow: visible;
  }
}
</style>
