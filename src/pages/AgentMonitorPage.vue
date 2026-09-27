<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMeta, useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import {
  agentCatalog,
  createAgentInstance,
  deleteAgentInstance,
  errorMessage,
  getAgentInstance,
  listApps,
  runAgentInstance,
  updateAgentInstance,
} from '../api';
import { faDateTime, faNumber, scheduleSummary } from '../format';
import { useAuthStore } from '../stores/auth';
import type { Agent, AgentCatalog, AgentInstance, AgentInstanceDraft, App } from '../types';
import AgentDestinationsPanel from '../components/AgentDestinationsPanel.vue';
import AgentRunsPanel from '../components/AgentRunsPanel.vue';
import NewsMonitorForm from '../components/NewsMonitorForm.vue';

/** Create a news monitor, or read its reports, change its settings and destinations. */
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const $q = useQuasar();

// Computed: after creating, the route changes from /agents/new to /agents/:id in the same component.
const isNew = computed(() => route.params.id === 'new');
const canManage = computed(() => auth.can('manage-apps'));
const instance = ref<AgentInstance | null>(null);
const agent = ref<Agent | null>(null);
const bots = ref<AgentCatalog['delivery']>({ telegram_bot: null, bale_bot: null });
const apps = ref<App[]>([]);
const tab = ref<'reports' | 'settings' | 'destinations'>(isNew.value ? 'settings' : 'reports');
const saving = ref(false);
const starting = ref(false);
const runsPanel = ref<InstanceType<typeof AgentRunsPanel> | null>(null);
const draft = ref<AgentInstanceDraft>({
  app_id: null,
  name: '',
  config: {
    sources: [],
    keywords: [],
    exclude_keywords: [],
    instructions: null,
    max_items: 12,
    max_age_hours: 48,
    detail: 'brief',
    language: 'fa',
    notify_empty: false,
  },
  run_hours: [8],
  run_days: [],
});
const selectedRunId = route.query.run ? Number(route.query.run) : null;

useMeta(() => ({
  title: `${instance.value?.name ?? 'ایجنت جدید'} | پلتفرم توسعه‌دهندگان`,
}));

function fromInstance(value: AgentInstance): AgentInstanceDraft {
  return {
    app_id: value.app.id,
    name: value.name,
    config: { ...value.config, instructions: value.config.instructions ?? null },
    run_hours: [...value.run_hours],
    run_days: [...value.run_days],
  };
}

async function load(): Promise<void> {
  try {
    const [catalog, appList] = await Promise.all([agentCatalog(), listApps()]);
    bots.value = catalog.delivery;
    apps.value = appList;

    if (isNew.value) {
      agent.value =
        catalog.data.find((a) => a.id === Number(route.query.agent)) ?? catalog.data[0] ?? null;
      draft.value.app_id = appList[0]?.id ?? null;
      return;
    }

    instance.value = await getAgentInstance(Number(route.params.id));
    agent.value = catalog.data.find((a) => a.id === instance.value?.agent.id) ?? null;
    draft.value = fromInstance(instance.value);
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
    await router.replace('/agents');
  }
}

async function save(): Promise<void> {
  saving.value = true;
  try {
    if (isNew.value && agent.value) {
      const created = await createAgentInstance({ ...draft.value, agent_id: agent.value.id });
      $q.notify({ type: 'positive', message: 'ایجنت ساخته شد. حالا مقصد گزارش‌ها را اضافه کنید.' });
      await router.replace(`/agents/${created.id}`);
      instance.value = created;
      tab.value = 'destinations';
      return;
    }
    instance.value = await updateAgentInstance(instance.value!.id, draft.value);
    $q.notify({ type: 'positive', message: 'ذخیره شد.' });
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  } finally {
    saving.value = false;
  }
}

async function runNow(): Promise<void> {
  if (!instance.value) return;
  starting.value = true;
  try {
    await runAgentInstance(instance.value.id);
    tab.value = 'reports';
    await runsPanel.value?.refresh();
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  } finally {
    starting.value = false;
  }
}

async function setActive(active: boolean): Promise<void> {
  if (!instance.value) return;
  instance.value = await updateAgentInstance(instance.value.id, { is_active: active });
}

async function refreshCredits(): Promise<void> {
  const catalog = await agentCatalog().catch(() => null);
  agent.value = catalog?.data.find((a) => a.id === agent.value?.id) ?? agent.value;
  if (instance.value) instance.value = await getAgentInstance(instance.value.id);
}

function remove(): void {
  $q.dialog({
    title: 'حذف ایجنت',
    message: 'ایجنت و همهٔ گزارش‌هایش حذف می‌شوند. اعتبار باقی‌مانده برای سازمان می‌ماند.',
    cancel: { flat: true, label: 'انصراف', color: 'grey' },
    ok: { color: 'negative', unelevated: true, label: 'حذف' },
  }).onOk(() => {
    void deleteAgentInstance(instance.value!.id).then(() => router.replace('/agents'));
  });
}

onMounted(load);
</script>

<template>
  <q-page class="page">
    <div class="page-head">
      <div>
        <q-breadcrumbs class="faint text-caption q-mb-xs" active-color="grey">
          <q-breadcrumbs-el label="ایجنت‌ها" to="/agents" />
          <q-breadcrumbs-el :label="instance?.name ?? 'ایجنت جدید'" />
        </q-breadcrumbs>
        <h1>
          {{ instance?.name ?? `${agent?.name ?? 'ایجنت'} جدید` }}
          <q-badge
            v-if="instance && !instance.is_active"
            color="grey-8"
            label="متوقف"
            class="q-ml-sm"
          />
        </h1>
        <p v-if="instance">
          {{ scheduleSummary(instance.run_hours, instance.run_days) }}
          <template v-if="instance.is_active && instance.next_run_at">
            · اجرای بعدی {{ faDateTime(instance.next_run_at) }}
          </template>
        </p>
        <p v-else>{{ agent?.description }}</p>
      </div>
      <div v-if="instance" class="row items-center q-gutter-sm">
        <div v-if="agent" class="credits" :class="{ empty: agent.credits < 1 }">
          {{ faNumber(agent.credits) }} {{ agent.unit_name }} باقی‌مانده
          <router-link v-if="agent.credits < 5" to="/agents" class="buy">خرید</router-link>
        </div>
        <q-toggle
          v-if="canManage"
          :model-value="instance.is_active"
          color="primary"
          label="فعال"
          @update:model-value="setActive"
        />
        <q-btn
          v-if="canManage"
          unelevated
          no-caps
          class="btn-pill"
          icon="play_arrow"
          label="اجرای الان"
          :loading="starting"
          @click="runNow"
        />
      </div>
    </div>

    <div v-if="!isNew && !instance" class="flex flex-center q-pa-xl">
      <q-spinner size="lg" color="primary" />
    </div>

    <div v-else class="panel">
      <q-tabs
        v-if="instance"
        v-model="tab"
        align="left"
        no-caps
        active-color="white"
        indicator-color="primary"
        class="tabs"
      >
        <q-tab name="reports" icon="feed" label="گزارش‌ها" />
        <q-tab name="settings" icon="tune" label="تنظیمات" />
        <q-tab
          name="destinations"
          icon="forward_to_inbox"
          :label="`مقصدها (${faNumber(instance.destinations.length)})`"
        />
      </q-tabs>
      <q-separator v-if="instance" />
      <div class="panel-pad">
        <AgentRunsPanel
          v-if="instance && tab === 'reports'"
          ref="runsPanel"
          :instance-id="instance.id"
          :selected-run-id="selectedRunId"
          @finished="refreshCredits"
        />
        <template v-else-if="tab === 'settings'">
          <NewsMonitorForm v-model="draft" :apps="apps" :readonly="!canManage" />
          <div v-if="canManage" class="row items-center q-gutter-sm q-mt-xl">
            <q-btn
              unelevated
              no-caps
              class="btn-pill"
              :label="isNew ? 'ساخت ایجنت' : 'ذخیرهٔ تنظیمات'"
              :loading="saving"
              :disable="!draft.name || !draft.app_id || !draft.config.sources.length"
              @click="save"
            />
            <q-space />
            <q-btn
              v-if="instance"
              flat
              no-caps
              color="negative"
              label="حذف ایجنت"
              @click="remove"
            />
          </div>
        </template>
        <AgentDestinationsPanel
          v-else-if="instance && tab === 'destinations'"
          v-model="instance.destinations"
          :instance-id="instance.id"
          :bots="bots"
          :can-manage="canManage"
        />
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.tabs {
  color: var(--muted);
}
.credits {
  border: 1px solid rgb(50 148 106 / 50%);
  background: var(--brand-tint);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 0.85rem;
  color: var(--ink-strong);
}
.credits.empty {
  border-color: rgb(226 163 54 / 50%);
  background: var(--amber-tint);
}
.buy {
  color: #6fcf9f;
  margin-inline-start: 6px;
}
</style>
