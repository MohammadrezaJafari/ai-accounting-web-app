<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import type { QTableColumn, QTableProps } from 'quasar';
import { errorMessage, listUsage } from '../api';
import { faDateTime, faNumber, usd } from '../format';
import type { UsageLog } from '../types';

const props = defineProps<{
  filters: Record<string, string | number | boolean | null | undefined>;
  hideApp?: boolean;
}>();

const rows = ref<UsageLog[]>([]);
const loading = ref(false);
const error = ref('');
const pagination = ref({ page: 1, rowsPerPage: 25, rowsNumber: 0 });

const columns: QTableColumn<UsageLog>[] = [
  {
    name: 'created_at',
    label: 'زمان',
    field: 'created_at',
    align: 'right',
    format: (v: string) => faDateTime(v),
  },
  { name: 'app', label: 'اپ / کلید', field: (row) => row.app?.name ?? '', align: 'right' },
  { name: 'model', label: 'مدل', field: 'model', align: 'right' },
  {
    name: 'input',
    label: 'ورودی',
    field: 'input_tokens',
    align: 'right',
    format: (v: number) => faNumber(v),
  },
  {
    name: 'output',
    label: 'خروجی',
    field: 'output_tokens',
    align: 'right',
    format: (v: number) => faNumber(v),
  },
  { name: 'charge', label: 'هزینه', field: 'charge', align: 'left' },
  { name: 'status', label: 'وضعیت', field: 'status_code', align: 'center' },
];

async function load(page = pagination.value.page): Promise<void> {
  loading.value = true;
  error.value = '';
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(pagination.value.rowsPerPage),
  });
  Object.entries(props.filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '' && value !== false)
      params.set(key, String(value === true ? 1 : value));
  });
  try {
    const result = await listUsage(params);
    rows.value = result.data;
    pagination.value = {
      ...pagination.value,
      page: result.meta.current_page,
      rowsNumber: result.meta.total,
    };
  } catch (exception) {
    error.value = errorMessage(exception);
  } finally {
    loading.value = false;
  }
}

const onRequest: QTableProps['onRequest'] = ({ pagination: next }) => {
  pagination.value.rowsPerPage = next.rowsPerPage;
  void load(next.page);
};

watch(
  () => props.filters,
  () => void load(1),
  { deep: true },
);
onMounted(() => void load(1));
</script>

<template>
  <div v-if="error" class="error-banner q-mb-md">{{ error }}</div>
  <q-table
    v-model:pagination="pagination"
    flat
    bordered
    row-key="id"
    :rows="rows"
    :columns="hideApp ? columns.filter((c) => c.name !== 'app') : columns"
    :loading="loading"
    :rows-per-page-options="[25, 50, 100]"
    no-data-label="درخواستی ثبت نشده است."
    rows-per-page-label="در هر صفحه"
    @request="onRequest"
  >
    <template #body-cell-app="scope">
      <q-td :props="scope">
        <div>{{ scope.row.app?.name }}</div>
        <div class="muted text-caption">{{ scope.row.api_key?.name }}</div>
      </q-td>
    </template>
    <template #body-cell-model="scope">
      <q-td :props="scope">
        <span class="mono">{{ scope.row.model }}</span>
        <q-badge v-if="scope.row.stream" outline color="grey" class="q-ml-xs">stream</q-badge>
      </q-td>
    </template>
    <template #body-cell-input="scope">
      <q-td :props="scope">
        {{ faNumber(scope.row.input_tokens) }}
        <div v-if="scope.row.cached_input_tokens" class="muted text-caption">
          کش: {{ faNumber(scope.row.cached_input_tokens) }}
        </div>
      </q-td>
    </template>
    <template #body-cell-charge="scope">
      <q-td :props="scope" class="ltr text-weight-medium">{{ usd(scope.row.charge) }}</q-td>
    </template>
    <template #body-cell-status="scope">
      <q-td :props="scope">
        <q-badge
          :color="scope.row.status_code >= 400 ? 'negative' : 'positive'"
          :label="scope.row.status_code"
        />
        <q-tooltip v-if="scope.row.error" max-width="360px">{{ scope.row.error }}</q-tooltip>
      </q-td>
    </template>
  </q-table>
</template>
