<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useMeta, useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { deleteApp, errorMessage, getApp, listTransactions, updateApp } from '../api';
import { faDateTime, transactionTypes, usd } from '../format';
import type { App, WalletTransaction } from '../types';
import ApiKeysPanel from '../components/ApiKeysPanel.vue';
import TopUpPanel from '../components/TopUpPanel.vue';
import UsageTable from '../components/UsageTable.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();

const appId = computed(() => Number(route.params.id));
const app = ref<App | null>(null);
const tab = ref<'keys' | 'topup' | 'transactions' | 'usage' | 'settings'>('keys');
const transactions = ref<WalletTransaction[]>([]);
const settings = reactive({ name: '', description: '' });
const saving = ref(false);

useMeta(() => ({ title: `${app.value?.name ?? 'اپ'} | پلتفرم توسعه‌دهندگان` }));

async function load(): Promise<void> {
  try {
    app.value = await getApp(appId.value);
    settings.name = app.value.name;
    settings.description = app.value.description ?? '';
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
    await router.replace('/apps');
  }
}

async function loadTransactions(): Promise<void> {
  transactions.value = (await listTransactions(appId.value).catch(() => null))?.data ?? [];
}

async function save(): Promise<void> {
  saving.value = true;
  try {
    app.value = await updateApp(appId.value, {
      name: settings.name,
      description: settings.description || null,
    });
    $q.notify({ type: 'positive', message: 'ذخیره شد.' });
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  } finally {
    saving.value = false;
  }
}

async function setActive(active: boolean): Promise<void> {
  app.value = await updateApp(appId.value, { is_active: active });
}

function remove(): void {
  $q.dialog({
    title: 'حذف اپ',
    message: 'اپ و همهٔ کلیدهایش حذف می‌شوند. اپ‌هایی که موجودی دارند قابل حذف نیستند.',
    cancel: { flat: true, label: 'انصراف' },
    ok: { color: 'negative', unelevated: true, label: 'حذف' },
  }).onOk(() => {
    void deleteApp(appId.value)
      .then(() => router.replace('/apps'))
      .catch((exception) => $q.notify({ type: 'negative', message: errorMessage(exception) }));
  });
}

watch(tab, (value) => {
  if (value === 'transactions') void loadTransactions();
});
onMounted(load);
</script>

<template>
  <q-page class="page">
    <template v-if="app">
      <div class="page-head">
        <div>
          <q-breadcrumbs class="faint text-caption q-mb-xs" active-color="grey">
            <q-breadcrumbs-el label="اپ‌ها" to="/apps" />
            <q-breadcrumbs-el :label="app.name" />
          </q-breadcrumbs>
          <h1>
            {{ app.name }}
            <q-badge v-if="!app.is_active" color="grey-8" label="غیرفعال" class="q-ml-sm" />
          </h1>
          <p>{{ app.description || 'بدون توضیح' }}</p>
        </div>
        <div class="panel stat balance">
          <div class="label">موجودی</div>
          <div class="value ltr" :class="{ 'text-negative': Number(app.balance) <= 0 }">
            {{ usd(app.balance) }}
          </div>
          <q-btn
            flat
            dense
            no-caps
            class="btn-ghost-pill q-mt-sm"
            label="شارژ"
            icon="add"
            @click="tab = 'topup'"
          />
        </div>
      </div>

      <div class="panel">
        <q-tabs
          v-model="tab"
          align="left"
          no-caps
          active-color="white"
          indicator-color="primary"
          class="tabs"
          outside-arrows
          mobile-arrows
        >
          <q-tab name="keys" icon="key" label="کلیدهای API" />
          <q-tab name="topup" icon="account_balance_wallet" label="شارژ" />
          <q-tab name="transactions" icon="receipt_long" label="تراکنش‌ها" />
          <q-tab name="usage" icon="query_stats" label="مصرف" />
          <q-tab name="settings" icon="settings" label="تنظیمات" />
        </q-tabs>
        <q-separator />
        <q-tab-panels v-model="tab" animated class="tab-panels">
          <q-tab-panel name="keys"><ApiKeysPanel :app-id="appId" /></q-tab-panel>
          <q-tab-panel name="topup">
            <TopUpPanel :app-id="appId" @ordered="load" />
            <p class="muted text-caption q-mt-md">
              سفارش‌های در انتظار پرداخت را در صفحهٔ
              <router-link to="/wallet" class="text-primary">کیف پول</router-link> ببینید.
            </p>
          </q-tab-panel>
          <q-tab-panel name="transactions">
            <div v-if="!transactions.length" class="empty">تراکنشی ثبت نشده است.</div>
            <q-markup-table v-else flat>
              <thead>
                <tr>
                  <th class="text-right">زمان</th>
                  <th class="text-right">نوع</th>
                  <th class="text-right">توضیح</th>
                  <th class="text-left">مبلغ</th>
                  <th class="text-left">موجودی پس از</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in transactions" :key="t.id">
                  <td>{{ faDateTime(t.created_at) }}</td>
                  <td>{{ transactionTypes[t.type] ?? t.type }}</td>
                  <td class="muted">{{ t.description || '—' }}</td>
                  <td
                    class="text-left ltr"
                    :class="Number(t.amount) < 0 ? 'text-negative' : 'text-positive'"
                  >
                    {{ usd(t.amount) }}
                  </td>
                  <td class="text-left ltr">{{ usd(t.balance_after) }}</td>
                </tr>
              </tbody>
            </q-markup-table>
            <p class="muted text-caption q-mt-sm">
              کسر هزینهٔ درخواست‌ها در زبانهٔ «مصرف» و صفحهٔ
              <router-link to="/logs" class="text-primary">لاگ درخواست‌ها</router-link> نمایش داده
              می‌شود.
            </p>
          </q-tab-panel>
          <q-tab-panel name="usage">
            <UsageTable :filters="{ app_id: appId }" hide-app />
          </q-tab-panel>
          <q-tab-panel name="settings">
            <q-form class="column q-gutter-md" style="max-width: 520px" @submit.prevent="save">
              <q-input v-model="settings.name" outlined label="نام اپ" />
              <q-input
                v-model="settings.description"
                outlined
                type="textarea"
                autogrow
                label="توضیح"
              />
              <q-toggle
                :model-value="app.is_active"
                color="primary"
                label="اپ فعال است (درخواست‌های اپ غیرفعال رد می‌شوند)"
                @update:model-value="setActive"
              />
              <div class="row q-gutter-sm">
                <q-btn
                  type="submit"
                  unelevated
                  no-caps
                  class="btn-pill"
                  label="ذخیره"
                  :loading="saving"
                />
                <q-btn flat no-caps color="negative" label="حذف اپ" @click="remove" />
              </div>
            </q-form>
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </template>
    <div v-else class="flex flex-center q-pa-xl"><q-spinner size="lg" color="primary" /></div>
  </q-page>
</template>

<style scoped>
.balance {
  min-width: 220px;
  background: var(--surface-2);
}
.tabs {
  color: var(--muted);
}
.tab-panels {
  background: transparent;
}
</style>
