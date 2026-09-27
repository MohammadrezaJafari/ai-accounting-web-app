<script setup lang="ts">
import { copyToClipboard, useQuasar } from 'quasar';

const props = defineProps<{ text: string; label?: string }>();
const $q = useQuasar();

async function copy(): Promise<void> {
  await copyToClipboard(props.text);
  $q.notify({ type: 'positive', message: 'کپی شد.', timeout: 1200 });
}
</script>

<template>
  <q-btn flat dense round icon="content_copy" :aria-label="label ?? 'کپی'" @click="copy">
    <q-tooltip>{{ label ?? 'کپی' }}</q-tooltip>
  </q-btn>
</template>
