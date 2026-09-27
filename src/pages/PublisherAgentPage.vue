<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { copyToClipboard, useMeta, useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import {
  createPublisherAgent,
  deletePublisherAgent,
  errorMessage,
  getPublisherAgent,
  getPublisherRun,
  importPublisherManifest,
  listPublisherRuns,
  pingPublisherAgent,
  rotatePublisherSecret,
  startPublisherTestRun,
  submitPublisherAgent,
  updatePublisherAgent,
} from '../api';
import { cloneConfig, defaultConfig, missingFields } from '../agentConfig';
import { agentRunStatuses, faDateTime, faNumber, usd } from '../format';
import { renderMarkdown } from '../markdown';
import type {
  AgentConfig,
  PublisherAgent,
  PublisherAgentDraft,
  PublisherAgentStatus,
  PublisherRun,
} from '../types';
import AgentConfigFields from '../components/AgentConfigFields.vue';
import ConfigSchemaEditor from '../components/ConfigSchemaEditor.vue';

/** A publisher builds, tests and submits its marketplace listing, and sees how it sells. */
const route = useRoute();
const router = useRouter();
const $q = useQuasar();

const isNew = computed(() => route.params.id === 'new');
const agent = ref<PublisherAgent | null>(null);
const tab = ref<'listing' | 'parameters' | 'connection' | 'performance'>('listing');
const saving = ref(false);
const draft = ref<PublisherAgentDraft>(emptyDraft());
const savedJson = ref(JSON.stringify(draft.value));
const dirty = computed(() => JSON.stringify(draft.value) !== savedJson.value);
const editable = computed(() => !agent.value || ['draft', 'rejected'].includes(agent.value.status));
const descriptionHtml = computed(() =>
  draft.value.description ? renderMarkdown(draft.value.description) : '',
);

const previewConfig = ref<AgentConfig>({});
const testConfig = ref<AgentConfig>({});
const runs = ref<PublisherRun[]>([]);
const testRun = ref<PublisherRun | null>(null);
const testing = ref(false);
const pinging = ref(false);
const manifestUrl = ref('');
let poll: ReturnType<typeof setInterval> | undefined;

useMeta(() => ({ title: `${agent.value?.name ?? 'ایجنت جدید'} | پنل ناشر` }));

const statusColors: Record<PublisherAgentStatus, string> = {
  draft: 'grey-8',
  pending_review: 'warning',
  approved: 'positive',
  rejected: 'negative',
};

function emptyDraft(): PublisherAgentDraft {
  return {
    slug: '',
    name: '',
    tagline: null,
    description: null,
    icon: 'smart_toy',
    category: null,
    unit_name: 'گزارش',
    max_units_per_run: 1,
    endpoint_url: null,
    timeout_seconds: 60,
    run_deadline_minutes: 15,
    max_cost_per_run: '0.10',
    config_schema: [],
    packages: [
      { units: 30, price: '9.00' },
      { units: 100, price: '25.00' },
    ],
  };
}

/** The listing as the publisher last left it: pending changes over the live values. */
function toDraft(value: PublisherAgent): PublisherAgentDraft {
  const merged = { ...value, ...(value.pending_changes ?? {}) };
  return JSON.parse(
    JSON.stringify({
      name: merged.name,
      tagline: merged.tagline,
      description: merged.description,
      icon: merged.icon,
      category: merged.category,
      unit_name: merged.unit_name,
      max_units_per_run: merged.max_units_per_run,
      endpoint_url: merged.endpoint_url,
      timeout_seconds: merged.timeout_seconds,
      run_deadline_minutes: merged.run_deadline_minutes,
      max_cost_per_run: value.terms.max_cost_per_run ?? '0.10',
      config_schema: merged.config_schema,
      packages: merged.packages,
    }),
  ) as PublisherAgentDraft;
}

function setAgent(value: PublisherAgent): void {
  agent.value = value;
  draft.value = toDraft(value);
  savedJson.value = JSON.stringify(draft.value);
}

async function load(): Promise<void> {
  if (isNew.value) return;
  try {
    setAgent(await getPublisherAgent(Number(route.params.id)));
    testConfig.value = defaultConfig(draft.value.config_schema);
    runs.value = await listPublisherRuns(agent.value!.id);
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
    await router.replace('/publisher');
  }
}

watch(
  () => draft.value.config_schema,
  (schema) => {
    previewConfig.value = defaultConfig(schema);
    const kept = cloneConfig(testConfig.value);
    testConfig.value = { ...defaultConfig(schema), ...kept };
  },
  { deep: true },
);

async function save(): Promise<void> {
  saving.value = true;
  try {
    if (isNew.value) {
      const created = await createPublisherAgent(draft.value);
      setAgent(created);
      await router.replace(`/publisher/agents/${created.id}`);
      $q.notify({ type: 'positive', message: 'پیش‌نویس ساخته شد. حالا اتصال را آزمایش کنید.' });
      tab.value = 'connection';
      return;
    }
    const changes: Partial<PublisherAgentDraft> = { ...draft.value };
    delete changes.slug;
    setAgent(await updatePublisherAgent(agent.value!.id, changes));
    $q.notify({
      type: 'positive',
      message:
        editable.value || !agent.value?.pending_changes
          ? 'ذخیره شد.'
          : 'ذخیره شد؛ تغییرات فهرست پس از بررسی به مشتری‌ها می‌رسد.',
    });
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception), timeout: 6000 });
  } finally {
    saving.value = false;
  }
}

async function submit(): Promise<void> {
  if (dirty.value) await save();
  try {
    setAgent(await submitPublisherAgent(agent.value!.id));
    $q.notify({ type: 'positive', message: 'برای بررسی فرستاده شد. نتیجه را خبر می‌دهیم.' });
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception), timeout: 6000 });
  }
}

async function ping(): Promise<void> {
  pinging.value = true;
  try {
    const result = await pingPublisherAgent(agent.value!.id);
    $q.notify(
      result.ok
        ? { type: 'positive', message: 'سرویس شما پاسخ داد و امضا را پذیرفت.' }
        : { type: 'negative', message: result.error ?? 'اتصال برقرار نشد.', timeout: 6000 },
    );
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  } finally {
    pinging.value = false;
  }
}

function rotate(): void {
  $q.dialog({
    title: 'کلید امضای جدید',
    message: 'کلید فعلی بلافاصله از کار می‌افتد و سرویس شما باید کلید جدید را بگیرد.',
    cancel: { flat: true, label: 'انصراف', color: 'grey' },
    ok: { color: 'warning', unelevated: true, label: 'ساخت کلید جدید' },
  }).onOk(() => {
    void rotatePublisherSecret(agent.value!.id).then((value) => (agent.value = value));
  });
}

async function importManifest(): Promise<void> {
  try {
    const fields = await importPublisherManifest(manifestUrl.value);
    draft.value = { ...draft.value, ...JSON.parse(JSON.stringify(fields)) };
    $q.notify({ type: 'positive', message: 'مشخصات از manifest خوانده شد؛ بررسی و ذخیره کنید.' });
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception), timeout: 6000 });
  }
}

async function runTest(): Promise<void> {
  if (dirty.value) await save();
  testing.value = true;
  try {
    const run = await startPublisherTestRun(agent.value!.id, testConfig.value);
    testRun.value = { ...(run as unknown as PublisherRun), notes: [], warnings: [], cost: '0' };
    clearInterval(poll);
    const started = Date.now();
    poll = setInterval(() => {
      void getPublisherRun(agent.value!.id, run.id).then(async (value) => {
        testRun.value = value;
        const done = !['queued', 'running'].includes(value.status);
        if (done || Date.now() - started > 16 * 60_000) {
          clearInterval(poll);
          testing.value = false;
          runs.value = await listPublisherRuns(agent.value!.id);
        }
      });
    }, 2000);
  } catch (exception) {
    testing.value = false;
    $q.notify({ type: 'negative', message: errorMessage(exception), timeout: 6000 });
  }
}

function remove(): void {
  $q.dialog({
    title: 'حذف پیش‌نویس',
    message: 'این ایجنت و اجراهای آزمایشی‌اش حذف می‌شوند.',
    cancel: { flat: true, label: 'انصراف', color: 'grey' },
    ok: { color: 'negative', unelevated: true, label: 'حذف' },
  }).onOk(() => {
    void deletePublisherAgent(agent.value!.id).then(() => router.replace('/publisher'));
  });
}

function addPackage(): void {
  const last = draft.value.packages.at(-1);
  draft.value.packages.push({
    units: (last?.units ?? 10) * 2,
    price: String((Number(last?.price ?? 5) * 1.8).toFixed(2)),
  });
}

function unitPrice(pack: { units: number; price: string }): string {
  return usd(String(Number(pack.price) / Math.max(1, pack.units)));
}

const missingForTest = computed(() => missingFields(draft.value.config_schema, testConfig.value));
const missingForCustomer = computed(() =>
  missingFields(draft.value.config_schema, previewConfig.value),
);

onMounted(load);
onBeforeUnmount(() => clearInterval(poll));
</script>

<template>
  <q-page class="page">
    <div class="page-head">
      <div>
        <q-breadcrumbs class="faint text-caption q-mb-xs" active-color="grey">
          <q-breadcrumbs-el label="پنل ناشر" to="/publisher" />
          <q-breadcrumbs-el :label="agent?.name ?? 'ایجنت جدید'" />
        </q-breadcrumbs>
        <h1>
          {{ agent?.name ?? 'انتشار ایجنت جدید' }}
          <q-badge
            v-if="agent"
            :color="statusColors[agent.status]"
            :label="agent.status_label"
            class="q-ml-sm"
          />
        </h1>
        <p v-if="!agent">
          ایجنت شما سرویس خودتان است؛ ما فروش، فرم تنظیمات مشتری، زمان‌بندی، دسترسی به مدل‌ها و
          ارسال خروجی را انجام می‌دهیم.
        </p>
        <p v-else class="ltr faint">{{ agent.slug }}</p>
      </div>
      <div v-if="agent" class="row items-center q-gutter-sm">
        <q-btn
          v-if="agent.is_live"
          flat
          no-caps
          class="btn-ghost-pill"
          icon="storefront"
          label="در بازارچه"
          :to="`/store/${agent.id}`"
        />
        <q-btn
          v-if="editable"
          unelevated
          no-caps
          class="btn-pill"
          icon="send"
          label="ارسال برای بررسی"
          @click="submit"
        />
      </div>
    </div>

    <div v-if="agent?.review_note" class="error-banner q-mb-md">
      <b>یادداشت بررسی:</b> {{ agent.review_note }}
    </div>
    <div v-if="agent?.status === 'pending_review'" class="note-banner q-mb-md">
      در انتظار بررسی است. تغییراتی که حالا بدهید هم همراه آن بررسی می‌شود.
    </div>
    <div
      v-else-if="agent?.status === 'approved' && agent.pending_changes"
      class="note-banner q-mb-md"
    >
      تغییرات شما در انتظار بررسی است؛ تا تأیید، مشتری‌ها نسخهٔ فعلی را می‌بینند. اجرای آزمایشی با
      تغییرات تازه انجام می‌شود.
    </div>
    <div v-else-if="agent?.status === 'approved'" class="note-banner q-mb-md">
      منتشر شده است. هر تغییری پس از بررسی به مشتری‌ها می‌رسد.
    </div>

    <div v-if="!isNew && !agent" class="flex flex-center q-pa-xl">
      <q-spinner size="lg" color="primary" />
    </div>

    <div v-else class="panel">
      <q-tabs
        v-model="tab"
        align="left"
        no-caps
        active-color="white"
        indicator-color="primary"
        class="tabs"
      >
        <q-tab name="listing" icon="storefront" label="معرفی و قیمت" />
        <q-tab
          name="parameters"
          icon="tune"
          :label="`پارامترها (${faNumber(draft.config_schema.length)})`"
        />
        <q-tab name="connection" icon="cable" label="اتصال و آزمایش" :disable="!agent" />
        <q-tab name="performance" icon="insights" label="عملکرد" :disable="!agent" />
      </q-tabs>
      <q-separator />

      <div class="panel-pad">
        <!-- Listing and pricing -->
        <div v-if="tab === 'listing'" class="form">
          <section>
            <h3>معرفی</h3>
            <div class="grid-2">
              <q-input v-model="draft.name" outlined label="نام *" />
              <q-input
                v-if="isNew"
                v-model="draft.slug"
                outlined
                label="شناسه *"
                hint="انگلیسی، مثل lead-finder؛ بعداً عوض نمی‌شود"
                input-class="ltr"
              />
              <q-input
                v-model="draft.category"
                outlined
                label="دسته"
                placeholder="مثلاً فروش و بازاریابی"
              />
              <q-input
                v-model="draft.icon"
                outlined
                label="آیکون"
                hint="نام یک آیکون Material، مثل person_search"
                input-class="ltr"
              >
                <template #append><q-icon :name="draft.icon || 'smart_toy'" /></template>
              </q-input>
              <q-input
                v-model="draft.tagline"
                outlined
                label="معرفی یک‌خطی"
                class="wide"
                placeholder="در کارت بازارچه دیده می‌شود"
              />
            </div>
            <div class="grid-2 q-mt-md">
              <q-input
                v-model="draft.description"
                outlined
                type="textarea"
                autogrow
                label="توضیح کامل *"
                hint="Markdown؛ چه می‌کند، خروجی‌اش چیست، برای چه کسی است"
                input-style="min-height: 160px"
              />
              <div class="preview">
                <div class="field-label">پیش‌نمایش</div>
                <!-- eslint-disable-next-line vue/no-v-html -- sanitized by DOMPurify in renderMarkdown -->
                <div v-if="descriptionHtml" class="description" v-html="descriptionHtml" />
                <p v-else class="faint">توضیح را بنویسید تا اینجا ببینید.</p>
              </div>
            </div>
          </section>

          <section>
            <h3>واحد فروش و بسته‌ها</h3>
            <div class="grid-2">
              <q-input
                v-model="draft.unit_name"
                outlined
                label="نام واحد *"
                hint="چیزی که مشتری می‌خرد، مثل گزارش یا مشتری بالقوه"
              />
              <q-input
                v-model.number="draft.max_units_per_run"
                outlined
                type="number"
                label="حداکثر واحد در هر اجرا"
                hint="اگر خروجی هر اجرا چند واحد می‌ارزد (مثلاً به ازای هر مورد پیدا شده)"
              />
            </div>
            <div class="packages q-mt-md">
              <div v-for="(pack, index) in draft.packages" :key="index" class="pack">
                <q-input
                  v-model.number="pack.units"
                  outlined
                  dense
                  type="number"
                  :label="`تعداد ${draft.unit_name}`"
                />
                <q-input
                  v-model="pack.price"
                  outlined
                  dense
                  type="number"
                  label="قیمت"
                  prefix="$"
                  input-class="ltr"
                />
                <span class="faint text-caption">
                  هر {{ draft.unit_name }} <span class="ltr">{{ unitPrice(pack) }}</span>
                </span>
                <q-btn
                  flat
                  round
                  dense
                  size="sm"
                  icon="close"
                  color="grey"
                  aria-label="حذف بسته"
                  @click="draft.packages.splice(index, 1)"
                />
              </div>
              <q-btn
                v-if="draft.packages.length < 6"
                flat
                dense
                no-caps
                icon="add"
                color="primary"
                label="بستهٔ دیگر"
                @click="addPackage"
              />
            </div>
            <p v-if="agent" class="faint text-caption q-mt-md q-mb-none">
              سهم شما {{ faNumber(agent.terms.revenue_share) }}٪ از فروش است.
            </p>
          </section>

          <section>
            <h3>هزینهٔ مدل</h3>
            <p class="muted">
              هزینهٔ مدل‌هایی که ایجنت از طریق پلتفرم صدا می‌زند، در همهٔ اجراها (حتی اجراهای
              بی‌نتیجه و آزمایشی)، از سهم شما کم می‌شود. با این سقف، اجرایی که هزینه‌اش به آن برسد
              درخواست بعدی به مدل را نمی‌تواند بفرستد.
            </p>
            <div class="grid-2">
              <q-input
                v-model="draft.max_cost_per_run"
                outlined
                type="number"
                step="0.01"
                prefix="$"
                input-class="ltr"
                label="سقف هزینهٔ مدل در هر اجرا"
                :hint="`بین ۰٫۰۱ و ${usd(agent?.terms.max_cost_ceiling ?? '1')}؛ بدون نیاز به بررسی اعمال می‌شود`"
              />
              <div v-if="agent?.stats?.avg_run_cost" class="cost-facts">
                <div>
                  میانگین هزینهٔ هر اجرا تا حالا:
                  <span class="ltr ink-strong">{{ usd(agent.stats.avg_run_cost) }}</span>
                </div>
                <div>
                  گران‌ترین اجرا:
                  <span class="ltr ink-strong">{{ usd(agent.stats.max_run_cost ?? '0') }}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Parameters -->
        <div v-else-if="tab === 'parameters'" class="params">
          <ConfigSchemaEditor v-model="draft.config_schema" />
          <aside>
            <div class="field-label">فرمی که مشتری می‌بیند</div>
            <div class="panel panel-pad">
              <AgentConfigFields
                v-if="draft.config_schema.length"
                v-model="previewConfig"
                :fields="draft.config_schema"
              />
              <p v-else class="faint q-mb-none">هنوز پارامتری ندارد.</p>
              <p v-if="missingForCustomer.length" class="faint text-caption q-mt-md q-mb-none">
                اجباری: {{ missingForCustomer.join('، ') }}
              </p>
            </div>
          </aside>
        </div>

        <!-- Connection and testing -->
        <div v-else-if="tab === 'connection' && agent" class="form">
          <section>
            <h3>سرویس شما</h3>
            <div class="grid-2">
              <q-input
                v-model="draft.endpoint_url"
                outlined
                label="آدرس سرویس *"
                placeholder="https://agent.example.com/run"
                hint="باید روی اینترنت عمومی باشد"
                input-class="ltr"
                class="wide"
              />
              <q-input
                v-model.number="draft.timeout_seconds"
                outlined
                type="number"
                label="مهلت پاسخ مستقیم (ثانیه)"
              />
              <q-input
                v-model.number="draft.run_deadline_minutes"
                outlined
                type="number"
                label="مهلت ارسال نتیجه (دقیقه)"
                hint="اگر کار را با 202 می‌پذیرید و نتیجه را بعداً می‌فرستید"
              />
            </div>
            <div class="secret q-mt-md">
              <div class="col">
                <div class="field-label q-mb-xs">کلید امضا</div>
                <code class="ltr">{{ agent.signing_secret }}</code>
                <div class="faint text-caption q-mt-xs">
                  هر درخواست هدر <code>X-Agent-Signature</code> دارد: HMAC-SHA256 رشتهٔ
                  <code>timestamp.body</code> با این کلید.
                </div>
              </div>
              <q-btn
                flat
                dense
                no-caps
                icon="content_copy"
                label="کپی"
                @click="copyToClipboard(agent.signing_secret)"
              />
              <q-btn
                flat
                dense
                no-caps
                icon="autorenew"
                color="warning"
                label="کلید جدید"
                @click="rotate"
              />
            </div>
            <div class="row items-center q-gutter-sm q-mt-md">
              <q-btn
                outline
                no-caps
                icon="network_ping"
                label="تست اتصال"
                :loading="pinging"
                :disable="!draft.endpoint_url"
                @click="ping"
              />
              <span class="faint text-caption"
                >درخواست امضاشدهٔ <code>{"event":"ping"}</code> می‌فرستد و پاسخ 2xx می‌خواهد.</span
              >
            </div>
          </section>

          <section>
            <h3>اجرای آزمایشی</h3>
            <p class="muted">
              ایجنت را با پارامترهای دلخواه اجرا کنید؛ اعتباری مصرف نمی‌شود و خروجی به جایی فرستاده
              نمی‌شود. سرویس شما درخواست را دقیقاً مثل اجرای مشتری می‌گیرد.
            </p>
            <div class="test">
              <div class="panel panel-pad">
                <AgentConfigFields
                  v-if="draft.config_schema.length"
                  v-model="testConfig"
                  :fields="draft.config_schema"
                />
                <q-btn
                  unelevated
                  no-caps
                  class="btn-pill q-mt-md"
                  icon="play_arrow"
                  label="اجرای آزمایشی"
                  :loading="testing"
                  :disable="!draft.endpoint_url || missingForTest.length > 0"
                  @click="runTest"
                />
                <span v-if="missingForTest.length" class="faint text-caption q-ml-sm">
                  لازم: {{ missingForTest.join('، ') }}
                </span>
              </div>
              <div class="panel panel-pad result">
                <template v-if="testRun">
                  <div class="row items-center q-gutter-sm q-mb-md">
                    <q-chip
                      dense
                      square
                      :color="agentRunStatuses[testRun.status]?.color"
                      text-color="white"
                      :icon="agentRunStatuses[testRun.status]?.icon"
                      :label="agentRunStatuses[testRun.status]?.label"
                    />
                    <span v-if="testRun.duration_ms !== null" class="faint text-caption">
                      {{ faNumber(Math.round(testRun.duration_ms / 100) / 10) }} ثانیه
                    </span>
                    <span v-if="testRun.units" class="faint text-caption">
                      — ارزش {{ faNumber(testRun.units) }} {{ draft.unit_name }}
                    </span>
                    <span v-if="Number(testRun.cost) > 0" class="faint text-caption">
                      — هزینهٔ مدل <span class="ltr">{{ usd(testRun.cost) }}</span> (از سهم شما)
                    </span>
                  </div>
                  <div v-if="['queued', 'running'].includes(testRun.status)" class="muted">
                    <q-spinner size="18px" class="q-mr-sm" /> منتظر پاسخ سرویس شما…
                  </div>
                  <div v-if="testRun.error" class="error-banner">{{ testRun.error }}</div>
                  <!-- eslint-disable-next-line vue/no-v-html -- sanitized by DOMPurify in renderMarkdown -->
                  <div
                    v-if="testRun.report"
                    class="description"
                    v-html="renderMarkdown(testRun.report)"
                  />
                  <div v-for="note in testRun.notes" :key="note" class="faint text-caption">
                    {{ note }}
                  </div>
                  <div v-for="warning in testRun.warnings" :key="warning" class="warn text-caption">
                    <q-icon name="warning_amber" size="14px" /> {{ warning }}
                  </div>
                  <pre v-if="testRun.data" class="data ltr">{{
                    JSON.stringify(testRun.data, null, 2)
                  }}</pre>
                </template>
                <p v-else class="faint q-mb-none">نتیجهٔ اجرای آزمایشی اینجا نمایش داده می‌شود.</p>
              </div>
            </div>
          </section>

          <section v-if="editable">
            <h3>بارگذاری از manifest</h3>
            <div class="row items-start q-gutter-sm">
              <q-input
                v-model="manifestUrl"
                outlined
                dense
                class="col"
                placeholder="https://agent.example.com/manifest.json"
                input-class="ltr"
                hint="مشخصات و پارامترها از فایل JSON شما خوانده و در فرم گذاشته می‌شود"
              />
              <q-btn
                outline
                no-caps
                label="خواندن"
                :disable="!manifestUrl"
                @click="importManifest"
              />
            </div>
          </section>
        </div>

        <!-- Performance -->
        <div v-else-if="tab === 'performance' && agent" class="form">
          <div v-if="agent.stats" class="tiles">
            <div class="tile">
              <div class="tile-value">{{ faNumber(agent.stats.units) }}</div>
              <div class="tile-label">{{ agent.unit_name }} فروخته‌شده</div>
            </div>
            <div class="tile">
              <div class="tile-value ltr">{{ usd(agent.stats.earned) }}</div>
              <div class="tile-label">درآمد خالص شما</div>
              <div class="tile-note">
                سهم فروش <span class="ltr">{{ usd(agent.stats.share) }}</span> منهای هزینهٔ مدل
                <span class="ltr">{{ usd(agent.stats.cost) }}</span>
              </div>
            </div>
            <div class="tile">
              <div class="tile-value">{{ faNumber(agent.stats.customers) }}</div>
              <div class="tile-label">
                مشتری ({{ faNumber(agent.stats.active_instances) }} ایجنت فعال)
              </div>
            </div>
            <div class="tile" :class="{ bad: (agent.stats.failure_rate ?? 0) > 10 }">
              <div class="tile-value">
                {{
                  agent.stats.failure_rate === null ? '—' : `${faNumber(agent.stats.failure_rate)}٪`
                }}
              </div>
              <div class="tile-label">اجرای ناموفق</div>
            </div>
          </div>
          <section>
            <h3>اجراهای اخیر</h3>
            <p class="faint text-caption">
              از اجراهای مشتری‌ها فقط وضعیت و خطا را می‌بینید؛ خروجی و تنظیمات مشتری خصوصی است.
            </p>
            <div v-if="!runs.length" class="faint">هنوز اجرایی نداشته است.</div>
            <div v-else class="runs">
              <div v-for="run in runs" :key="run.id" class="run">
                <q-icon
                  :name="agentRunStatuses[run.status]?.icon"
                  :color="agentRunStatuses[run.status]?.color"
                  size="18px"
                />
                <span class="col">
                  <span class="ink-strong">{{ agentRunStatuses[run.status]?.label }}</span>
                  <span v-if="run.trigger === 'test'" class="tag">آزمایشی</span>
                  <span v-if="run.error" class="error-text text-caption block">{{
                    run.error
                  }}</span>
                </span>
                <span class="faint text-caption">
                  {{ run.units ? `${faNumber(run.units)} واحد — ` : '' }}
                  <template v-if="Number(run.cost) > 0">
                    هزینهٔ مدل <span class="ltr">{{ usd(run.cost) }}</span> —
                  </template>
                  {{ faDateTime(run.created_at) }}
                </span>
              </div>
            </div>
          </section>
        </div>

        <div v-if="tab !== 'performance'" class="row items-center q-gutter-sm q-mt-xl">
          <q-btn
            unelevated
            no-caps
            class="btn-pill"
            :label="isNew ? 'ساخت پیش‌نویس' : editable ? 'ذخیره' : 'ارسال تغییرات برای بررسی'"
            :loading="saving"
            :disable="!isNew && !dirty"
            @click="save"
          />
          <span v-if="dirty && !isNew" class="faint text-caption">تغییرات ذخیره نشده</span>
          <q-space />
          <q-btn
            v-if="agent && editable"
            flat
            no-caps
            color="negative"
            label="حذف پیش‌نویس"
            @click="remove"
          />
        </div>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.tabs {
  color: var(--muted);
}
.form {
  display: grid;
  gap: 32px;
}
h3 {
  font-size: 1rem;
  margin-bottom: 12px;
}
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.wide {
  grid-column: 1 / -1;
}
.field-label {
  color: var(--muted);
  font-size: 0.85rem;
  margin-bottom: 8px;
}
.preview {
  border: 1px dashed var(--line);
  border-radius: var(--radius);
  padding: 14px 16px;
}
.description {
  line-height: 1.9;
  color: var(--ink);
}
.description :deep(p) {
  margin: 0 0 10px;
}
.description :deep(ul) {
  padding-inline-start: 20px;
  margin: 0 0 10px;
}
.description :deep(h1),
.description :deep(h2),
.description :deep(h3) {
  font-size: 1.05rem;
  line-height: 1.6;
  margin: 0 0 10px;
}
.description :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 10px;
  font-size: 0.85rem;
}
.description :deep(th),
.description :deep(td) {
  border-bottom: 1px solid var(--line);
  padding: 6px 8px;
  text-align: start;
}
.cost-facts {
  display: grid;
  gap: 6px;
  align-content: center;
  color: var(--muted);
  font-size: 0.85rem;
}
.packages {
  display: grid;
  gap: 10px;
  max-width: 720px;
}
.pack {
  display: grid;
  grid-template-columns: 1fr 1fr 150px auto;
  gap: 10px;
  align-items: center;
}
.params {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
.params aside {
  position: sticky;
  top: 80px;
}
.secret {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 14px 16px;
  background: var(--surface-2);
}
.secret code.ltr {
  word-break: break-all;
  color: var(--ink-strong);
}
.test {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
.result {
  min-height: 200px;
}
.data {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--surface-2);
  font-size: 0.75rem;
  overflow-x: auto;
}
.warn {
  color: #e7b35a;
}
.error-text {
  color: #ff8a8e;
}
.block {
  display: block;
}
.tag {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0 8px;
  margin-inline-start: 8px;
  font-size: 0.72rem;
  color: var(--muted);
}
.tiles {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.tile {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 14px 16px;
  background: var(--surface-2);
}
.tile.bad {
  border-color: rgb(226 90 90 / 50%);
}
.tile-value {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--ink-strong);
}
.tile-label {
  color: var(--muted);
  font-size: 0.8rem;
}
.tile-note {
  color: var(--faint);
  font-size: 0.72rem;
  margin-top: 4px;
}
.runs {
  display: grid;
  gap: 2px;
}
.run {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}
@media (max-width: 1023px) {
  .params,
  .test {
    grid-template-columns: 1fr;
  }
  .params aside {
    position: static;
  }
  .tiles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 599px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
  .pack {
    grid-template-columns: 1fr 1fr auto;
  }
  .pack > span {
    display: none;
  }
}
</style>
