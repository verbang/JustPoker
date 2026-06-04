<template>
  <div class="nickname-input">
    <label class="field-label">{{ label }}</label>
    <input
      class="field-input"
      v-model="nickname"
      :placeholder="placeholder"
      :maxlength="NICKNAME_MAX_LENGTH"
      @input="onInput"
    />
    <span v-if="error" class="field-error">{{ error }}</span>
    <span v-if="success" class="field-success">昵称可用</span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { NICKNAME_MIN_LENGTH, NICKNAME_MAX_LENGTH, NICKNAME_REGEX } from '../../../../shared/constants/game.constants';

const props = defineProps<{
  label?: string;
  placeholder?: string;
  existingNicknames?: string[];
}>();

const emit = defineEmits<{
  (e: 'update:nickname', value: string): void;
  (e: 'valid', value: boolean): void;
}>();

const nickname = ref('');
const error = ref('');
const success = ref(false);

// 过滤非法字符，只保留中文、英文、数字
function onInput() {
  nickname.value = nickname.value.replace(/[^一-龥a-zA-Z0-9]/g, '');
  validate();
}

function validate() {
  error.value = '';
  success.value = false;

  if (!nickname.value) {
    emit('valid', false);
    return;
  }

  if (nickname.value.length < NICKNAME_MIN_LENGTH) {
    error.value = `昵称至少${NICKNAME_MIN_LENGTH}个字符`;
    emit('valid', false);
    return;
  }

  if (!NICKNAME_REGEX.test(nickname.value)) {
    error.value = '仅支持中文、英文、数字';
    emit('valid', false);
    return;
  }

  const normalizedNickname = nickname.value.trim();
  const existingNicknames = props.existingNicknames?.map(name => name.trim()) ?? [];
  if (existingNicknames.includes(normalizedNickname)) {
    error.value = '昵称重复';
    emit('valid', false);
    return;
  }

  success.value = true;
  emit('update:nickname', nickname.value);
  emit('valid', true);
}

watch(() => props.existingNicknames, () => {
  if (nickname.value) validate();
});
</script>

<style scoped>
.nickname-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  color: var(--on-surface-variant);
  font-weight: 500;
}

.field-input {
  padding: 12px 14px;
  border: 1px solid var(--outline);
  border-radius: var(--radius-input);
  background: var(--surface);
  color: var(--on-surface);
  font-family: 'Chakra Petch', 'Noto Sans SC', sans-serif;
  font-size: 15px;
  outline: none;
  transition: border-color 200ms, box-shadow 200ms;
}

.field-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
}

.field-input::placeholder {
  color: var(--on-surface-variant);
  opacity: 0.6;
}

.field-error {
  font-size: 12px;
  color: var(--error);
}

.field-success {
  font-size: 12px;
  color: var(--tertiary);
}
</style>
