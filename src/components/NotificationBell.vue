<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { listNotifications, markNotificationsRead } from '../api';
import { faDateTime } from '../format';
import type { AppNotification } from '../types';

/** Spend limit alerts and agent reports; polled every minute while the panel is open. */
const router = useRouter();
const items = ref<AppNotification[]>([]);
const unread = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;

async function load(): Promise<void> {
  const result = await listNotifications().catch(() => null);
  if (!result) return;
  items.value = result.data;
  unread.value = result.unread_count;
}

async function opened(): Promise<void> {
  if (!unread.value) return;
  await markNotificationsRead().catch(() => undefined);
  unread.value = 0;
}

function open(item: AppNotification): void {
  const { data } = item;
  if (data.type === 'agent_report') {
    void router.push({
      path: `/agents/${data.agent_instance_id}`,
      query: { run: data.agent_run_id },
    });
  } else if (data.type === 'agent_no_credits') {
    void router.push('/agents');
  } else {
    void router.push(`/apps/${data.app_id}`);
  }
}

function icon(item: AppNotification): { name: string; color: string } {
  if (item.data.type === 'agent_report') return { name: 'feed', color: 'primary' };
  if (item.data.type === 'agent_no_credits') return { name: 'credit_card_off', color: 'warning' };
  return (item.data.level ?? 0) >= 100
    ? { name: 'block', color: 'negative' }
    : { name: 'warning_amber', color: 'warning' };
}

onMounted(() => {
  void load();
  timer = setInterval(() => void load(), 60_000);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <q-btn flat round dense class="q-ml-sm" icon="notifications_none" aria-label="اعلان‌ها">
    <q-badge v-if="unread" floating color="negative" rounded>{{ unread }}</q-badge>
    <q-menu anchor="bottom end" self="top end" :offset="[0, 8]" @show="opened">
      <div class="panel-head">اعلان‌ها</div>
      <q-list style="width: 360px; max-width: 92vw" class="q-pb-xs">
        <q-item v-if="!items.length">
          <q-item-section class="faint">اعلانی ندارید.</q-item-section>
        </q-item>
        <q-item
          v-for="item in items"
          :key="item.id"
          v-close-popup
          clickable
          :class="{ unread: !item.read_at }"
          @click="open(item)"
        >
          <q-item-section avatar>
            <q-icon :name="icon(item).name" :color="icon(item).color" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="ink-strong">{{ item.data.title }}</q-item-label>
            <q-item-label caption class="muted">{{ item.data.message }}</q-item-label>
            <q-item-label caption class="faint q-mt-xs">{{
              faDateTime(item.created_at)
            }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<style scoped>
.panel-head {
  padding: 12px 16px 6px;
  font-weight: 700;
  color: var(--ink-strong);
}
.unread {
  background: var(--brand-tint);
}
</style>
