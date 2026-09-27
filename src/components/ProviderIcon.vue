<script setup lang="ts">
import { computed } from 'vue';

/** Square provider tile (generic monogram; no third-party logos). */
const props = withDefaults(defineProps<{ slug?: string | null | undefined; size?: number }>(), {
  slug: null,
  size: 48,
});

const styles: Record<string, { bg: string; fg: string; text: string }> = {
  openai: { bg: '#0d0d0d', fg: '#ffffff', text: 'O' },
  anthropic: { bg: '#f1e3cc', fg: '#1f1f1f', text: 'A' },
  google: { bg: '#1b2440', fg: '#8ab4ff', text: 'G' },
  deepseek: { bg: '#e8eeff', fg: '#3b5bdb', text: 'D' },
  xai: { bg: '#000000', fg: '#ffffff', text: 'X' },
};

const tile = computed(
  () =>
    styles[props.slug ?? ''] ?? {
      bg: '#2f2f2f',
      fg: '#ececec',
      text: (props.slug ?? '?').charAt(0).toUpperCase(),
    },
);
</script>

<template>
  <span
    class="tile"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      background: tile.bg,
      color: tile.fg,
      fontSize: `${size * 0.42}px`,
      borderRadius: `${size * 0.24}px`,
    }"
    aria-hidden="true"
    >{{ tile.text }}</span
  >
</template>

<style scoped>
.tile {
  display: inline-grid;
  place-items: center;
  flex: none;
  font-weight: 800;
  font-family: var(--mono);
}
</style>
