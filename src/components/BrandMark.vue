<script setup lang="ts">
defineProps<{ label?: string }>();
</script>

<template>
  <span class="brand">
    <span class="mark">AI</span>
    <span>{{ label ?? 'پلتفرم توسعه‌دهندگان' }}</span>
  </span>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 1.05rem;
  color: var(--ink-strong);
}
.mark {
  display: inline-grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: var(--ink-strong);
  color: #111;
  font-size: 0.78rem;
  font-weight: 800;
}
</style>
