<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMeta, useQuasar } from 'quasar';
import { agentCatalog, errorMessage } from '../api';
import { faNumber, usd } from '../format';
import type { Agent } from '../types';

useMeta({ title: 'بازارچهٔ ایجنت‌ها | پلتفرم توسعه‌دهندگان' });

const $q = useQuasar();
const agents = ref<Agent[] | null>(null);
const search = ref('');
const category = ref<string | null>(null);

const categories = computed(() => [
  ...new Set((agents.value ?? []).map((agent) => agent.category).filter((c): c is string => !!c)),
]);

const visible = computed(() => {
  const query = search.value.trim().toLowerCase();
  return (agents.value ?? []).filter(
    (agent) =>
      (!category.value || agent.category === category.value) &&
      (!query ||
        [agent.name, agent.tagline, agent.category, agent.publisher?.name]
          .filter(Boolean)
          .some((text) => text!.toLowerCase().includes(query))),
  );
});

function byline(agent: Agent): string {
  const publisher = agent.publisher ? `از ${agent.publisher.name}` : 'از پلتفرم';
  return agent.category ? `${publisher}، ${agent.category}` : publisher;
}

/** Cheapest price per unit across the agent's packages. */
function fromPrice(agent: Agent): string | null {
  const prices = agent.packages.map((pack) => Number(pack.unit_price));
  return prices.length ? usd(String(Math.min(...prices))) : null;
}

onMounted(async () => {
  try {
    agents.value = (await agentCatalog()).data;
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  }
});
</script>

<template>
  <q-page class="page">
    <div class="page-head">
      <div>
        <h1>بازارچهٔ ایجنت‌ها</h1>
        <p>
          ایجنت‌های آماده برای کارهای تکراری. تنظیمشان کنید، زمان‌بندی بدهید و خروجی را در تلگرام،
          بله، ایمیل یا ابزارهای خودتان بگیرید؛ هزینه به ازای خروجی است، نه توکن.
        </p>
      </div>
    </div>

    <div v-if="agents === null" class="flex flex-center q-pa-xl">
      <q-spinner size="lg" color="primary" />
    </div>

    <template v-else>
      <div class="toolbar q-mb-lg">
        <q-input
          v-model="search"
          outlined
          dense
          clearable
          placeholder="جستجوی ایجنت"
          class="search"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <div v-if="categories.length > 1" class="chips">
          <button
            type="button"
            class="chip-filter"
            :class="{ active: category === null }"
            @click="category = null"
          >
            همه
          </button>
          <button
            v-for="item in categories"
            :key="item"
            type="button"
            class="chip-filter"
            :class="{ active: category === item }"
            @click="category = item"
          >
            {{ item }}
          </button>
        </div>
      </div>

      <div v-if="!visible.length" class="panel empty">
        <q-icon name="storefront" size="44px" class="faint" />
        <p class="q-mt-md">ایجنتی با این مشخصات پیدا نشد.</p>
      </div>

      <div v-else class="grid">
        <router-link
          v-for="agent in visible"
          :key="agent.id"
          :to="`/store/${agent.id}`"
          class="panel card"
        >
          <div class="card-head">
            <span class="agent-icon"><q-icon :name="agent.icon" size="26px" /></span>
            <div class="col">
              <div class="agent-name">{{ agent.name }}</div>
              <div class="faint text-caption">{{ byline(agent) }}</div>
            </div>
          </div>
          <p class="tagline">{{ agent.tagline ?? agent.description }}</p>
          <div class="card-foot">
            <span v-if="fromPrice(agent)" class="muted text-caption">
              از <span class="ltr ink-strong">{{ fromPrice(agent) }}</span> برای هر
              {{ agent.unit_name }}
            </span>
            <q-space />
            <span v-if="agent.credits > 0" class="owned">
              {{ faNumber(agent.credits) }} {{ agent.unit_name }} دارید
            </span>
          </div>
        </router-link>
      </div>
    </template>
  </q-page>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.search {
  width: 280px;
  max-width: 100%;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.card {
  display: flex;
  flex-direction: column;
  padding: 20px;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.card:hover {
  border-color: var(--surface-3);
  background: var(--surface-2);
}
.card-head {
  display: flex;
  align-items: center;
  gap: 14px;
}
.agent-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--brand-tint);
  color: #6fcf9f;
}
.agent-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ink-strong);
}
.tagline {
  flex: 1;
  margin: 14px 0 18px;
  color: var(--muted);
  font-size: 0.9rem;
  line-height: 1.8;
}
.card-foot {
  display: flex;
  align-items: center;
  gap: 8px;
}
.owned {
  border: 1px solid rgb(50 148 106 / 50%);
  background: var(--brand-tint);
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 0.75rem;
  color: var(--ink-strong);
}
</style>
