<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useQuasar } from 'quasar';
import {
  createKey,
  deleteKey,
  errorMessage,
  listAllKeys,
  listApps,
  listKeys,
  listModels,
  updateKey,
} from '../api';
import { faDateTime, usd } from '../format';
import type { AiModel, ApiKey, App } from '../types';
import CodeCard from './CodeCard.vue';
import CopyText from './CopyText.vue';

/** Keys of one app, or of every app (with an app picker) when `appId` is omitted. */
const props = defineProps<{ appId?: number }>();
const $q = useQuasar();

const keys = ref<ApiKey[] | null>(null);
const apps = ref<App[]>([]);
const models = ref<AiModel[]>([]);
const dialog = ref(false);
const busy = ref(false);
const editing = ref<ApiKey | null>(null);
const created = ref<string | null>(null);
const draft = reactive({
  app_id: null as number | null,
  name: '',
  allowed_providers: [] as string[],
  allowed_models: [] as string[],
  spend_limit: '',
  expires_at: '',
});

const providerOptions = computed(() => {
  const seen = new Map<string, string>();
  models.value.forEach((m) => m.provider && seen.set(m.provider.slug, m.provider.name));
  return [...seen].map(([value, label]) => ({ value, label }));
});
const modelOptions = computed(() =>
  models.value
    .filter(
      (m) =>
        !draft.allowed_providers.length || draft.allowed_providers.includes(m.provider?.slug ?? ''),
    )
    .map((m) => ({ value: m.public_id, label: `${m.name} (${m.public_id})` })),
);

async function load(): Promise<void> {
  try {
    const [keyList, modelList, appList] = await Promise.all([
      props.appId ? listKeys(props.appId) : listAllKeys(),
      listModels(),
      props.appId ? Promise.resolve([]) : listApps(),
    ]);
    keys.value = keyList;
    models.value = modelList;
    apps.value = appList;
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  }
}

function open(key: ApiKey | null): void {
  editing.value = key;
  draft.app_id = key?.app_id ?? props.appId ?? apps.value[0]?.id ?? null;
  draft.name = key?.name ?? '';
  draft.allowed_providers = key?.allowed_providers ?? [];
  draft.allowed_models = key?.allowed_models ?? [];
  draft.spend_limit = key?.spend_limit ?? '';
  draft.expires_at = key?.expires_at?.slice(0, 10) ?? '';
  dialog.value = true;
}

async function save(): Promise<void> {
  if (!draft.app_id) {
    $q.notify({ type: 'warning', message: 'اول یک اپ بسازید.' });
    return;
  }
  busy.value = true;
  const payload = {
    name: draft.name,
    allowed_providers: draft.allowed_providers.length ? draft.allowed_providers : null,
    allowed_models: draft.allowed_models.length ? draft.allowed_models : null,
    spend_limit: draft.spend_limit === '' ? null : String(draft.spend_limit),
    expires_at: draft.expires_at || null,
  };
  try {
    if (editing.value) {
      await updateKey(editing.value.app_id, editing.value.id, payload);
    } else {
      created.value = (await createKey(draft.app_id, payload)).plain_key;
    }
    dialog.value = false;
    await load();
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  } finally {
    busy.value = false;
  }
}

async function toggle(key: ApiKey): Promise<void> {
  try {
    await updateKey(key.app_id, key.id, { is_active: !key.is_active });
    await load();
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  }
}

function revoke(key: ApiKey): void {
  $q.dialog({
    title: 'ابطال کلید',
    message: `کلید «${key.name}» برای همیشه باطل می‌شود و برنامه‌هایی که از آن استفاده می‌کنند متوقف می‌شوند.`,
    cancel: { flat: true, label: 'انصراف', color: 'grey-5' },
    ok: { color: 'negative', unelevated: true, label: 'ابطال' },
  }).onOk(() => {
    void deleteKey(key.app_id, key.id)
      .then(load)
      .catch((exception) => $q.notify({ type: 'negative', message: errorMessage(exception) }));
  });
}

onMounted(load);
</script>

<template>
  <div>
    <div class="row items-center q-mb-lg q-gutter-md">
      <div class="col muted">
        هر کلید را می‌توانید به ارائه‌دهنده یا مدل‌های خاص محدود کنید و برایش سقف هزینه و تاریخ
        انقضا بگذارید.
      </div>
      <q-btn unelevated no-caps class="btn-pill" icon="add" label="ساخت کلید" @click="open(null)" />
    </div>

    <div v-if="created" class="success-banner q-mb-lg">
      <div class="row items-center no-wrap q-mb-sm">
        <div class="col text-weight-bold">
          کلید ساخته شد. همین حالا کپی کنید؛ دوباره نمایش داده نمی‌شود.
        </div>
        <q-btn flat dense round icon="close" aria-label="بستن" @click="created = null" />
      </div>
      <div class="row items-center no-wrap key-box">
        <code class="mono col ellipsis">{{ created }}</code>
        <CopyText :text="created" label="کپی کلید" />
      </div>
      <div class="q-mt-md"><CodeCard :api-key="created" /></div>
    </div>

    <div v-if="keys === null" class="flex flex-center q-pa-lg"><q-spinner color="primary" /></div>
    <div v-else-if="!keys.length" class="panel empty">
      <q-icon name="vpn_key" size="40px" class="faint" />
      <p class="q-mt-md">هنوز کلیدی نساخته‌اید.</p>
    </div>
    <div v-else class="panel keys">
      <div v-for="key in keys" :key="key.id" class="key-row" :class="{ inactive: !key.is_active }">
        <div class="key-main">
          <div class="text-weight-medium">{{ key.name }}</div>
          <div class="mono faint text-caption">{{ key.key_prefix }}…</div>
        </div>
        <div v-if="!appId" class="key-app">
          <router-link :to="`/apps/${key.app_id}`" class="muted">{{ key.app?.name }}</router-link>
        </div>
        <div class="key-scope">
          <q-chip
            v-for="p in key.allowed_providers ?? []"
            :key="p"
            dense
            size="sm"
            color="secondary"
            >{{ p }}</q-chip
          >
          <q-chip
            v-for="m in key.allowed_models ?? []"
            :key="m"
            dense
            size="sm"
            color="secondary"
            class="mono"
            >{{ m }}</q-chip
          >
          <span v-if="!key.allowed_providers && !key.allowed_models" class="faint text-caption"
            >همهٔ مدل‌ها</span
          >
        </div>
        <div class="key-spend">
          <div class="faint text-caption">هزینه‌شده</div>
          <div class="ltr">
            {{ usd(key.spent)
            }}<span v-if="key.spend_limit" class="faint"> / {{ usd(key.spend_limit) }}</span>
          </div>
        </div>
        <div class="key-used gt-sm">
          <div class="faint text-caption">آخرین استفاده</div>
          <div class="text-caption">{{ faDateTime(key.last_used_at) }}</div>
        </div>
        <div class="key-actions">
          <q-toggle
            :model-value="key.is_active"
            color="primary"
            @update:model-value="toggle(key)"
          />
          <q-btn flat round dense icon="edit" size="sm" aria-label="ویرایش" @click="open(key)" />
          <q-btn
            flat
            round
            dense
            icon="delete_outline"
            size="sm"
            color="negative"
            aria-label="ابطال"
            @click="revoke(key)"
          />
        </div>
      </div>
    </div>

    <q-dialog v-model="dialog">
      <q-card style="width: 540px; max-width: 94vw; border-radius: 18px">
        <q-form @submit.prevent="save">
          <q-card-section>
            <div class="text-h6">{{ editing ? 'ویرایش کلید' : 'ساخت کلید API' }}</div>
          </q-card-section>
          <q-card-section class="column q-gutter-md">
            <q-select
              v-if="!appId && !editing"
              v-model="draft.app_id"
              outlined
              emit-value
              map-options
              :options="apps.map((a) => ({ value: a.id, label: a.name }))"
              label="اپ"
              hint="هزینهٔ این کلید از کیف پول همین اپ کم می‌شود."
            >
              <template #no-option>
                <q-item
                  ><q-item-section class="muted"
                    >اول در صفحهٔ اپ‌ها یک اپ بسازید.</q-item-section
                  ></q-item
                >
              </template>
            </q-select>
            <q-input
              v-model="draft.name"
              outlined
              label="نام کلید"
              hint="مثلاً «سرور production»"
              :rules="[(v) => !!v || 'نام لازم است']"
            />
            <q-select
              v-model="draft.allowed_providers"
              outlined
              multiple
              use-chips
              emit-value
              map-options
              :options="providerOptions"
              label="فقط این ارائه‌دهنده‌ها"
              hint="خالی = همه"
            />
            <q-select
              v-model="draft.allowed_models"
              outlined
              multiple
              use-chips
              emit-value
              map-options
              :options="modelOptions"
              label="فقط این مدل‌ها"
              hint="خالی = همه"
            />
            <div class="row q-col-gutter-md">
              <q-input
                v-model="draft.spend_limit"
                class="col-12 col-sm-6"
                outlined
                type="number"
                min="0"
                step="any"
                prefix="$"
                label="سقف هزینه"
                hint="خالی = نامحدود"
                input-class="ltr"
              />
              <q-input
                v-model="draft.expires_at"
                class="col-12 col-sm-6"
                outlined
                type="date"
                label="انقضا"
                hint="خالی = بدون انقضا"
                stack-label
              />
            </div>
          </q-card-section>
          <q-card-actions align="left" class="q-pa-md">
            <q-btn flat no-caps color="grey-5" label="انصراف" v-close-popup />
            <q-btn
              type="submit"
              unelevated
              no-caps
              class="btn-pill"
              :label="editing ? 'ذخیره' : 'ساخت کلید'"
              :loading="busy"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
.key-box {
  background: var(--code-bg);
  border-radius: 10px;
  padding: 6px 6px 6px 14px;
}
.keys {
  overflow: hidden;
}
.key-row {
  display: grid;
  grid-template-columns:
    minmax(140px, 1.2fr) minmax(100px, 0.8fr) minmax(120px, 1.2fr)
    120px 150px auto;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
}
.key-row:last-child {
  border-bottom: 0;
}
.key-row.inactive {
  opacity: 0.55;
}
.key-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
@media (max-width: 1023px) {
  .key-row {
    grid-template-columns: 1fr auto;
  }
  .key-app,
  .key-scope,
  .key-spend,
  .key-used {
    display: none;
  }
}
</style>
