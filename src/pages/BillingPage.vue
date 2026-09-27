<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMeta, useQuasar } from 'quasar';
import { cancelOrder, errorMessage, listApps, listOrders } from '../api';
import { faDateTime, orderStatuses, usd } from '../format';
import type { App, Order } from '../types';
import TopUpPanel from '../components/TopUpPanel.vue';

useMeta({ title: 'شارژ و سفارش‌ها | حسابداری AI' });

const $q = useQuasar();
const apps = ref<App[]>([]);
const appId = ref<number | null>(null);
const orders = ref<Order[] | null>(null);

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

onMounted(load);
</script>

<template>
  <q-page class="page">
    <div class="page-head">
      <div>
        <h1>شارژ و سفارش‌ها</h1>
        <p>
          یک بسته بخرید یا هر مبلغی که می‌خواهید شارژ کنید. اعتبار به موجودی اپ انتخاب‌شده اضافه
          می‌شود.
        </p>
      </div>
    </div>

    <div class="panel panel-pad q-mb-lg">
      <div v-if="!apps.length" class="empty">
        برای شارژ اول یک اپ بسازید.
        <div class="q-mt-md"><q-btn unelevated color="primary" to="/apps" label="ساخت اپ" /></div>
      </div>
      <template v-else>
        <q-select
          v-model="appId"
          outlined
          emit-value
          map-options
          class="q-mb-lg"
          style="max-width: 360px"
          label="شارژ برای اپ"
          :options="
            apps.map((a) => ({ value: a.id, label: `${a.name} — موجودی ${usd(a.balance)}` }))
          "
        />
        <TopUpPanel :app-id="appId" @ordered="load" />
      </template>
    </div>

    <div class="panel panel-pad">
      <div class="panel-title">سفارش‌ها</div>
      <div v-if="orders === null" class="flex flex-center q-pa-lg">
        <q-spinner color="primary" />
      </div>
      <div v-else-if="!orders.length" class="empty">سفارشی ثبت نشده است.</div>
      <q-markup-table v-else flat bordered>
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
