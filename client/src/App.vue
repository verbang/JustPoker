<template>
  <router-view />
</template>

<script setup lang="ts">
</script>

<style>
:root {
  --surface: #0D1525;
  --surface-container: #1A2535;
  --surface-container-high: #243040;
  --primary: #64748B;
  --primary-container: rgba(100,116,139,0.15);
  --primary-border: rgba(100,116,139,0.3);
  --on-primary-container: #94A3B8;
  --secondary: #CA8A04;
  --tertiary: #22C55E;
  --error: #EF4444;
  --on-surface: #E4E4E7;
  --on-surface-variant: #94A3B8;
  --outline: #2A3A50;
  --radius-button: 12px;
  --radius-card: 16px;
  --radius-input: 8px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Chakra Petch', 'Noto Sans SC', sans-serif;
  background-color: var(--surface);
  color: var(--on-surface);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
</style>
