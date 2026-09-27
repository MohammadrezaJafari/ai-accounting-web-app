<script setup lang="ts">
import { computed, ref } from 'vue';
import { faDay, faNumber, usd } from '../format';

/** Daily spend as a single-series bar chart; every day in the range gets a slot. */
const props = defineProps<{
  days: { day: string; charge: string; requests: number }[];
  range: number;
  /** What `requests` counts, in the tooltip. */
  countLabel?: string;
}>();

const hovered = ref<number | null>(null);

const series = computed(() => {
  const byDay = new Map(props.days.map((d) => [d.day, d]));
  return Array.from({ length: props.range }, (_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (props.range - 1 - index));
    const day = date.toISOString().slice(0, 10);
    const row = byDay.get(day);
    return { day, charge: Number(row?.charge ?? 0), requests: row?.requests ?? 0 };
  });
});

/** Round the scale up to 1, 2 or 5 × 10^n so axis labels stay readable. */
function niceCeil(value: number): number {
  if (value <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((s) => s * magnitude >= value) ?? 10;
  return step * magnitude;
}

const max = computed(() => niceCeil(Math.max(...series.value.map((d) => d.charge), 0)));
const ticks = computed(() => (max.value > 0 ? [max.value, max.value / 2, 0] : [0]));
const active = computed(() => (hovered.value === null ? null : series.value[hovered.value]));
</script>

<template>
  <div class="chart">
    <div class="axis">
      <span v-for="tick in ticks" :key="tick" class="ltr">{{ usd(tick) }}</span>
    </div>
    <div class="plot" @mouseleave="hovered = null">
      <div class="grid"><span /><span /><span /></div>
      <div class="bars">
        <div
          v-for="(point, index) in series"
          :key="point.day"
          class="slot"
          @mouseenter="hovered = index"
          @focus="hovered = index"
          @blur="hovered = null"
          tabindex="0"
          :aria-label="`${faDay(point.day)}: ${usd(point.charge)}`"
        >
          <div
            class="bar"
            :class="{ dim: hovered !== null && hovered !== index }"
            :style="{ height: max > 0 ? `${(point.charge / max) * 100}%` : '0' }"
          />
        </div>
      </div>
      <div v-if="active" class="tooltip">
        <strong>{{ faDay(active.day) }}</strong>
        <span class="ltr">{{ usd(active.charge) }}</span>
        <span class="muted">{{ faNumber(active.requests) }} {{ countLabel ?? 'درخواست' }}</span>
      </div>
    </div>
    <div class="labels">
      <span>{{ faDay(series[0]?.day ?? '') }}</span>
      <span>امروز</span>
    </div>
  </div>
</template>

<style scoped>
.chart {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: 180px auto;
  column-gap: 10px;
}
.axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 0.72rem;
  color: var(--faint);
  text-align: end;
}
.plot {
  position: relative;
  /* Time runs left-to-right even in RTL pages. */
  /* rtl:ignore */
  direction: ltr;
}
.grid {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}
.grid span {
  border-top: 1px dashed var(--line);
}
.grid span:last-child {
  border-top: 1px solid var(--surface-3);
}
.bars {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  gap: 2px;
}
.slot {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: flex-end;
  outline: none;
}
.bar {
  width: 100%;
  min-height: 0;
  background: var(--brand);
  border-radius: 4px 4px 0 0;
  transition: opacity 0.15s;
}
.bar.dim {
  opacity: 0.35;
}
.tooltip {
  position: absolute;
  top: 0;
  /* rtl:begin:ignore */
  left: 50%;
  transform: translateX(-50%);
  direction: rtl;
  /* rtl:end:ignore */
  display: flex;
  gap: 10px;
  align-items: center;
  background: var(--surface-3);
  border: 1px solid var(--line);
  color: var(--ink-strong);
  font-size: 0.8rem;
  border-radius: 8px;
  padding: 4px 10px;
  pointer-events: none;
  white-space: nowrap;
}
.tooltip .muted {
  color: var(--muted);
}
.labels {
  grid-column: 2;
  display: flex;
  /* rtl:ignore */
  direction: ltr;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--faint);
  margin-top: 6px;
}
</style>
