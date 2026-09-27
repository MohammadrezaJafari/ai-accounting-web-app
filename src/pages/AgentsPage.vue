<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMeta, useQuasar } from 'quasar';
import { agentCatalog, errorMessage, listAgentInstances } from '../api';
import { agentRunStatuses, faDateTime, faNumber, scheduleSummary } from '../format';
import { useAuthStore } from '../stores/auth';
import type { Agent, AgentInstance } from '../types';

/** The organization's agents, set up from the store. */
useMeta({ title: 'ایجنت‌های من | پلتفرم توسعه‌دهندگان' });

const auth = useAuthStore();
const $q = useQuasar();

const instances = ref<AgentInstance[] | null>(null);
const agents = ref<Map<number, Agent>>(new Map());

const channelIcons: Record<string, string> = {
  telegram: 'send',
  bale: 'chat',
  email: 'mail_outline',
  webhook: 'webhook',
};

onMounted(async () => {
  try {
    const [catalog, list] = await Promise.all([agentCatalog(), listAgentInstances()]);
    agents.value = new Map(catalog.data.map((agent) => [agent.id, agent]));
    instances.value = list;
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  }
});
</script>

<template>
  <q-page class="page">
    <div class="page-head">
      <div>
        <h1>ایجنت‌های من</h1>
        <p>ایجنت‌هایی که سازمان راه‌اندازی کرده، با آخرین اجرا و مقصدهای ارسال.</p>
      </div>
      <q-btn
        v-if="auth.can('manage-apps')"
        unelevated
        no-caps
        class="btn-pill"
        icon="storefront"
        label="افزودن از بازارچه"
        to="/store"
      />
    </div>

    <div v-if="instances === null" class="flex flex-center q-pa-xl">
      <q-spinner size="lg" color="primary" />
    </div>

    <div v-else-if="!instances.length" class="panel empty">
      <q-icon name="smart_toy" size="44px" class="faint" />
      <p class="q-mt-md">هنوز ایجنتی راه‌اندازی نکرده‌اید.</p>
      <q-btn unelevated no-caps class="btn-pill q-mt-sm" label="رفتن به بازارچه" to="/store" />
    </div>

    <div v-else class="instances">
      <router-link
        v-for="instance in instances"
        :key="instance.id"
        :to="`/agents/${instance.id}`"
        class="panel panel-pad instance"
      >
        <div class="row items-center no-wrap">
          <span class="agent-icon"><q-icon :name="instance.agent.icon" size="22px" /></span>
          <div class="col ellipsis">
            <div class="ink-strong text-weight-bold ellipsis">{{ instance.name }}</div>
            <div class="faint text-caption">{{ instance.agent.name }}</div>
          </div>
          <q-badge v-if="!instance.is_active" color="grey-8" label="متوقف" />
        </div>
        <div class="meta q-mt-md">
          <div>
            <q-icon name="event_repeat" size="16px" class="faint q-mr-xs" />
            {{ scheduleSummary(instance.run_hours, instance.run_days) }}
          </div>
          <div
            v-if="agents.get(instance.agent.id)"
            :class="{ warn: agents.get(instance.agent.id)!.credits < 1 }"
          >
            <q-icon name="toll" size="16px" class="faint q-mr-xs" />
            {{ faNumber(agents.get(instance.agent.id)!.credits) }} {{ instance.agent.unit_name }}
            باقی‌مانده
          </div>
        </div>
        <div class="row items-center q-mt-md">
          <div class="col">
            <template v-if="instance.latest_run">
              <q-icon
                :name="agentRunStatuses[instance.latest_run.status]?.icon"
                :color="agentRunStatuses[instance.latest_run.status]?.color"
                size="18px"
              />
              <span class="text-caption q-ml-xs">
                {{ agentRunStatuses[instance.latest_run.status]?.label }} —
                {{ faDateTime(instance.latest_run.created_at) }}
              </span>
            </template>
            <span v-else class="faint text-caption">هنوز اجرا نشده</span>
          </div>
          <q-icon
            v-for="destination in instance.destinations"
            :key="destination.id"
            :name="channelIcons[destination.type]"
            size="18px"
            class="faint q-ml-xs"
          >
            <q-tooltip>{{ destination.type_label }}: {{ destination.label }}</q-tooltip>
          </q-icon>
        </div>
      </router-link>
    </div>
  </q-page>
</template>

<style scoped>
.instances {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}
.instance {
  display: block;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.instance:hover {
  border-color: var(--surface-3);
  background: var(--surface-2);
}
.agent-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  margin-inline-end: 12px;
  border-radius: 11px;
  background: var(--brand-tint);
  color: #6fcf9f;
}
.meta {
  display: grid;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--muted);
}
.warn {
  color: #e7b35a;
}
</style>
