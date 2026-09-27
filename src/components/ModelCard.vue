<script setup lang="ts">
import { usd } from '../format';
import type { AiModel } from '../types';
import ProviderIcon from './ProviderIcon.vue';

defineProps<{ model: AiModel }>();
</script>

<template>
  <div class="model-card">
    <div class="head">
      <ProviderIcon :slug="model.provider?.slug" :size="48" />
      <div class="col">
        <div class="name">{{ model.name }}</div>
        <div class="desc">{{ model.description || model.provider?.name }}</div>
      </div>
    </div>
    <div class="price ltr">{{ usd(model.price.input) }}/M - {{ usd(model.price.output) }}/M</div>
  </div>
</template>

<style scoped>
.model-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: 100%;
}
.head {
  display: flex;
  gap: 14px;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--line);
}
.name {
  color: var(--ink-strong);
  font-size: 1rem;
}
.desc {
  color: var(--faint);
  font-size: 0.85rem;
  margin-top: 2px;
}
.price {
  color: var(--muted);
  font-size: 0.9rem;
  text-align: end;
}
</style>
