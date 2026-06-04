<template>
  <div class="chip-selector">
    <label class="field-label">{{ label }}</label>
    <div class="chip-options">
      <button
        v-for="option in options"
        :key="option"
        class="chip-option"
        :class="{ selected: modelValue === option }"
        @click="$emit('update:modelValue', option)"
      >
        ${{ option }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label?: string;
  options?: number[];
  modelValue: number;
}>();

defineEmits<{
  (e: 'update:modelValue', value: number): void;
}>();
</script>

<style scoped>
.chip-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 13px;
  color: var(--on-surface-variant);
  font-weight: 500;
}

.chip-options {
  display: flex;
  gap: 8px;
}

.chip-option {
  flex: 1;
  padding: 10px 0;
  border: 1px solid var(--outline);
  border-radius: var(--radius-input);
  background: var(--surface);
  color: var(--on-surface-variant);
  font-family: 'Chakra Petch', sans-serif;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 200ms;
  text-align: center;
}

.chip-option:hover {
  border-color: var(--primary);
  color: var(--on-surface);
}

.chip-option.selected {
  background: var(--primary-container);
  border-color: var(--primary);
  color: var(--on-surface);
}
</style>
