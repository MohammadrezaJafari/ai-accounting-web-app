<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import { listApps, listModels } from '../api';
import type { AiModel, App } from '../types';
import UsageTable from '../components/UsageTable.vue';

useMeta({ title: 'گزارش مصرف | حسابداری AI' });

const apps = ref<App[]>([]);
const models = ref<AiModel[]>([]);
const filters = reactive<{
  app_id: number | null;
  model: string | null;
  from: string;
  to: string;
  errors_only: boolean;
}>({
  app_id: null,
  model: null,
  from: '',
  to: '',
  errors_only: false,
});

onMounted(async () => {
  [apps.value, models.value] = await Promise.all([
    listApps().catch(() => []),
    listModels().catch(() => []),
  ]);
});
</script>

<template>
  <q-page class="page">
    <div class="page-head">
      <div>
        <h1>گزارش مصرف</h1>
        <p>همهٔ درخواست‌های اپ‌هایتان با توکن‌ها و هزینهٔ هر کدام</p>
      </div>
    </div>

    <div class="panel panel-pad q-mb-md filters">
      <q-select
        v-model="filters.app_id"
        outlined
        dense
        clearable
        emit-value
        map-options
        label="اپ"
        :options="apps.map((a) => ({ value: a.id, label: a.name }))"
      />
      <q-select
        v-model="filters.model"
        outlined
        dense
        clearable
        label="مدل"
        :options="models.map((m) => m.public_id)"
      />
      <q-input v-model="filters.from" outlined dense type="date" label="از تاریخ" stack-label />
      <q-input v-model="filters.to" outlined dense type="date" label="تا تاریخ" stack-label />
      <q-toggle v-model="filters.errors_only" label="فقط خطاها" />
    </div>

    <UsageTable :filters="filters" />
  </q-page>
</template>

<style scoped>
.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px;
  align-items: center;
}
</style>
