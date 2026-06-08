<template>
  <div class="scoreboard">
    <button class="panel-toggle" type="button" @click="showEmojiPanel = !showEmojiPanel">
      <span class="toggle-icon">{{ showEmojiPanel ? '-' : '+' }}</span>
      表情
    </button>

    <section v-if="showEmojiPanel" class="emoji-section">
      <EmojiPanel
        :is-cooldown="isEmojiCooldown"
        @send="$emit('sendEmoji', $event)"
      />
    </section>

    <button class="panel-toggle" type="button" @click="showScoreboard = !showScoreboard">
      <span class="toggle-icon">{{ showScoreboard ? '-' : '+' }}</span>
      积分
    </button>

    <section v-if="showScoreboard" class="score-section">
      <table>
        <thead>
          <tr>
            <th>玩家</th>
            <th>当前筹码</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="player in displayPlayers" :key="player.userId" :class="{ 'left-player': player.displayStatus === 'left' }">
            <td>{{ player.nickname }}</td>
            <td style="font-family:'Chakra Petch',sans-serif;">{{ player.chips }}</td>
            <td :class="getStatusClass(player.displayStatus)">{{ getStatusText(player.displayStatus) }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <button class="panel-toggle" type="button" @click="showHandReference = !showHandReference">
      <span class="toggle-icon">{{ showHandReference ? '-' : '+' }}</span>
      牌型
    </button>

    <section v-if="showHandReference" class="hand-reference">
      <ol>
        <li v-for="hand in handReferences" :key="hand.name">
          <span class="hand-name">{{ hand.name }}</span>
          <span class="hand-cards">
            <span
              v-for="card in hand.cards"
              :key="`${hand.name}-${card.rank}-${card.suit}`"
              class="sample-card"
              :class="card.suit"
            >
              <span>{{ card.rank }}</span>
              <span>{{ card.symbol }}</span>
            </span>
          </span>
          <span class="hand-desc">{{ hand.description }}</span>
        </li>
      </ol>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import EmojiPanel from './EmojiPanel.vue';
import type { GamePlayer, GameState } from '../../../../shared/types/game.types';
import type { GameType, RoomPlayer } from '../../../../shared/types/room.types';
import type { CatchMidGameState } from '../../../../shared/types/catch-mid.types';

type DisplayStatus = RoomPlayer['status'] | GamePlayer['status'] | GameState['status'] | 'left' | 'selected' | 'continued' | 'reveal_confirmed';
type DisplayPlayer = Omit<RoomPlayer, 'status'> & { status: RoomPlayer['status'] | 'left'; displayStatus: DisplayStatus };

const props = defineProps<{
  players: RoomPlayer[];
  gameState?: {
    status: GameState['status'];
    players: { userId: string; status: GamePlayer['status']; chips: number }[];
  } | null;
  catchMidState?: CatchMidGameState | null;
  gameType?: GameType;
  leftPlayers?: { userId: string; nickname: string; chips: number }[];
  isEmojiCooldown: boolean;
}>();

defineEmits<{
  (e: 'sendEmoji', emoji: string): void;
}>();

const displayPlayers = computed<DisplayPlayer[]>(() => {
  const activePlayers = props.players.map(p => {
    // During an active hand, prefer game-level status; after finish, room status carries ready state.
    let displayStatus: DisplayStatus = p.status;
    const gamePlayer = props.gameState?.players.find(gp => gp.userId === p.userId);
    const catchMidPlayer = props.catchMidState?.players.find(cp => cp.userId === p.userId);
    if (props.gameState?.status === 'playing') {
      if (gamePlayer) {
        displayStatus = gamePlayer.status;
      }
    } else if (props.catchMidState && catchMidPlayer && isCatchMidActivePhase.value) {
      if (catchMidPlayer.status === 'out') {
        displayStatus = 'out';
      } else if (props.catchMidState.phase === 'selecting' && catchMidPlayer.confirmed) {
        displayStatus = 'selected';
      } else if (props.catchMidState.phase === 'round_result' && catchMidPlayer.confirmed) {
        displayStatus = 'continued';
      } else if (props.catchMidState.phase === 'confirm_reveal' && catchMidPlayer.revealConfirmed) {
        displayStatus = 'reveal_confirmed';
      } else {
        displayStatus = 'playing';
      }
    }
    return { ...p, chips: catchMidPlayer?.chips ?? gamePlayer?.chips ?? p.chips, displayStatus };
  });

  // 添加已离开的玩家（仅在游戏中离开的玩家）
  const leftPlayers = (props.leftPlayers || [])
    .filter(lp => !props.players.some(p => p.userId === lp.userId))
    .map(lp => ({
      id: `left-${lp.userId}`,
      ...lp,
      roomId: '',
      seatNumber: null,
      status: 'left' as const,
      joinedAt: new Date(),
      displayStatus: 'left' as DisplayStatus,
    }));

  return [...activePlayers, ...leftPlayers].sort((a, b) => {
    if (b.chips !== a.chips) {
      return b.chips - a.chips;
    }
    return a.nickname.localeCompare(b.nickname, 'zh-Hans');
  });
});

const showScoreboard = ref(true);
const showHandReference = ref(false);
const showEmojiPanel = ref(false);
const isCatchMidActivePhase = computed(() => {
  if (!props.catchMidState) return false;
  return props.catchMidState.phase === 'selecting'
    || props.catchMidState.phase === 'round_result'
    || props.catchMidState.phase === 'confirm_reveal';
});

const texasHandReferences = [
  {
    name: '皇家同花顺',
    description: 'A、K、Q、J、10 同花',
    cards: [
      { rank: 'A', symbol: '♥', suit: 'red' },
      { rank: 'K', symbol: '♥', suit: 'red' },
      { rank: 'Q', symbol: '♥', suit: 'red' },
      { rank: 'J', symbol: '♥', suit: 'red' },
      { rank: '10', symbol: '♥', suit: 'red' },
    ],
  },
  {
    name: '同花顺',
    description: '五张连续同花牌',
    cards: [
      { rank: '9', symbol: '♠', suit: 'black' },
      { rank: '8', symbol: '♠', suit: 'black' },
      { rank: '7', symbol: '♠', suit: 'black' },
      { rank: '6', symbol: '♠', suit: 'black' },
      { rank: '5', symbol: '♠', suit: 'black' },
    ],
  },
  {
    name: '四条',
    description: '四张相同点数',
    cards: [
      { rank: 'Q', symbol: '♥', suit: 'red' },
      { rank: 'Q', symbol: '♦', suit: 'red' },
      { rank: 'Q', symbol: '♣', suit: 'black' },
      { rank: 'Q', symbol: '♠', suit: 'black' },
      { rank: '3', symbol: '♥', suit: 'red' },
    ],
  },
  {
    name: '葫芦',
    description: '三条加一对',
    cards: [
      { rank: '8', symbol: '♥', suit: 'red' },
      { rank: '8', symbol: '♦', suit: 'red' },
      { rank: '8', symbol: '♣', suit: 'black' },
      { rank: 'K', symbol: '♠', suit: 'black' },
      { rank: 'K', symbol: '♥', suit: 'red' },
    ],
  },
  {
    name: '同花',
    description: '五张同花色',
    cards: [
      { rank: 'A', symbol: '♦', suit: 'red' },
      { rank: 'J', symbol: '♦', suit: 'red' },
      { rank: '8', symbol: '♦', suit: 'red' },
      { rank: '4', symbol: '♦', suit: 'red' },
      { rank: '2', symbol: '♦', suit: 'red' },
    ],
  },
  {
    name: '顺子',
    description: '五张连续点数',
    cards: [
      { rank: '10', symbol: '♥', suit: 'red' },
      { rank: '9', symbol: '♣', suit: 'black' },
      { rank: '8', symbol: '♦', suit: 'red' },
      { rank: '7', symbol: '♠', suit: 'black' },
      { rank: '6', symbol: '♥', suit: 'red' },
    ],
  },
  {
    name: '三条',
    description: '三张相同点数',
    cards: [
      { rank: '5', symbol: '♥', suit: 'red' },
      { rank: '5', symbol: '♦', suit: 'red' },
      { rank: '5', symbol: '♠', suit: 'black' },
      { rank: 'A', symbol: '♣', suit: 'black' },
      { rank: '9', symbol: '♥', suit: 'red' },
    ],
  },
  {
    name: '两对',
    description: '两组对子',
    cards: [
      { rank: 'J', symbol: '♥', suit: 'red' },
      { rank: 'J', symbol: '♣', suit: 'black' },
      { rank: '4', symbol: '♦', suit: 'red' },
      { rank: '4', symbol: '♠', suit: 'black' },
      { rank: 'A', symbol: '♥', suit: 'red' },
    ],
  },
  {
    name: '一对',
    description: '一组对子',
    cards: [
      { rank: 'A', symbol: '♠', suit: 'black' },
      { rank: 'A', symbol: '♦', suit: 'red' },
      { rank: '10', symbol: '♣', suit: 'black' },
      { rank: '7', symbol: '♥', suit: 'red' },
      { rank: '3', symbol: '♠', suit: 'black' },
    ],
  },
  {
    name: '高牌',
    description: '无以上牌型，比最大单牌',
    cards: [
      { rank: 'A', symbol: '♣', suit: 'black' },
      { rank: 'J', symbol: '♦', suit: 'red' },
      { rank: '9', symbol: '♠', suit: 'black' },
      { rank: '6', symbol: '♥', suit: 'red' },
      { rank: '2', symbol: '♣', suit: 'black' },
    ],
  },
];

const catchMidHandReferences = [
  {
    name: '王炸',
    description: '大小王加任意一张牌',
    cards: [
      { rank: 'JOKER', symbol: 'B/W', suit: 'joker' },
      { rank: 'JOKER', symbol: 'COLOR', suit: 'joker-color' },
      { rank: 'A', symbol: '♠', suit: 'black' },
    ],
  },
  {
    name: '炸弹',
    description: '三张相同点数（≈1.05%）',
    cards: [
      { rank: '9', symbol: '♥', suit: 'red' },
      { rank: '9', symbol: '♦', suit: 'red' },
      { rank: '9', symbol: '♣', suit: 'black' },
    ],
  },
  {
    name: '同花顺',
    description: '三张连续同花牌（≈1.00%）',
    cards: [
      { rank: 'Q', symbol: '♠', suit: 'black' },
      { rank: 'J', symbol: '♠', suit: 'black' },
      { rank: '10', symbol: '♠', suit: 'black' },
    ],
  },
  {
    name: '同花',
    description: '三张同花色（≈6.13%）',
    cards: [
      { rank: 'A', symbol: '♦', suit: 'red' },
      { rank: '8', symbol: '♦', suit: 'red' },
      { rank: '3', symbol: '♦', suit: 'red' },
    ],
  },
  {
    name: '顺子',
    description: '三张连续点数（≈5.32%）',
    cards: [
      { rank: '8', symbol: '♥', suit: 'red' },
      { rank: '7', symbol: '♣', suit: 'black' },
      { rank: '6', symbol: '♦', suit: 'red' },
    ],
  },
  {
    name: '对子',
    description: '两张相同点数加踢脚牌（≈20.22%）',
    cards: [
      { rank: 'K', symbol: '♥', suit: 'red' },
      { rank: 'K', symbol: '♠', suit: 'black' },
      { rank: '4', symbol: '♣', suit: 'black' },
    ],
  },
  {
    name: '高牌',
    description: '无以上牌型，比最大单牌（≈66.28%）',
    cards: [
      { rank: 'A', symbol: '♣', suit: 'black' },
      { rank: '10', symbol: '♦', suit: 'red' },
      { rank: '5', symbol: '♠', suit: 'black' },
    ],
  },
];

const handReferences = computed(() => props.gameType === 'catch-mid' ? catchMidHandReferences : texasHandReferences);

function getStatusText(status: DisplayStatus): string {
  const statusMap: Record<DisplayStatus, string> = {
    joined: '已加入',
    seated: '未准备',
    ready: '已准备',
    playing: '游戏中',
    folded: '已弃牌',
    all_in: '全下',
    out: '已出局',
    finished: '已结束',
    waiting: '等待中',
    left: '已离开',
    selected: '已选牌',
    continued: '已继续',
    reveal_confirmed: '已亮牌',
  };
  return statusMap[status] || status;
}

function getStatusClass(status: DisplayStatus): string {
  const classMap: Record<DisplayStatus, string> = {
    playing: 'status-playing',
    folded: 'status-folded',
    all_in: 'status-allin',
    out: 'status-out',
    left: 'status-left',
    seated: 'status-seated',
    ready: 'status-ready',
    selected: 'status-ready',
    continued: 'status-ready',
    reveal_confirmed: 'status-ready',
    joined: '',
    finished: '',
    waiting: '',
  };
  return classMap[status] || '';
}
</script>

<style scoped>
.scoreboard {
  background: var(--surface-container-soft);
  border: 1px solid var(--outline);
  border-radius: var(--radius-card);
  overflow: auto;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-panel);
}

.panel-toggle {
  width: 100%;
  min-height: 34px;
  padding: 8px 14px;
  border: none;
  border-bottom: 1px solid var(--outline);
  background: var(--primary-container);
  color: var(--on-primary-container);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 200ms;
  font-family: 'Chakra Petch', 'Noto Sans SC', sans-serif;
  text-align: left;
}

.panel-toggle:hover {
  background: var(--surface-container-high);
}

.emoji-section,
.score-section {
  border-bottom: 1px solid var(--outline);
}

.emoji-section {
  padding: 10px;
}

.scoreboard table {
  margin-top: 0;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 7px 8px;
  text-align: center;
  border-bottom: 1px solid var(--outline);
}

th {
  font-size: 11px;
  color: var(--on-surface-variant);
  font-weight: 500;
  border-bottom: 1px solid var(--outline);
  position: sticky;
  top: 0;
  background: rgba(30,30,30,0.98);
}

td {
  font-size: 13px;
}

tbody tr:nth-child(even) td {
  background: rgba(255,255,255,0.02);
}

.status-playing {
  color: #E4E4E7;
}

.status-folded {
  color: var(--on-surface-variant);
  opacity: 0.45;
}

.status-allin {
  color: var(--secondary);
}

.status-out {
  color: var(--error);
  opacity: 0.6;
}

.status-left {
  color: var(--on-surface-variant);
  opacity: 0.4;
}

.status-seated {
  color: #FCD34D;
}

.status-ready {
  color: var(--tertiary);
}

.left-player {
  opacity: 0.5;
}

.left-player td {
  color: #999;
}

.hand-reference {
  padding: 10px 14px;
  overflow: auto;
}

.hand-reference ol {
  margin: 0;
  padding-left: 22px;
}

.hand-reference li {
  margin-bottom: 7px;
  padding-left: 2px;
}

.hand-name {
  display: block;
  color: var(--on-surface);
  font-size: 13px;
  font-weight: 600;
}

.hand-cards {
  display: flex;
  gap: 4px;
  margin-top: 5px;
}

.sample-card {
  width: 24px;
  height: 34px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--outline);
  border-radius: 4px;
  background: #fff;
  color: #222;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.05;
}

.sample-card.red {
  color: #d32f2f;
}

.sample-card.black {
  color: #111;
}

.sample-card.joker,
.sample-card.joker-color {
  font-size: 7px;
  color: #111;
  border-color: #111;
}

.sample-card.joker-color {
  color: #7c3aed;
  border-color: #7c3aed;
  background: linear-gradient(135deg, #fff 0 35%, #fde047 35% 50%, #60a5fa 50% 65%, #fb7185 65%);
}

.hand-desc {
  display: block;
  margin-top: 2px;
  color: var(--on-surface-variant);
  font-size: 12px;
  line-height: 1.35;
}

@media (orientation: landscape) and (max-width: 900px) {
  .scoreboard {
    border-radius: 6px;
    min-height: 0;
    overflow: auto;
  }

  .panel-toggle {
    padding: 8px 12px;
    font-size: 11px;
  }

  th,
  td {
    padding: 5px 8px;
  }

  th {
    font-size: 10px;
  }

  td {
    font-size: 11px;
  }

  .hand-reference {
    padding: 8px 12px;
  }

  .hand-reference ol {
    padding-left: 18px;
  }

  .hand-reference li {
    margin-bottom: 5px;
  }

  .hand-name {
    font-size: 11px;
  }

  .hand-cards {
    gap: 2px;
    margin-top: 4px;
  }

  .sample-card {
    width: 18px;
    height: 26px;
    border-radius: 3px;
    font-size: 8px;
  }

  .hand-desc {
    font-size: 10px;
  }
}

@media (orientation: portrait) {
  .scoreboard {
    flex: 1;
    min-width: 200px;
  }
}
</style>
