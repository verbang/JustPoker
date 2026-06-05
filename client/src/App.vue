<template>
  <router-view />
</template>

<script setup lang="ts">
</script>

<style>
:root {
  --surface: #121212;
  --surface-elevated: #171717;
  --surface-container: #1E1E1E;
  --surface-container-high: #2C2C2C;
  --surface-container-soft: rgba(30,30,30,0.92);
  --primary: #6366F1;
  --primary-container: rgba(99,102,241,0.18);
  --primary-border: rgba(99,102,241,0.42);
  --on-primary-container: #C7D2FE;
  --secondary: #CA8A04;
  --tertiary: #22C55E;
  --error: #EF4444;
  --on-surface: #E4E4E7;
  --on-surface-variant: #A1A1AA;
  --outline: #3F3F46;
  --outline-soft: rgba(161,161,170,0.13);
  --shadow-panel: 0 16px 36px rgba(0,0,0,0.34);
  --shadow-table: 0 20px 44px rgba(0,0,0,0.52);
  --radius-button: 8px;
  --radius-card: 12px;
  --radius-input: 8px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Chakra Petch', 'Noto Sans SC', sans-serif;
  background:
    radial-gradient(circle at 50% 0%, rgba(63,63,70,0.38), transparent 30rem),
    radial-gradient(circle at 12% 24%, rgba(99,102,241,0.08), transparent 22rem),
    linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.014) 1px, transparent 1px),
    var(--surface);
  background-size: auto, auto, 28px 28px, 28px 28px, auto;
  color: var(--on-surface);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

button,
input {
  font: inherit;
}
</style>
