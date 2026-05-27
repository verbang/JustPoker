<template>
  <div class="chip-selector">
    <label>{{ label }}</label>
    <div class="options">
      <button
        v-for="option in options"
        :key="option"
        :class="{ selected: modelValue === option }"
        @click="$emit('update:modelValue', option)"
      >
        {{ option }}
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
