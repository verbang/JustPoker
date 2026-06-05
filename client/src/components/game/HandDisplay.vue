<template>
  <div v-if="handResult" class="hand-display">
    <span class="hand-label">当前牌型</span>
    <span class="hand-name" :class="handResult.rank">{{ handResult.description }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { evaluateBestHand, HandResult } from '../../utils/handEvaluator';
import type { Card } from '../../../../shared/types/game.types';

const props = defineProps<{
  holeCards: Card[];
  communityCards: Card[];
}>();

const handResult = computed<HandResult | null>(() => {
  if (!props.holeCards || props.holeCards.length < 2) return null;
  if (props.communityCards.length < 3) return null;
  return evaluateBestHand(props.holeCards, props.communityCards);
});
</script>

<style scoped>
.hand-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(30,30,30,0.9);
  border-radius: 20px;
  border: 1px solid var(--outline);
  box-shadow: 0 8px 18px rgba(0,0,0,0.26);
}

.hand-label {
  font-size: 11px;
  color: var(--on-surface-variant);
}

.hand-name {
  font-size: 14px;
  font-weight: bold;
  color: var(--secondary);
}

/* Highlight stronger hands */
.hand-name.royal_flush,
.hand-name.straight_flush,
.hand-name.four_of_a_kind {
  color: #ff5722;
  text-shadow: 0 0 8px rgba(255, 87, 34, 0.5);
}

.hand-name.full_house {
  color: #e91e63;
}

.hand-name.flush {
  color: #9c27b0;
}

.hand-name.straight {
  color: #2196f3;
}

.hand-name.three_of_a_kind {
  color: #4caf50;
}
</style>
