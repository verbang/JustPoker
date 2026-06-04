<template>
  <div class="scoreboard">
    <button class="scoreboard-toggle" type="button" @click="showScoreboard = !showScoreboard">
      <span class="toggle-icon">{{ showScoreboard ? '-' : '+' }}</span>
      比分板
    </button>

    <template v-if="showScoreboard">
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
    </template>

    <button class="hand-reference-toggle" type="button" @click="showHandReference = !showHandReference">
      <span class="toggle-icon">{{ showHandReference ? '-' : '+' }}</span>
      牌型参考
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
import type { GamePlayer, GameState } from '../../../../shared/types/game.types';
import type { RoomPlayer } from '../../../../shared/types/room.types';

type DisplayStatus = RoomPlayer['status'] | GamePlayer['status'] | GameState['status'] | 'left';
type DisplayPlayer = Omit<RoomPlayer, 'status'> & { status: RoomPlayer['status'] | 'left'; displayStatus: DisplayStatus };

const props = defineProps<{
  players: RoomPlayer[];
  gameState?: {
    status: GameState['status'];
    players: { userId: string; status: GamePlayer['status'] }[];
  } | null;
  leftPlayers?: { userId: string; nickname: string; chips: number }[];
}>();

const displayPlayers = computed<DisplayPlayer[]>(() => {
  const activePlayers = props.players.map(p => {
    // During an active hand, prefer game-level status; after finish, room status carries ready state.
    let displayStatus: DisplayStatus = p.status;
    if (props.gameState?.status === 'playing') {
      const gamePlayer = props.gameState.players.find(gp => gp.userId === p.userId);
      if (gamePlayer) {
        displayStatus = gamePlayer.status;
      }
    }
    return { ...p, displayStatus };
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

  return [...activePlayers, ...leftPlayers];
});

const showScoreboard = ref(true);
const showHandReference = ref(false);

const handReferences = [
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
    joined: '',
    finished: '',
    waiting: '',
  };
  return classMap[status] || '';
}
</script>

<style scoped>
.scoreboard {
  background: var(--surface-container);
  border-radius: var(--radius-card);
  overflow: hidden;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.scoreboard-toggle {
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: var(--surface-container-high);
  color: var(--on-surface);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 200ms;
  font-family: 'Chakra Petch', 'Noto Sans SC', sans-serif;
  text-align: left;
}

.scoreboard-toggle:hover {
  background: var(--outline);
}

.scoreboard table {
  margin-top: 0;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid rgba(63,63,70,0.5);
}

th {
  font-size: 11px;
  color: var(--on-surface-variant);
  font-weight: 500;
  border-bottom: 1px solid var(--outline);
  position: sticky;
  top: 0;
  background: var(--surface-container);
}

td {
  font-size: 13px;
}

tbody tr:nth-child(even) td {
  background: rgba(255,255,255,0.02);
}

.status-playing {
  color: var(--primary);
}

.status-folded {
  color: var(--on-surface-variant);
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

.hand-reference-toggle {
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-top: 1px solid var(--outline);
  background: var(--surface-container-high);
  color: var(--on-surface);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 200ms;
  font-family: 'Chakra Petch', 'Noto Sans SC', sans-serif;
  text-align: left;
}

.hand-reference-toggle:hover {
  background: var(--outline);
}

.hand-reference {
  padding: 12px 16px;
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
  border: 1px solid #475569;
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
  }

  .scoreboard-toggle {
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

  .hand-reference-toggle {
    padding: 8px 12px;
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
