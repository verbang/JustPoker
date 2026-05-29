<template>
  <div class="scoreboard">
    <h3>比分板</h3>
    <table>
      <thead>
        <tr>
          <th>玩家</th>
          <th>当前筹码</th>
          <th>状态</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="player in displayPlayers" :key="player.userId">
          <td>{{ player.nickname }}</td>
          <td>{{ player.chips }}</td>
          <td>{{ getStatusText(player.displayStatus) }}</td>
        </tr>
      </tbody>
    </table>

    <button class="hand-reference-toggle" type="button" @click="showHandReference = !showHandReference">
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

type DisplayStatus = RoomPlayer['status'] | GamePlayer['status'] | GameState['status'];
type DisplayPlayer = RoomPlayer & { displayStatus: DisplayStatus };

const props = defineProps<{
  players: RoomPlayer[];
  gameState?: {
    status: GameState['status'];
    players: { userId: string; status: GamePlayer['status'] }[];
  } | null;
}>();

const displayPlayers = computed<DisplayPlayer[]>(() => {
  return props.players.map(p => {
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
});

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
  };
  return statusMap[status] || status;
}
</script>

<style scoped>
.scoreboard {
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  padding: 16px;
  color: #fff;
  min-height: 0;
  overflow: auto;
}

.scoreboard h3 {
  margin: 0 0 12px 0;
  text-align: center;
  color: #ffd700;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 8px 12px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

th {
  font-size: 12px;
  color: #aaa;
}

td {
  font-size: 14px;
}

.hand-reference-toggle {
  width: 100%;
  margin-top: 12px;
  min-height: 34px;
  border: 1px solid rgba(255, 215, 0, 0.45);
  border-radius: 6px;
  background: rgba(255, 215, 0, 0.12);
  color: #ffd700;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
}

.hand-reference-toggle:hover {
  background: rgba(255, 215, 0, 0.2);
}

.hand-reference {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
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
  color: #fff;
  font-size: 13px;
  font-weight: bold;
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
  border: 1px solid #ddd;
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
  color: #bbb;
  font-size: 12px;
  line-height: 1.35;
}

@media (orientation: landscape) and (max-width: 900px) {
  .scoreboard {
    flex: 1;
    padding: 8px;
    border-radius: 6px;
  }

  .scoreboard h3 {
    margin-bottom: 6px;
    font-size: 13px;
  }

  th,
  td {
    padding: 5px 4px;
  }

  th {
    font-size: 10px;
  }

  td {
    font-size: 11px;
  }

  .hand-reference-toggle {
    margin-top: 8px;
    min-height: 28px;
    font-size: 11px;
  }

  .hand-reference {
    margin-top: 7px;
    padding-top: 7px;
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
</style>
