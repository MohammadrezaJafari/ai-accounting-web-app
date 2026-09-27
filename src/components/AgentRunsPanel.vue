<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { getAgentRun, listAgentRuns } from '../api';
import { agentRunStatuses, faDateTime, faNumber } from '../format';
import { renderMarkdown } from '../markdown';
import type { AgentRun } from '../types';

/** Runs of an agent instance with the selected run's report; refreshes while a run is in progress. */
const props = defineProps<{ instanceId: number; selectedRunId?: number | null }>();
const emit = defineEmits<{ finished: [] }>();

const runs = ref<AgentRun[] | null>(null);
const selected = ref<AgentRun | null>(null);
let timer: ReturnType<typeof setInterval> | undefined;

const inProgress = computed(() =>
  (runs.value ?? []).some((run) => run.status === 'queued' || run.status === 'running'),
);
const html = computed(() => (selected.value?.report ? renderMarkdown(selected.value.report) : ''));

async function select(id: number): Promise<void> {
  selected.value = await getAgentRun(id).catch(() => null);
}

async function refresh(): Promise<void> {
  const wasRunning = inProgress.value;
  runs.value = (await listAgentRuns(props.instanceId).catch(() => null))?.data ?? runs.value ?? [];
  const first = runs.value[0];
  if (!selected.value && first) await select(props.selectedRunId ?? first.id);
  else if (wasRunning && !inProgress.value && first) {
    await select(first.id);
    emit('finished');
  }
}

watch(inProgress, (running) => {
  clearInterval(timer);
  if (running) timer = setInterval(() => void refresh(), 3000);
});

onMounted(refresh);
onBeforeUnmount(() => clearInterval(timer));
defineExpose({ refresh });
</script>

<template>
  <div v-if="runs === null" class="flex flex-center q-pa-lg"><q-spinner color="primary" /></div>
  <div v-else-if="!runs.length" class="empty">
    <q-icon name="feed" size="40px" class="faint" />
    <p class="q-mt-md">هنوز گزارشی ساخته نشده. «اجرای الان» را بزنید یا منتظر زمان‌بندی بمانید.</p>
  </div>
  <div v-else class="runs">
    <div class="list">
      <button
        v-for="run in runs"
        :key="run.id"
        type="button"
        class="run"
        :class="{ active: selected?.id === run.id }"
        @click="select(run.id)"
      >
        <q-icon
          :name="agentRunStatuses[run.status]?.icon"
          :color="agentRunStatuses[run.status]?.color"
          size="20px"
          :class="{ spin: run.status === 'running' }"
        />
        <span class="col">
          <span class="run-title">{{ agentRunStatuses[run.status]?.label }}</span>
          <span class="run-time">
            {{ faDateTime(run.created_at) }}
            <template v-if="run.units > 1">، {{ faNumber(run.units) }} واحد</template>
          </span>
        </span>
        <q-icon v-if="run.trigger === 'manual'" name="touch_app" size="15px" class="faint">
          <q-tooltip>اجرای دستی</q-tooltip>
        </q-icon>
      </button>
    </div>

    <div class="viewer panel panel-pad">
      <template v-if="selected">
        <div class="row items-center q-mb-md q-gutter-sm">
          <q-chip
            dense
            square
            :color="agentRunStatuses[selected.status]?.color"
            text-color="white"
            :icon="agentRunStatuses[selected.status]?.icon"
            :label="agentRunStatuses[selected.status]?.label"
          />
          <span class="faint text-caption">{{ faDateTime(selected.created_at) }}</span>
          <span v-if="selected.units" class="faint text-caption">
            — {{ faNumber(selected.units) }} واحد اعتبار مصرف شد
          </span>
        </div>

        <div v-if="selected.error" class="error-banner q-mb-md">{{ selected.error }}</div>
        <div v-if="selected.status === 'running' || selected.status === 'queued'" class="muted">
          <q-spinner size="18px" class="q-mr-sm" /> ایجنت در حال کار است…
        </div>
        <div v-if="selected.status === 'empty'" class="muted">
          در این نوبت چیز تازه‌ای پیدا نشد؛ اعتباری مصرف نشد.
        </div>

        <!-- eslint-disable-next-line vue/no-v-html -- sanitized by DOMPurify in renderMarkdown -->
        <div v-if="html" class="report" v-html="html" />

        <div v-if="selected.meta && Object.keys(selected.meta).length" class="facts">
          <span v-for="note in selected.meta.notes ?? []" :key="note">{{ note }}</span>
          <span v-for="error in selected.meta.errors ?? []" :key="error" class="warn">
            <q-icon name="warning_amber" size="15px" /> {{ error }}
          </span>
          <span v-for="delivery in selected.meta.deliveries ?? []" :key="delivery.destination_id">
            <q-icon
              :name="delivery.ok ? 'check_circle' : 'cancel'"
              :color="delivery.ok ? 'positive' : 'negative'"
              size="15px"
            />
            {{ delivery.label }}{{ delivery.ok ? ': ارسال شد' : `: ${delivery.error}` }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.runs {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
.list {
  display: grid;
  gap: 4px;
  max-height: 70vh;
  overflow-y: auto;
}
.run {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}
.run:hover {
  background: var(--surface);
}
.run.active {
  background: var(--surface-2);
  border-color: var(--line);
}
.run-title {
  display: block;
  color: var(--ink-strong);
  font-size: 0.88rem;
}
.run-time {
  display: block;
  color: var(--faint);
  font-size: 0.75rem;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.viewer {
  min-height: 300px;
}
.report {
  line-height: 1.9;
  overflow-wrap: anywhere;
}
.report :deep(p),
.report :deep(li) {
  unicode-bidi: plaintext;
}
.report :deep(h2) {
  font-size: 1.15rem;
  margin: 20px 0 8px;
}
.report :deep(h2:first-child) {
  margin-top: 0;
}
.report :deep(h3) {
  font-size: 1rem;
  margin: 18px 0 6px;
}
.report :deep(p) {
  margin: 0 0 10px;
}
.report :deep(a) {
  color: #6fcf9f;
}
.facts {
  display: grid;
  gap: 6px;
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  font-size: 0.8rem;
  color: var(--muted);
}
.warn {
  color: #e7b35a;
}
@media (max-width: 1023px) {
  .runs {
    grid-template-columns: 1fr;
  }
  .list {
    max-height: 240px;
  }
}
</style>
