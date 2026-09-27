<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useMeta } from 'quasar';
import { dashboard, errorMessage } from '../api';
import { faNumber, tokens, usd } from '../format';
import type { Dashboard } from '../types';
import DailyBars from '../components/DailyBars.vue';

useMeta({ title: 'نمودار مصارف | پلتفرم توسعه‌دهندگان' });

const ranges = [
  { label: '۷ روز', value: 7 },
  { label: '۳۰ روز', value: 30 },
  { label: '۹۰ روز', value: 90 },
];
const range = ref(30);
const data = ref<Dashboard | null>(null);
const error = ref('');

async function load(): Promise<void> {
  error.value = '';
  try {
    data.value = await dashboard(range.value);
  } catch (exception) {
    error.value = errorMessage(exception);
  }
}

const topModels = computed(() => data.value?.by_model.slice(0, 8) ?? []);
const maxModelCharge = computed(() => Math.max(...topModels.value.map((m) => Number(m.charge)), 0));

onMounted(load);
watch(range, load);
</script>

<template>
  <q-page class="page">
    <div class="page-head">
      <div>
        <h1>نمودار مصارف</h1>
        <p>هزینه و توکن‌های مصرفی همهٔ اپ‌های شما</p>
      </div>
      <div class="row q-gutter-sm" role="group" aria-label="بازهٔ زمانی">
        <button
          v-for="option in ranges"
          :key="option.value"
          type="button"
          class="chip-filter"
          :class="{ active: range === option.value }"
          :aria-pressed="range === option.value"
          @click="range = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div v-if="error" class="error-banner q-mb-md">{{ error }}</div>

    <template v-if="data">
      <div class="grid-stats q-mb-lg">
        <div class="panel stat">
          <div class="label">موجودی کل</div>
          <div class="value ltr">{{ usd(data.balance) }}</div>
          <div class="hint">در {{ faNumber(data.apps_count) }} اپ</div>
        </div>
        <div class="panel stat">
          <div class="label">هزینهٔ {{ faNumber(range) }} روز</div>
          <div class="value ltr">{{ usd(data.totals.charge) }}</div>
          <div class="hint">{{ faNumber(data.totals.requests) }} درخواست</div>
        </div>
        <div class="panel stat">
          <div class="label">توکن ورودی / خروجی</div>
          <div class="value ltr">
            {{ tokens(data.totals.input_tokens) }} / {{ tokens(data.totals.output_tokens) }}
          </div>
          <div class="hint">شامل توکن‌های کش‌شده</div>
        </div>
        <div class="panel stat">
          <div class="label">درخواست‌های ناموفق</div>
          <div class="value">{{ faNumber(data.totals.errors) }}</div>
          <div class="hint">هزینه‌ای برایشان کسر نشده</div>
        </div>
      </div>

      <div
        v-if="Number(data.balance) <= 0"
        class="note-banner q-mb-lg row items-center q-gutter-md"
      >
        <q-icon name="info_outline" color="warning" size="22px" />
        <div class="col">موجودی اپ‌هایتان تمام شده و درخواست‌ها با خطای 402 رد می‌شوند.</div>
        <q-btn unelevated no-caps class="btn-pill" label="شارژ کیف پول" to="/wallet" />
      </div>

      <div class="panel panel-pad q-mb-lg">
        <div class="panel-title">هزینهٔ روزانه</div>
        <DailyBars :days="data.daily" :range="range" />
      </div>

      <div class="row q-col-gutter-lg">
        <div class="col-12 col-md-7">
          <div class="panel panel-pad full-height">
            <div class="panel-title">هزینه به تفکیک مدل</div>
            <div v-if="!topModels.length" class="empty">هنوز مصرفی ثبت نشده است.</div>
            <div v-for="model in topModels" :key="model.key" class="model-row">
              <span class="mono name">{{ model.label }}</span>
              <div class="track">
                <div
                  class="fill"
                  :style="{
                    width: `${maxModelCharge ? (Number(model.charge) / maxModelCharge) * 100 : 0}%`,
                  }"
                />
              </div>
              <span class="ltr amount">{{ usd(model.charge) }}</span>
              <span class="faint count">{{ faNumber(model.requests) }}</span>
            </div>
          </div>
        </div>
        <div class="col-12 col-md-5">
          <div class="panel panel-pad full-height">
            <div class="panel-title">هزینه به تفکیک اپ</div>
            <div v-if="!data.by_app.length" class="empty">هنوز مصرفی ثبت نشده است.</div>
            <router-link
              v-for="app in data.by_app"
              :key="app.key"
              :to="`/apps/${app.key}`"
              class="app-row"
            >
              <span>{{ app.label }}</span>
              <span class="ltr amount">{{ usd(app.charge) }}</span>
            </router-link>
          </div>
        </div>
      </div>
    </template>
    <div v-else-if="!error" class="flex flex-center q-pa-xl">
      <q-spinner size="lg" color="primary" />
    </div>
  </q-page>
</template>

<style scoped>
.model-row {
  display: grid;
  grid-template-columns: 150px 1fr 90px 50px;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  font-size: 0.85rem;
}
.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: start;
}
.track {
  height: 10px;
  background: var(--surface-2);
  border-radius: 4px;
  overflow: hidden;
}
.fill {
  height: 100%;
  background: var(--brand);
  border-radius: 4px;
}
.amount {
  text-align: end;
  font-weight: 600;
  color: var(--ink-strong);
}
.count {
  text-align: end;
  font-size: 0.75rem;
}
.app-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}
.app-row:last-child {
  border-bottom: 0;
}
.app-row:hover {
  color: var(--ink-strong);
}
@media (max-width: 599px) {
  .model-row {
    grid-template-columns: 110px 1fr 76px;
  }
  .count {
    display: none;
  }
}
</style>
