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
    <button class="action-btn raise" @click="$emit('raise', raiseAmount)" :disabled="!isMyTurn">
      加注 {{ raiseAmount }}
    </button>
    <input
      type="range"
      v-model.number="raiseAmount"
      :min="raiseMin"
      :max="maxChips"
      class="raise-slider"
    />
    <button class="action-btn all-in" @click="$emit('allIn')" :disabled="!isMyTurn">
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

defineEmits<{
  (e: 'fold'): void;
  (e: 'check'): void;
  (e: 'call'): void;
  (e: 'raise', amount: number): void;
  (e: 'allIn'): void;
}>();

const raiseAmount = ref(props.currentBet + props.minRaise);

const canCheck = computed(() => props.myBet >= props.currentBet);
const callAmount = computed(() => props.currentBet - props.myBet);
const raiseMin = computed(() => props.currentBet + props.minRaise);

watch(
  () => props.currentBet,
  (newBet) => {
    raiseAmount.value = newBet + props.minRaise;
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
</style>
