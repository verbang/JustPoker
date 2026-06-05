<template>
  <div class="action-panel">
    <div class="action-buttons">
      <button class="action-btn fold" @click="$emit('fold')" :disabled="!isMyTurn">
        Fold
      </button>
      <button
        v-if="canCheck"
        class="action-btn check"
        @click="$emit('check')"
        :disabled="!isMyTurn"
      >
        Check
      </button>
      <button
        v-else
        class="action-btn call"
        @click="$emit('call')"
        :disabled="!isMyTurn"
      >
        Call ${{ callAmount }}
      </button>
      <button class="action-btn raise" @click="emitBetOrRaise" :disabled="!isMyTurn || !canRaise">
        {{ raiseLabel }}
      </button>
      <button class="action-btn all-in" @click="$emit('all-in')" :disabled="!isMyTurn">
        All-in
      </button>
    </div>
    <div class="raise-row">
      <input
        type="range"
        v-model.number="raiseAmount"
        :min="raiseMin"
        :max="raiseSliderMax"
        :step="BET_RAISE_STEP"
        :disabled="!canRaise"
        class="raise-slider"
        :style="{ '--fill': raiseSliderFill + '%' }"
        @pointerdown="handleSliderPointerDown"
        @pointermove="handleSliderPointerMove"
        @pointerup="handleSliderPointerEnd"
        @pointercancel="handleSliderPointerEnd"
      />
      <span class="raise-value">${{ displayedRaiseAmount }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { BET_RAISE_STEP } from '../../../../shared/constants/game.constants';

const props = defineProps<{
  isMyTurn: boolean;
  currentBet: number;
  myBet: number;
  minRaise: number;
  minRaiseTo?: number;
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

const canCheck = computed(() => props.myBet >= props.currentBet);
const callAmount = computed(() => props.currentBet - props.myBet);
const raiseMin = computed(() => alignToStep(props.minRaiseTo ?? props.currentBet + props.minRaise, 'ceil'));
const canRaise = computed(() => props.maxChips >= raiseMin.value);
const raiseLabel = computed(() => props.currentBet === 0 ? 'Bet' : 'Raise');
const raiseAmount = ref(raiseMin.value);
const displayedRaiseAmount = computed(() => canRaise.value ? raiseAmount.value : raiseMin.value);
const raiseSliderMax = computed(() => canRaise.value ? alignToStep(props.maxChips, 'floor') : raiseMin.value);
const raiseSliderFill = computed(() => {
  if (!canRaise.value) return 0;
  const range = raiseSliderMax.value - raiseMin.value;
  if (range <= 0) return 0;
  return ((raiseAmount.value - raiseMin.value) / range) * 100;
});
const isDraggingSlider = ref(false);

function emitBetOrRaise() {
  if (!canRaise.value) return;
  const amount = normalizeRaiseAmount(raiseAmount.value);

  if (props.currentBet === 0) {
    emit('bet', amount);
  } else {
    emit('raise', amount);
  }
}

function alignToStep(value: number, direction: 'ceil' | 'floor'): number {
  const quotient = value / BET_RAISE_STEP;
  return (direction === 'ceil' ? Math.ceil(quotient) : Math.floor(quotient)) * BET_RAISE_STEP;
}

function normalizeRaiseAmount(value: number): number {
  const steppedValue = alignToStep(value, 'floor');
  return Math.min(Math.max(steppedValue, raiseMin.value), raiseSliderMax.value);
}

function handleSliderPointerDown(event: PointerEvent) {
  isDraggingSlider.value = true;
  event.currentTarget instanceof HTMLElement && event.currentTarget.setPointerCapture(event.pointerId);
}

function handleSliderPointerMove(event: PointerEvent) {
  if (!isDraggingSlider.value) return;
  event.preventDefault();
}

function handleSliderPointerEnd(event: PointerEvent) {
  if (event.currentTarget instanceof HTMLElement && event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
  isDraggingSlider.value = false;
  raiseAmount.value = normalizeRaiseAmount(raiseAmount.value);
}

watch(
  () => [props.currentBet, props.minRaise, props.minRaiseTo, props.maxChips],
  () => {
    raiseAmount.value = canRaise.value ? normalizeRaiseAmount(raiseAmount.value) : raiseMin.value;
  }
);
</script>

<style scoped>
.action-panel {
  background: var(--surface-container-soft);
  border: 1px solid var(--outline);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-panel);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 0 0 auto;
  overflow: hidden;
  min-width: 0;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-btn {
  flex: 1;
  min-width: 60px;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  font-family: 'Chakra Petch', 'Noto Sans SC', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  cursor: pointer;
  transition: filter 200ms, transform 160ms, opacity 160ms;
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.action-btn:disabled:hover {
  filter: none;
}

.action-btn:hover:not(:disabled) {
  filter: brightness(1.25);
}

.action-btn:active {
  transform: scale(0.97);
}

.action-btn.fold {
  background: #991B1B;
}

.action-btn.check {
  background: #166534;
}

.action-btn.call {
  background: #1E40AF;
}

.action-btn.raise {
  background: #92400E;
}

.action-btn.all-in {
  background: #5B21B6;
}

.raise-slider {
  flex: 1;
  min-width: 0;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  background: linear-gradient(to right, #92400E 0%, #92400E var(--fill, 0%), var(--outline) var(--fill, 0%), var(--outline) 100%);
  border-radius: 3px;
  cursor: pointer;
  outline: none;
  overscroll-behavior-x: contain;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
}

.raise-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  background: #B45309;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

.raise-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #B45309;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #fff;
}

.raise-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
}

.raise-value {
  font-family: 'Chakra Petch', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--secondary);
  min-width: 50px;
  text-align: right;
  flex-shrink: 0;
}

@media (orientation: landscape) and (max-width: 900px) {
  .action-panel {
    gap: 6px;
    padding: 10px;
    border-radius: 8px;
  }

  .action-btn {
    min-height: 36px;
    padding: 8px 8px;
    font-size: 12px;
    min-width: 50px;
  }

  .raise-value {
    font-size: 14px;
    min-width: 40px;
  }
}

@media (orientation: portrait) {
  .action-panel {
    flex: 1;
    min-width: 200px;
  }
}
</style>
