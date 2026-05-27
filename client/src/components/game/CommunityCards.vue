<template>
  <div class="community-cards">
    <div v-for="(card, index) in cards" :key="index" class="card">
      {{ card.rank }}{{ getSuitSymbol(card.suit) }}
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  cards: any[];
}>();

function getSuitSymbol(suit: string): string {
  const symbols: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  return symbols[suit] || '';
}
</script>

<style scoped>
.community-cards {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.card {
  width: 50px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 2px solid #333;
  border-radius: 6px;
  font-size: 18px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}
</style>
