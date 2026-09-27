<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useMeta } from 'quasar';
import { dashboard, errorMessage } from '../api';
import { faNumber, tokens, usd } from '../format';
import type { Dashboard } from '../types';
import DailyBars from '../components/DailyBars.vue';

useMeta({ title: 'داشبورد | حسابداری AI' });

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
        <h1>داشبورد</h1>
        <p>خلاصهٔ موجودی و مصرف همهٔ اپ‌های شما</p>
      </div>
      <q-btn-toggle
        v-model="range"
        unelevated
        rounded
        toggle-color="primary"
        color="white"
        text-color="dark"
        :options="[
          { label: '۷ روز', value: 7 },
          { label: '۳۰ روز', value: 30 },
          { label: '۹۰ روز', value: 90 },
        ]"
      />
    </div>

    <q-banner v-if="error" rounded class="bg-red-1 text-negative q-mb-md">{{ error }}</q-banner>

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
        class="panel panel-pad q-mb-lg row items-center q-gutter-md"
      >
        <q-icon name="info" color="warning" size="md" />
        <div class="col">موجودی اپ‌هایتان تمام شده و درخواست‌ها با خطای 402 رد می‌شوند.</div>
        <q-btn unelevated color="primary" label="شارژ حساب" to="/billing" />
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
              <span class="muted count">{{ faNumber(model.requests) }}</span>
            </div>
          </div>
        </div>
        <div class="col-12 col-md-5">
          <div class="panel panel-pad full-height">
            <div class="panel-title">هزینه به تفکیک اپ</div>
            <div v-if="!data.by_app.length" class="empty">هنوز مصرفی ثبت نشده است.</div>
            <q-list separator>
              <q-item
                v-for="app in data.by_app"
                :key="app.key"
                :to="`/apps/${app.key}`"
                class="q-px-none"
              >
                <q-item-section>{{ app.label }}</q-item-section>
                <q-item-section side class="ltr text-dark">{{ usd(app.charge) }}</q-item-section>
              </q-item>
            </q-list>
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
  background: var(--line-soft);
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
}
.count {
  text-align: end;
  font-size: 0.75rem;
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
