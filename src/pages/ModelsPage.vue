<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { errorMessage, listModels } from '../api';
import { faNumber, usd } from '../format';
import type { AiModel } from '../types';
import CopyText from '../components/CopyText.vue';

useMeta({ title: 'مدل‌ها و قیمت‌ها | حسابداری AI' });

const models = ref<AiModel[] | null>(null);
const error = ref('');
const search = ref('');
const provider = ref<string | null>(null);

const providers = computed(() => {
  const seen = new Map<string, string>();
  models.value?.forEach((m) => m.provider && seen.set(m.provider.slug, m.provider.name));
  return [...seen].map(([value, label]) => ({ value, label }));
});

const filtered = computed(() =>
  (models.value ?? []).filter(
    (m) =>
      (!provider.value || m.provider?.slug === provider.value) &&
      (!search.value ||
        `${m.name} ${m.public_id}`.toLowerCase().includes(search.value.toLowerCase())),
  ),
);

onMounted(async () => {
  try {
    models.value = await listModels();
  } catch (exception) {
    error.value = errorMessage(exception);
  }
});
</script>

<template>
  <q-page class="page">
    <div class="page-head">
      <div>
        <h1>مدل‌ها و قیمت‌ها</h1>
        <p>
          قیمت‌ها به دلار برای هر ۱ میلیون توکن است. شناسهٔ مدل را در فیلد
          <span class="mono">model</span> بفرستید.
        </p>
      </div>
    </div>

    <q-banner v-if="error" rounded class="bg-red-1 text-negative q-mb-md">{{ error }}</q-banner>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-12 col-sm-6 col-md-4">
        <q-input v-model="search" outlined dense clearable label="جست‌وجوی مدل">
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </div>
      <div class="col-12 col-sm-6 col-md-3">
        <q-select
          v-model="provider"
          outlined
          dense
          clearable
          emit-value
          map-options
          label="ارائه‌دهنده"
          :options="providers"
        />
      </div>
    </div>

    <div class="panel">
      <q-markup-table flat wrap-cells>
        <thead>
          <tr>
            <th class="text-right">مدل</th>
            <th class="text-right">ارائه‌دهنده</th>
            <th class="text-left">ورودی</th>
            <th class="text-left">ورودی کش‌شده</th>
            <th class="text-left">خروجی</th>
            <th class="text-left gt-sm">پنجرهٔ زمینه</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="models === null">
            <td colspan="6" class="text-center q-pa-lg"><q-spinner color="primary" /></td>
          </tr>
          <tr v-for="model in filtered" :key="model.id">
            <td>
              <div class="text-weight-bold">{{ model.name }}</div>
              <div class="row items-center no-wrap">
                <span class="mono muted text-caption">{{ model.public_id }}</span>
                <CopyText :text="model.public_id" label="کپی شناسه" />
              </div>
            </td>
            <td>
              {{ model.provider?.name }}
              <q-badge
                v-if="model.provider?.native_format === 'anthropic'"
                outline
                color="primary"
                class="q-ml-xs"
                >/v1/messages</q-badge
              >
            </td>
            <td class="text-left ltr">{{ usd(model.price.input) }}</td>
            <td class="text-left ltr muted">{{ usd(model.price.cached_input) }}</td>
            <td class="text-left ltr">{{ usd(model.price.output) }}</td>
            <td class="text-left gt-sm muted">
              {{ model.context_window ? faNumber(model.context_window) : '—' }}
            </td>
          </tr>
          <tr v-if="models && !filtered.length">
            <td colspan="6" class="empty">مدلی پیدا نشد.</td>
          </tr>
        </tbody>
      </q-markup-table>
    </div>
  </q-page>
</template>
