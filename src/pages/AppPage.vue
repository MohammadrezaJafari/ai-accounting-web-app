<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useMeta, useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { deleteApp, errorMessage, getApp, listTransactions, updateApp } from '../api';
import { budgetPeriods, faDateTime, transactionTypes, usd } from '../format';
import { useAuthStore } from '../stores/auth';
import type { App, Permission, WalletTransaction } from '../types';
import ApiKeysPanel from '../components/ApiKeysPanel.vue';
import BudgetBar from '../components/BudgetBar.vue';
import TopUpPanel from '../components/TopUpPanel.vue';
import UsageTable from '../components/UsageTable.vue';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const auth = useAuthStore();

type Tab = 'keys' | 'topup' | 'transactions' | 'usage' | 'budget' | 'settings';
const allTabs: { name: Tab; icon: string; label: string; permission?: Permission }[] = [
  { name: 'keys', icon: 'key', label: 'کلیدهای API', permission: 'manage-keys' },
  { name: 'topup', icon: 'account_balance_wallet', label: 'شارژ', permission: 'manage-billing' },
  { name: 'transactions', icon: 'receipt_long', label: 'تراکنش‌ها', permission: 'manage-billing' },
  { name: 'usage', icon: 'query_stats', label: 'مصرف' },
  { name: 'budget', icon: 'savings', label: 'سقف هزینه' },
  { name: 'settings', icon: 'settings', label: 'تنظیمات', permission: 'manage-apps' },
];
const tabs = allTabs.filter((t) => !t.permission || auth.can(t.permission));

const appId = computed(() => Number(route.params.id));
const app = ref<App | null>(null);
const tab = ref<Tab>(tabs[0]!.name);
const transactions = ref<WalletTransaction[]>([]);
const settings = reactive({ name: '', description: '' });
const saving = ref(false);
const budget = reactive<{ limit: string; period: 'daily' | 'monthly' }>({
  limit: '',
  period: 'monthly',
});
const savingBudget = ref(false);

useMeta(() => ({ title: `${app.value?.name ?? 'اپ'} | پلتفرم توسعه‌دهندگان` }));

async function load(): Promise<void> {
  try {
    app.value = await getApp(appId.value);
    settings.name = app.value.name;
    settings.description = app.value.description ?? '';
    budget.limit = app.value.spend_limit ?? '';
    budget.period = app.value.spend_limit_period === 'daily' ? 'daily' : 'monthly';
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

async function saveBudget(limit: string | null): Promise<void> {
  savingBudget.value = true;
  try {
    app.value = await updateApp(appId.value, {
      spend_limit: limit === '' ? null : limit,
      spend_limit_period: budget.period,
    });
    budget.limit = app.value.spend_limit ?? '';
    $q.notify({
      type: 'positive',
      message: app.value.spend_limit ? 'سقف هزینه ذخیره شد.' : 'سقف هزینه برداشته شد.',
    });
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  } finally {
    savingBudget.value = false;
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
          <BudgetBar :budget="app" compact class="q-mt-sm" />
          <q-btn
            v-if="auth.can('manage-billing')"
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
          <q-tab v-for="t in tabs" :key="t.name" :name="t.name" :icon="t.icon" :label="t.label" />
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
          <q-tab-panel name="budget">
            <div class="budget-tab">
              <p class="muted q-mt-none">
                وقتی مصرف این اپ در دوره به سقف برسد، درخواست‌هایش تا شروع دورهٔ بعد با خطای 402 رد
                می‌شوند. در ۸۰٪ و ۱۰۰٪ سقف به مالک و نقش مالی هشدار داده می‌شود. ماه، ماه شمسی است.
              </p>
              <div v-if="app.spend_limit" class="panel panel-pad q-mb-lg">
                <BudgetBar :budget="app" />
              </div>
              <div v-else class="faint q-mb-lg">
                این اپ سقف هزینه ندارد و تا وقتی موجودی دارد کار می‌کند.
              </div>
              <q-form
                v-if="auth.can('manage-billing')"
                class="budget-form"
                @submit.prevent="saveBudget(budget.limit)"
              >
                <q-input
                  v-model="budget.limit"
                  outlined
                  dense
                  type="number"
                  min="0"
                  step="any"
                  prefix="$"
                  label="سقف هزینه"
                  input-class="ltr"
                />
                <q-select
                  v-model="budget.period"
                  outlined
                  dense
                  emit-value
                  map-options
                  label="دوره"
                  :options="[
                    { value: 'monthly', label: budgetPeriods.monthly },
                    { value: 'daily', label: budgetPeriods.daily },
                  ]"
                />
                <q-btn
                  type="submit"
                  unelevated
                  no-caps
                  class="btn-pill"
                  label="ذخیره"
                  :loading="savingBudget"
                  :disable="!budget.limit"
                />
                <q-btn
                  v-if="app.spend_limit"
                  flat
                  no-caps
                  color="grey"
                  label="برداشتن سقف"
                  @click="saveBudget(null)"
                />
              </q-form>
              <div v-else class="note-banner">
                سقف هزینهٔ اپ را فقط مالک یا نقش مالی سازمان می‌تواند تغییر دهد.
              </div>
              <p v-if="auth.can('manage-keys')" class="faint text-caption q-mt-lg">
                برای هر کلید هم می‌توانید سقف جدا (کل، روزانه یا ماهانه) بگذارید:
                <a class="text-primary" href="#" @click.prevent="tab = 'keys'">کلیدهای API</a>
              </p>
            </div>
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
  min-width: 240px;
  background: var(--surface-2);
}
.budget-tab {
  max-width: 640px;
}
.budget-form {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) 140px auto auto;
  gap: 12px;
  align-items: center;
}
@media (max-width: 599px) {
  .budget-form {
    grid-template-columns: 1fr 1fr;
  }
}
.tabs {
  color: var(--muted);
}
.tab-panels {
  background: transparent;
}
</style>
