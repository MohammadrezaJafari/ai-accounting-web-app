<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { errorMessage, listModels } from '../api';
import { faNumber, usd } from '../format';
import type { AiModel } from '../types';
import CopyText from '../components/CopyText.vue';
import ProviderIcon from '../components/ProviderIcon.vue';

useMeta({ title: 'مدل‌ها و قیمت | پلتفرم توسعه‌دهندگان' });

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
        <h1>مدل‌ها و قیمت</h1>
        <p>
          قیمت‌ها به دلار برای هر ۱ میلیون توکن است. شناسهٔ مدل را در فیلد
          <span class="inline-code">model</span> بفرستید.
        </p>
      </div>
      <q-input
        v-model="search"
        dense
        outlined
        clearable
        placeholder="جست‌وجوی مدل"
        style="width: 260px"
      >
        <template #prepend><q-icon name="search" /></template>
      </q-input>
    </div>

    <div class="chips q-mb-lg">
      <button
        type="button"
        class="chip-filter"
        :class="{ active: !provider }"
        @click="provider = null"
      >
        همه
      </button>
      <button
        v-for="p in providers"
        :key="p.value"
        type="button"
        class="chip-filter"
        :class="{ active: provider === p.value }"
        @click="provider = p.value"
      >
        {{ p.label }}
      </button>
    </div>

    <div v-if="error" class="error-banner q-mb-md">{{ error }}</div>
    <div v-if="models === null" class="flex flex-center q-pa-xl">
      <q-spinner size="lg" color="primary" />
    </div>

    <div class="grid">
      <div v-for="model in filtered" :key="model.id" class="card">
        <div class="head">
          <ProviderIcon :slug="model.provider?.slug" :size="44" />
          <div class="col">
            <div class="name">{{ model.name }}</div>
            <div class="desc">{{ model.description || model.provider?.name }}</div>
          </div>
          <q-badge
            v-if="model.provider?.native_format === 'anthropic'"
            outline
            color="grey-6"
            class="mono"
          >
            /v1/messages
          </q-badge>
        </div>
        <div class="id-row">
          <span class="mono">{{ model.public_id }}</span>
          <CopyText :text="model.public_id" label="کپی شناسه" />
        </div>
        <dl class="prices">
          <div>
            <dt>ورودی</dt>
            <dd class="ltr">{{ usd(model.price.input) }}/M</dd>
          </div>
          <div>
            <dt>خروجی</dt>
            <dd class="ltr">{{ usd(model.price.output) }}/M</dd>
          </div>
          <div>
            <dt>ورودی کش‌شده</dt>
            <dd class="ltr">{{ usd(model.price.cached_input) }}/M</dd>
          </div>
          <div v-if="model.context_window">
            <dt>پنجرهٔ زمینه</dt>
            <dd>{{ faNumber(model.context_window) }}</dd>
          </div>
        </dl>
      </div>
    </div>
    <div v-if="models && !filtered.length" class="empty">مدلی پیدا نشد.</div>
  </q-page>
</template>

<style scoped>
.chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 18px 20px;
}
.head {
  display: flex;
  gap: 14px;
  align-items: center;
}
.name {
  color: var(--ink-strong);
}
.desc {
  color: var(--faint);
  font-size: 0.85rem;
}
.id-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 14px 0 6px;
  padding: 4px 4px 4px 12px;
  background: var(--code-bg);
  border-radius: 10px;
  font-size: 0.85rem;
  color: var(--muted);
}
.prices {
  margin: 0;
}
.prices div {
  display: flex;
  justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px solid var(--line-soft);
  font-size: 0.9rem;
}
.prices div:last-child {
  border-bottom: 0;
}
dt {
  color: var(--muted);
}
dd {
  margin: 0;
  color: var(--ink-strong);
}
</style>
