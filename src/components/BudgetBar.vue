<script setup lang="ts">
import { computed } from 'vue';
import { budgetPeriods, faDate, usd } from '../format';
import type { Budget } from '../types';

/** Spend of the current period against its limit; amber from 80%, red when full. */
const props = defineProps<{ budget: Budget; compact?: boolean }>();

const ratio = computed(() => {
  const limit = Number(props.budget.spend_limit);
  if (!limit) return props.budget.spend_limit === null ? 0 : 1;
  return Number(props.budget.spent_this_period) / limit;
});
const tone = computed(() => (ratio.value >= 1 ? 'full' : ratio.value >= 0.8 ? 'high' : 'ok'));
</script>

<template>
  <div v-if="budget.spend_limit !== null" class="budget" :class="[tone, { compact }]">
    <div class="line">
      <span>
        <span class="ltr amount">{{ usd(budget.spent_this_period) }}</span>
        <span class="faint"> از </span>
        <span class="ltr">{{ usd(budget.spend_limit) }}</span>
        <span class="faint period">{{ budgetPeriods[budget.spend_limit_period] }}</span>
      </span>
      <span v-if="!compact && budget.period_ends_at" class="faint reset">
        صفر شدن: {{ faDate(budget.period_ends_at) }}
      </span>
    </div>
    <div class="track">
      <div class="fill" :style="{ width: `${Math.min(ratio, 1) * 100}%` }" />
    </div>
  </div>
</template>

<style scoped>
.budget {
  font-size: 0.82rem;
}
.line {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.amount {
  color: var(--ink-strong);
  font-weight: 600;
}
.period {
  margin-inline-start: 4px;
}
.reset {
  font-size: 0.75rem;
}
.track {
  height: 6px;
  border-radius: 999px;
  background: var(--surface-3);
  overflow: hidden;
}
.compact .track {
  height: 4px;
}
.fill {
  height: 100%;
  border-radius: 999px;
  background: var(--brand);
  transition: width 0.3s;
}
.high .fill {
  background: var(--amber);
}
.full .fill {
  background: var(--danger);
}
.full .amount {
  color: #ff8a8e;
}
</style>
