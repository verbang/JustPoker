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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { GamePlayer, GameState } from '../../../../shared/types/game.types';
import type { RoomPlayer } from '../../../../shared/types/room.types';

type DisplayStatus = RoomPlayer['status'] | GamePlayer['status'] | GameState['status'];
type DisplayPlayer = RoomPlayer & { displayStatus: DisplayStatus };

const props = defineProps<{
  players: RoomPlayer[];
  gameState?: {
    players: { userId: string; status: GamePlayer['status'] }[];
  } | null;
}>();

const displayPlayers = computed<DisplayPlayer[]>(() => {
  return props.players.map(p => {
    // During game, prefer game-level status; otherwise use room-level status
    let displayStatus: DisplayStatus = p.status;
    if (props.gameState) {
      const gamePlayer = props.gameState.players.find(gp => gp.userId === p.userId);
      if (gamePlayer) {
        displayStatus = gamePlayer.status;
      }
    }
    return { ...p, displayStatus };
  });
});

function getStatusText(status: DisplayStatus): string {
  const statusMap: Record<DisplayStatus, string> = {
    joined: '已加入',
    seated: '已入座',
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
}
</style>
