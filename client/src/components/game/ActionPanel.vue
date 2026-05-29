<template>
  <div class="action-panel">
    <button class="action-btn fold" @click="$emit('fold')" :disabled="!isMyTurn">
      弃牌
    </button>
    <button
      v-if="canCheck"
      class="action-btn check"
      @click="$emit('check')"
      :disabled="!isMyTurn"
    >
      过牌
    </button>
    <button
      v-else
      class="action-btn call"
      @click="$emit('call')"
      :disabled="!isMyTurn"
    >
      跟注 {{ callAmount }}
    </button>
    <button class="action-btn raise" @click="emitBetOrRaise" :disabled="!isMyTurn || !canRaise">
      {{ raiseLabel }} {{ raiseAmount }}
    </button>
    <input
      type="range"
      v-model.number="raiseAmount"
      :min="raiseMin"
      :max="maxChips"
      :disabled="!canRaise"
      class="raise-slider"
    />
    <button class="action-btn all-in" @click="$emit('all-in')" :disabled="!isMyTurn">
      全下
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';

const props = defineProps<{
  isMyTurn: boolean;
  currentBet: number;
  myBet: number;
  minRaise: number;
  maxChips: number;
}>();

const emit = defineEmits<{
  (e: 'fold'): void;
  (e: 'check'): void;
  (e: 'call'): void;
  (e: 'bet', amount: number): void;
  (e: 'raise', amount: number): void;
  (e: 'all-in'): void;
}>();

const raiseAmount = ref(Math.min(props.currentBet + props.minRaise, props.maxChips));

const canCheck = computed(() => props.myBet >= props.currentBet);
const callAmount = computed(() => props.currentBet - props.myBet);
const raiseMin = computed(() => props.currentBet + props.minRaise);
const canRaise = computed(() => props.maxChips >= raiseMin.value);
const raiseLabel = computed(() => props.currentBet === 0 ? '下注' : '加注');

function emitBetOrRaise() {
  if (props.currentBet === 0) {
    emit('bet', raiseAmount.value);
  } else {
    emit('raise', raiseAmount.value);
  }
}

watch(
  () => [props.currentBet, props.minRaise],
  () => {
    raiseAmount.value = Math.min(props.currentBet + props.minRaise, props.maxChips);
  }
);
</script>

<style scoped>
.action-panel {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.action-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.fold {
  background: #f44336;
  color: #fff;
}

.action-btn.fold:hover:not(:disabled) {
  background: #d32f2f;
}

.action-btn.check {
  background: #4caf50;
  color: #fff;
}

.action-btn.check:hover:not(:disabled) {
  background: #388e3c;
}

.action-btn.call {
  background: #2196f3;
  color: #fff;
}

.action-btn.call:hover:not(:disabled) {
  background: #1976d2;
}

.action-btn.raise {
  background: #ff9800;
  color: #fff;
}

.action-btn.raise:hover:not(:disabled) {
  background: #f57c00;
}

.action-btn.all-in {
  background: #9c27b0;
  color: #fff;
}

.action-btn.all-in:hover:not(:disabled) {
  background: #7b1fa2;
}

.raise-slider {
  width: 120px;
  cursor: pointer;
}

@media (orientation: landscape) and (max-width: 900px) {
  .action-panel {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    padding: 8px;
    border-radius: 6px;
  }

  .action-btn {
    min-height: 38px;
    padding: 8px 6px;
    font-size: 12px;
  }

  .raise-slider {
    grid-column: 1 / -1;
    width: 100%;
    min-height: 30px;
  }
}
</style>
