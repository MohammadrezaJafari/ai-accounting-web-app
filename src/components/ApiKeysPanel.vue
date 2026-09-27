<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useQuasar } from 'quasar';
import { createKey, deleteKey, errorMessage, listKeys, listModels, updateKey } from '../api';
import { faDateTime, usd } from '../format';
import type { AiModel, ApiKey } from '../types';
import CopyText from './CopyText.vue';
import ConnectSnippet from './ConnectSnippet.vue';

const props = defineProps<{ appId: number }>();
const $q = useQuasar();

const keys = ref<ApiKey[] | null>(null);
const models = ref<AiModel[]>([]);
const dialog = ref(false);
const busy = ref(false);
const editing = ref<ApiKey | null>(null);
const created = ref<string | null>(null);
const draft = reactive({
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
    [keys.value, models.value] = await Promise.all([
      listKeys(props.appId),
      listModels(props.appId),
    ]);
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  }
}

function open(key: ApiKey | null): void {
  editing.value = key;
  draft.name = key?.name ?? '';
  draft.allowed_providers = key?.allowed_providers ?? [];
  draft.allowed_models = key?.allowed_models ?? [];
  draft.spend_limit = key?.spend_limit ?? '';
  draft.expires_at = key?.expires_at?.slice(0, 10) ?? '';
  dialog.value = true;
}

async function save(): Promise<void> {
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
      await updateKey(props.appId, editing.value.id, payload);
    } else {
      created.value = (await createKey(props.appId, payload)).plain_key;
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
    await updateKey(props.appId, key.id, { is_active: !key.is_active });
    await load();
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  }
}

function revoke(key: ApiKey): void {
  $q.dialog({
    title: 'ابطال کلید',
    message: `کلید «${key.name}» برای همیشه باطل می‌شود و اپ‌هایی که از آن استفاده می‌کنند متوقف می‌شوند.`,
    cancel: { flat: true, label: 'انصراف' },
    ok: { color: 'negative', unelevated: true, label: 'ابطال' },
  }).onOk(() => {
    void deleteKey(props.appId, key.id)
      .then(load)
      .catch((exception) => $q.notify({ type: 'negative', message: errorMessage(exception) }));
  });
}

onMounted(load);
</script>

<template>
  <div>
    <div class="row items-center q-mb-md">
      <div class="col muted">
        هر کلید را می‌توانید به ارائه‌دهنده یا مدل‌های خاص محدود کنید و برایش سقف هزینه بگذارید.
      </div>
      <q-btn unelevated color="primary" icon="key" label="کلید جدید" @click="open(null)" />
    </div>

    <q-banner v-if="created" rounded class="bg-green-1 q-mb-md">
      <div class="text-weight-bold q-mb-xs">
        کلید ساخته شد. همین حالا کپی کنید؛ دوباره نمایش داده نمی‌شود.
      </div>
      <div class="row items-center no-wrap">
        <code class="mono col ellipsis">{{ created }}</code>
        <CopyText :text="created" label="کپی کلید" />
      </div>
      <template #action>
        <q-btn flat label="بستن" @click="created = null" />
      </template>
    </q-banner>

    <div v-if="keys === null" class="flex flex-center q-pa-lg"><q-spinner color="primary" /></div>
    <div v-else-if="!keys.length" class="empty">هنوز کلیدی نساخته‌اید.</div>
    <q-list v-else bordered separator class="rounded-borders bg-white">
      <q-item v-for="key in keys" :key="key.id" :class="{ 'text-grey-6': !key.is_active }">
        <q-item-section>
          <q-item-label class="text-weight-bold">{{ key.name }}</q-item-label>
          <q-item-label caption class="mono">{{ key.key_prefix }}…</q-item-label>
          <q-item-label caption class="q-mt-xs">
            <q-chip
              v-for="p in key.allowed_providers ?? []"
              :key="p"
              dense
              size="sm"
              color="indigo-1"
              >{{ p }}</q-chip
            >
            <q-chip
              v-for="m in key.allowed_models ?? []"
              :key="m"
              dense
              size="sm"
              color="grey-3"
              class="mono"
              >{{ m }}</q-chip
            >
            <span v-if="!key.allowed_providers && !key.allowed_models">همهٔ مدل‌ها</span>
          </q-item-label>
        </q-item-section>
        <q-item-section class="gt-xs">
          <q-item-label caption>هزینه‌شده</q-item-label>
          <q-item-label class="ltr text-left">
            {{ usd(key.spent)
            }}<span v-if="key.spend_limit" class="muted"> / {{ usd(key.spend_limit) }}</span>
          </q-item-label>
        </q-item-section>
        <q-item-section class="gt-sm">
          <q-item-label caption>آخرین استفاده</q-item-label>
          <q-item-label>{{ faDateTime(key.last_used_at) }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <div class="row items-center no-wrap">
            <q-toggle :model-value="key.is_active" @update:model-value="toggle(key)" />
            <q-btn flat round dense icon="edit" @click="open(key)" />
            <q-btn flat round dense icon="delete" color="negative" @click="revoke(key)" />
          </div>
        </q-item-section>
      </q-item>
    </q-list>

    <div class="q-mt-lg">
      <div class="panel-title">اتصال اپ</div>
      <ConnectSnippet :api-key="created ?? 'sk-aia-...'" />
    </div>

    <q-dialog v-model="dialog">
      <q-card style="width: 520px; max-width: 94vw">
        <q-form @submit.prevent="save">
          <q-card-section>
            <div class="text-h6">{{ editing ? 'ویرایش کلید' : 'کلید جدید' }}</div>
          </q-card-section>
          <q-card-section class="column q-gutter-md">
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
          <q-card-actions align="left">
            <q-btn flat label="انصراف" v-close-popup />
            <q-btn
              type="submit"
              unelevated
              color="primary"
              :label="editing ? 'ذخیره' : 'ساخت کلید'"
              :loading="busy"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </div>
</template>
