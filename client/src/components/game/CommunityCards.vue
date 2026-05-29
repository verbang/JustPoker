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
  gap: 8px;
  justify-content: center;
}

.card {
  width: 52px;
  height: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 2px solid #555;
  border-radius: 6px;
  font-weight: bold;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s;
}

.card:not(.card-empty):hover {
  transform: scale(1.05);
}

.card-rank {
  font-size: 18px;
  line-height: 1;
}

.card-suit {
  font-size: 16px;
  line-height: 1;
}

.card.suit-red {
  color: #d32f2f;
}

.card.suit-black {
  color: #212121;
}

.card-empty {
  background: rgba(255, 255, 255, 0.1);
  border: 2px dashed rgba(255, 255, 255, 0.3);
}

.card-placeholder {
  color: rgba(255, 255, 255, 0.3);
  font-size: 20px;
}

@media (orientation: landscape) and (max-width: 900px) {
  .community-cards {
    gap: 4px;
  }

  .card {
    width: 34px;
    height: 48px;
    border-width: 1px;
    border-radius: 4px;
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
