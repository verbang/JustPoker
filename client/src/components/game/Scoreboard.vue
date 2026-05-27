<template>
  <div class="scoreboard">
    <h3>比分板</h3>
    <table>
      <thead>
        <tr>
          <th>玩家</th>
          <th>初始筹码</th>
          <th>重新买入</th>
          <th>总投入</th>
          <th>当前筹码</th>
          <th>盈亏</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="player in players" :key="player.userId">
          <td>{{ player.nickname }}</td>
          <td>{{ player.initialChips }}</td>
          <td>{{ player.rebuyTotal }}</td>
          <td>{{ player.totalInvested }}</td>
          <td>{{ player.chips }}</td>
          <td :class="{ positive: player.profit >= 0, negative: player.profit < 0 }">
            {{ player.profit >= 0 ? '+' : '' }}{{ player.profit }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  players: any[];
}>();
</script>

<style scoped>
.scoreboard {
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  padding: 16px;
  color: #fff;
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

.positive {
  color: #4caf50;
}

.negative {
  color: #f44336;
}
</style>
