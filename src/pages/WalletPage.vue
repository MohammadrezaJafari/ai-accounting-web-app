<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMeta, useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { cancelOrder, errorMessage, listApps, listOrders } from '../api';
import { faDateTime, orderStatuses, usd } from '../format';
import type { App, Order } from '../types';
import TopUpPanel from '../components/TopUpPanel.vue';

useMeta({ title: 'کیف پول | پلتفرم توسعه‌دهندگان' });

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const apps = ref<App[]>([]);
const appId = ref<number | null>(null);
const orders = ref<Order[] | null>(null);
const total = computed(() => apps.value.reduce((sum, app) => sum + Number(app.balance), 0));

async function loadOrders(): Promise<void> {
  orders.value = (await listOrders().catch(() => null))?.data ?? [];
}

async function load(): Promise<void> {
  apps.value = await listApps().catch(() => []);
  appId.value ??= apps.value[0]?.id ?? null;
  await loadOrders();
}

async function cancel(order: Order): Promise<void> {
  try {
    await cancelOrder(order.id);
    await loadOrders();
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  }
}

/** Back from the payment gateway (`?order=…&payment=paid|failed`). */
function announcePayment(): void {
  const outcome = route.query.payment;
  if (outcome !== 'paid' && outcome !== 'failed') return;
  $q.notify(
    outcome === 'paid'
      ? { type: 'positive', message: 'پرداخت انجام شد و کیف پول شارژ شد.' }
      : { type: 'negative', message: 'پرداخت انجام نشد. اگر مبلغی کم شده، تا ۷۲ ساعت برمی‌گردد.' },
  );
  void router.replace({ query: {} });
}

onMounted(() => {
  announcePayment();
  void load();
});
</script>

<template>
  <q-page class="page">
    <div class="page-head">
      <div>
        <h1>کیف پول</h1>
        <p>هر اپ موجودی جدا دارد؛ شارژ به کیف پول اپ انتخاب‌شده اضافه می‌شود.</p>
      </div>
    </div>

    <div class="balances q-mb-xl">
      <div class="panel stat total">
        <div class="label">موجودی کل</div>
        <div class="value ltr">{{ usd(total) }}</div>
        <div class="hint">در {{ apps.length.toLocaleString('fa-IR') }} اپ</div>
      </div>
      <button
        v-for="app in apps"
        :key="app.id"
        type="button"
        class="panel stat app-balance"
        :class="{ selected: app.id === appId }"
        @click="appId = app.id"
      >
        <div class="label">{{ app.name }}</div>
        <div class="value ltr" :class="{ 'text-negative': Number(app.balance) <= 0 }">
          {{ usd(app.balance) }}
        </div>
        <div class="hint">
          {{ app.id === appId ? 'انتخاب‌شده برای شارژ' : 'برای شارژ انتخاب کنید' }}
        </div>
      </button>
    </div>

    <div v-if="!apps.length" class="panel empty">
      برای شارژ اول یک اپ بسازید.
      <div class="q-mt-md">
        <q-btn unelevated no-caps class="btn-pill" to="/apps" label="ساخت اپ" />
      </div>
    </div>
    <template v-else>
      <h2 class="panel-title">شارژ {{ apps.find((a) => a.id === appId)?.name }}</h2>
      <TopUpPanel :app-id="appId" @ordered="load" />
    </template>

    <h2 class="section-title">تاریخچهٔ پرداخت‌ها</h2>
    <div class="panel">
      <div v-if="orders === null" class="flex flex-center q-pa-lg">
        <q-spinner color="primary" />
      </div>
      <div v-else-if="!orders.length" class="empty">پرداختی ثبت نشده است.</div>
      <q-markup-table v-else flat>
        <thead>
          <tr>
            <th class="text-right">#</th>
            <th class="text-right">زمان</th>
            <th class="text-right">اپ</th>
            <th class="text-right">شرح</th>
            <th class="text-left">مبلغ</th>
            <th class="text-left">اعتبار</th>
            <th class="text-center">وضعیت</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id">
            <td>{{ order.id }}</td>
            <td>{{ faDateTime(order.created_at) }}</td>
            <td>{{ order.app?.name }}</td>
            <td>
              {{
                order.type === 'package'
                  ? `بستهٔ ${order.package?.name ?? order.meta?.package_name ?? ''}`
                  : 'مبلغ دلخواه'
              }}
            </td>
            <td class="text-left ltr">{{ usd(order.amount) }}</td>
            <td class="text-left ltr">{{ usd(order.credit) }}</td>
            <td class="text-center">
              <q-badge
                :color="orderStatuses[order.status].color"
                :label="orderStatuses[order.status].label"
              />
            </td>
            <td class="text-left">
              <q-btn
                v-if="order.status === 'pending'"
                flat
                dense
                no-caps
                color="negative"
                label="لغو"
                @click="cancel(order)"
              />
            </td>
          </tr>
        </tbody>
      </q-markup-table>
    </div>
  </q-page>
</template>

<style scoped>
.balances {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 16px;
}
.total {
  background: var(--surface-2);
}
.app-balance {
  font: inherit;
  color: inherit;
  text-align: start;
  cursor: pointer;
}
.app-balance.selected {
  border-color: var(--brand);
  box-shadow: 0 0 0 1px var(--brand);
}
</style>
