<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { catalog, createOrder, errorMessage } from '../api';
import { orderStatuses, usd } from '../format';
import type { Catalog, Order } from '../types';

const props = defineProps<{ appId: number | null }>();
const emit = defineEmits<{ ordered: [order: Order] }>();
const $q = useQuasar();

const data = ref<Catalog | null>(null);
const amount = ref('');
const busy = ref<string | null>(null);

async function order(
  payload: { package_id: number } | { amount: string },
  key: string,
): Promise<void> {
  if (!props.appId) {
    $q.notify({ type: 'warning', message: 'اول اپ را انتخاب کنید.' });
    return;
  }
  busy.value = key;
  try {
    const result = await createOrder({ app_id: props.appId, ...payload });
    if (result.meta?.payment_url) {
      window.location.href = result.meta.payment_url;
      return;
    }
    $q.notify({
      type: result.status === 'paid' ? 'positive' : 'info',
      message:
        result.status === 'paid'
          ? `${usd(result.credit)} به موجودی اضافه شد.`
          : `سفارش ثبت شد (${orderStatuses[result.status].label}). ${result.meta?.instructions ?? ''}`,
      timeout: 6000,
    });
    amount.value = '';
    emit('ordered', result);
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  } finally {
    busy.value = null;
  }
}

onMounted(async () => {
  data.value = await catalog().catch(() => null);
});
</script>

<template>
  <div v-if="data">
    <div class="packages">
      <div v-for="pack in data.data" :key="pack.id" class="panel panel-pad package">
        <div class="text-subtitle1 text-weight-bold">{{ pack.name }}</div>
        <div class="text-h4 text-weight-bolder ltr q-my-sm">{{ usd(pack.price) }}</div>
        <div class="muted">
          اعتبار: <span class="ltr ink-strong text-weight-bold">{{ usd(pack.credit) }}</span>
        </div>
        <q-badge v-if="Number(pack.bonus) > 0" color="positive" class="q-mt-xs self-start">
          <span class="ltr">+{{ usd(pack.bonus) }}</span
          >&nbsp;هدیه
        </q-badge>
        <div v-if="pack.description" class="muted text-caption q-mt-sm">{{ pack.description }}</div>
        <q-space />
        <q-btn
          unelevated
          no-caps
          class="btn-pill full-width q-mt-md"
          label="خرید"
          :loading="busy === `p${pack.id}`"
          @click="order({ package_id: pack.id }, `p${pack.id}`)"
        />
      </div>

      <div v-if="data.custom_topup.enabled" class="panel panel-pad package custom">
        <div class="text-subtitle1 text-weight-bold">مبلغ دلخواه</div>
        <div class="muted text-caption q-mb-md">
          هر مبلغی بین <span class="ltr">{{ usd(data.custom_topup.min) }}</span> تا
          <span class="ltr">{{ usd(data.custom_topup.max) }}</span>
        </div>
        <q-input
          v-model="amount"
          outlined
          type="number"
          step="any"
          prefix="$"
          :min="data.custom_topup.min"
          :max="data.custom_topup.max"
          input-class="ltr text-h6"
          placeholder="50"
        />
        <q-space />
        <q-btn
          unelevated
          no-caps
          class="btn-pill full-width q-mt-md"
          label="شارژ"
          :disable="!amount"
          :loading="busy === 'custom'"
          @click="order({ amount: String(amount) }, 'custom')"
        />
      </div>
    </div>
  </div>
  <div v-else class="flex flex-center q-pa-lg"><q-spinner color="primary" /></div>
</template>

<style scoped>
.packages {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 16px;
}
.package {
  display: flex;
  flex-direction: column;
}
.custom {
  border-style: dashed;
}
</style>
