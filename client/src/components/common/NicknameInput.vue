<template>
  <div class="nickname-input">
    <label>{{ label }}</label>
    <input
      v-model="nickname"
      :placeholder="placeholder"
      maxlength="10"
      @input="validate"
    />
    <span v-if="error" class="error">{{ error }}</span>
    <span v-if="success" class="success">昵称可用</span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

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

function validate() {
  error.value = '';
  success.value = false;

  if (!nickname.value) {
    emit('valid', false);
    return;
  }

  if (nickname.value.length < 2) {
    error.value = '昵称至少2个字符';
    emit('valid', false);
    return;
  }

  const regex = /^[一-龥a-zA-Z0-9]+$/;
  if (!regex.test(nickname.value)) {
    error.value = '仅支持中文、英文、数字';
    emit('valid', false);
    return;
  }

  if (props.existingNicknames?.includes(nickname.value)) {
    error.value = '昵称已存在！';
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
