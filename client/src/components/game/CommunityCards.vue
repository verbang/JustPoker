<template>
  <div class="community-cards">
    <div
      v-for="(card, index) in cards"
      :key="index"
      class="card"
      :class="getSuitClass(card.suit)"
    >
      <span class="card-rank">{{ card.rank }}</span>
      <span class="card-suit">{{ getSuitSymbol(card.suit) }}</span>
    </div>
    <!-- Placeholder slots for undealt cards -->
    <div
      v-for="i in Math.max(0, 5 - cards.length)"
      :key="'empty-' + i"
      class="card card-empty"
    >
      <span class="card-placeholder">?</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Card, Suit } from '../../../../shared/types/game.types';

defineProps<{
  cards: Card[];
}>();

function getSuitSymbol(suit: Suit): string {
  const symbols: Record<Suit, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  };
  return symbols[suit] || '';
}

function getSuitClass(suit: Suit): string {
  if (suit === 'hearts' || suit === 'diamonds') return 'suit-red';
  return 'suit-black';
}
</script>

<style scoped>
.community-cards {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.card {
  width: 48px;
  height: 66px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  font-weight: bold;
  line-height: 1;
}

.card-rank {
  font-size: 17px;
  line-height: 1;
}

.card-suit {
  font-size: 15px;
  line-height: 1;
}

.card.suit-red {
  color: #d32f2f;
}

.card.suit-black {
  color: #212121;
}

.card-empty {
  background: rgba(255,255,255,0.06);
  border: 2px dashed rgba(255,255,255,0.15);
  box-shadow: none;
}

.card-placeholder {
  color: rgba(255,255,255,0.2);
  font-size: 18px;
}

@media (orientation: landscape) and (max-width: 900px) {
  .community-cards {
    gap: 4px;
  }

  .card {
    width: 34px;
    height: 48px;
    border-radius: 5px;
  }

  .card-rank {
    font-size: 13px;
  }

  .card-suit {
    font-size: 12px;
  }

  .card-placeholder {
    font-size: 14px;
  }
}
</style>
