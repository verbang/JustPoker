<template>
  <div v-if="handResult" class="hand-display">
    <span class="hand-label">当前牌型</span>
    <span class="hand-name" :class="handResult.rank">{{ handResult.description }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { evaluateBestHand, HandResult } from '../../utils/handEvaluator';

const props = defineProps<{
  holeCards: any[];
  communityCards: any[];
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
  background: rgba(0, 0, 0, 0.7);
  border-radius: 20px;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.hand-label {
  font-size: 11px;
  color: #aaa;
}

.hand-name {
  font-size: 14px;
  font-weight: bold;
  color: #ffd700;
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
