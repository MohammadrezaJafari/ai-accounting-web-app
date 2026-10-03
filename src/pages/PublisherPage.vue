<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useMeta, useQuasar } from 'quasar';
import {
  depositToPublisher,
  errorMessage,
  getPublisher,
  listApps,
  listPublisherAgents,
  updatePublisher,
} from '../api';
import { faDateTime, faNumber, usd } from '../format';
import { useAuthStore } from '../stores/auth';
import type { App, PublisherAgent, PublisherAgentStatus, PublisherOverview } from '../types';
import DailyBars from '../components/DailyBars.vue';

/** The organization as a marketplace publisher: its agents, earnings, payouts and public profile. */
useMeta({ title: 'پنل ناشر | پلتفرم توسعه‌دهندگان' });

const auth = useAuthStore();
const $q = useQuasar();

const overview = ref<PublisherOverview | null>(null);
const agents = ref<PublisherAgent[]>([]);
const saving = ref(false);
const profile = reactive<PublisherOverview['profile']>({
  publisher_name: null,
  publisher_url: null,
  support_email: null,
  payout_details: null,
});
const canPublish = computed(() => auth.can('publish-agents'));
const canBill = computed(() => auth.can('manage-billing'));
const daily = computed(() =>
  (overview.value?.daily ?? []).map((day) => ({
    day: day.date,
    charge: day.earned,
    requests: day.units,
  })),
);

const debt = computed(() => Math.max(0, -Number(overview.value?.summary.balance ?? 0)));

/** Covering the debt from one of the organization's app wallets. */
const depositing = ref(false);
const depositBusy = ref(false);
const apps = ref<App[]>([]);
const deposit = reactive<{ appId: number | null; amount: string }>({ appId: null, amount: '' });
const appOptions = computed(() =>
  apps.value.map((app) => ({
    label: app.name,
    caption: `موجودی ${usd(app.balance)}`,
    value: app.id,
    disable: Number(app.balance) <= 0,
  })),
);

async function openDeposit(): Promise<void> {
  const limits = overview.value?.deposit_limits;
  const amount = Math.min(
    Math.max(debt.value, Number(limits?.min ?? 0)),
    Number(limits?.max ?? debt.value),
  );
  deposit.amount = amount.toFixed(2);
  deposit.appId = null;
  depositing.value = true;
  try {
    apps.value = await listApps();
    deposit.appId =
      apps.value.find((app) => Number(app.balance) >= Number(deposit.amount))?.id ?? null;
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  }
}

async function submitDeposit(): Promise<void> {
  if (deposit.appId === null) return;
  depositBusy.value = true;
  try {
    await depositToPublisher(deposit.appId, deposit.amount);
    depositing.value = false;
    $q.notify({ type: 'positive', message: 'مبلغ به حساب ناشر منتقل شد.' });
    await load();
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  } finally {
    depositBusy.value = false;
  }
}

const statusColors: Record<PublisherAgentStatus, string> = {
  draft: 'grey-8',
  pending_review: 'warning',
  approved: 'positive',
  rejected: 'negative',
};

async function load(): Promise<void> {
  try {
    const [data, list] = await Promise.all([
      getPublisher(),
      canPublish.value ? listPublisherAgents() : Promise.resolve([]),
    ]);
    overview.value = data;
    agents.value = list;
    Object.assign(profile, data.profile);
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  }
}

async function saveProfile(): Promise<void> {
  saving.value = true;
  try {
    const { payout_details: payoutDetails, ...publicProfile } = profile;
    await updatePublisher(
      canBill.value ? { ...publicProfile, payout_details: payoutDetails } : publicProfile,
    );
    $q.notify({ type: 'positive', message: 'ذخیره شد.' });
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <q-page class="page">
    <div class="page-head">
      <div>
        <h1>پنل ناشر</h1>
        <p>
          ایجنت خودتان را در بازارچه بفروشید. شما سرویس را می‌سازید؛ فروش، اعتبار مشتری، فرم
          تنظیمات، زمان‌بندی، مدل‌ها و ارسال خروجی با ماست.
        </p>
      </div>
      <q-btn
        v-if="canPublish"
        unelevated
        no-caps
        class="btn-pill"
        icon="add"
        label="انتشار ایجنت جدید"
        to="/publisher/agents/new"
      />
    </div>

    <div v-if="!overview" class="flex flex-center q-pa-xl">
      <q-spinner size="lg" color="primary" />
    </div>

    <template v-else>
      <div
        v-if="debt > 0"
        class="debt q-mb-md"
        :class="overview.test_runs_blocked ? 'error-banner' : 'note-banner'"
      >
        <span v-if="overview.test_runs_blocked" class="col">
          بدهی حساب شما از
          <span class="ltr">{{ usd(overview.test_run_debt_limit) }}</span> بیشتر شده است؛ اجرای
          آزمایشی تا جبران آن بسته است. اجرای مشتری‌ها ادامه دارد.
        </span>
        <span v-else class="col">
          مانده شما منفی است. اگر بدهی از
          <span class="ltr">{{ usd(overview.test_run_debt_limit) }}</span> بیشتر شود، اجرای آزمایشی
          بسته می‌شود.
        </span>
        <q-btn
          v-if="canBill"
          unelevated
          no-caps
          class="btn-pill"
          icon="account_balance_wallet"
          label="جبران از کیف پول"
          @click="openDeposit"
        />
      </div>
      <div class="tiles q-mb-lg">
        <div class="tile accent" :class="{ negative: Number(overview.summary.balance) < 0 }">
          <div class="tile-value ltr">{{ usd(overview.summary.balance) }}</div>
          <div class="tile-label">مانده برای تسویه</div>
          <div class="tile-note">
            <template v-if="overview.payout_due">در نوبت تسویه</template>
            <template v-else>
              تسویه از <span class="ltr">{{ usd(overview.payout_min) }}</span> به بالا
            </template>
          </div>
        </div>
        <div class="tile">
          <div class="tile-value ltr">{{ usd(overview.summary.earned) }}</div>
          <div class="tile-label">درآمد خالص شما</div>
          <div class="tile-note">
            سهم فروش <span class="ltr">{{ usd(overview.summary.share) }}</span> منهای هزینهٔ مدل
            <span class="ltr">{{ usd(overview.summary.model_cost) }}</span>
          </div>
        </div>
        <div class="tile">
          <div class="tile-value">{{ faNumber(overview.summary.units) }}</div>
          <div class="tile-label">واحد فروخته‌شده</div>
        </div>
        <div class="tile">
          <div class="tile-value">{{ faNumber(overview.summary.customers) }}</div>
          <div class="tile-label">
            مشتری، {{ faNumber(overview.summary.live_agents) }} ایجنت منتشرشده
          </div>
        </div>
      </div>

      <div class="panel panel-pad q-mb-lg">
        <h2 class="panel-title">درآمد خالص ۳۰ روز اخیر</h2>
        <DailyBars :days="daily" :range="30" count-label="واحد" />
      </div>

      <template v-if="canPublish">
        <h2 class="panel-title q-mb-md">ایجنت‌های شما</h2>
        <div v-if="!agents.length" class="panel empty q-mb-lg">
          <q-icon name="rocket" size="44px" class="faint" />
          <p class="q-mt-md">
            هنوز ایجنتی منتشر نکرده‌اید. سرویس‌تان را معرفی کنید، پارامترها و بسته‌ها را بسازید،
            آزمایش کنید و برای بررسی بفرستید.
          </p>
          <q-btn
            unelevated
            no-caps
            class="btn-pill q-mt-sm"
            label="شروع"
            to="/publisher/agents/new"
          />
        </div>
        <div v-else class="panel q-mb-lg agents">
          <router-link
            v-for="agent in agents"
            :key="agent.id"
            :to="`/publisher/agents/${agent.id}`"
            class="agent"
          >
            <span class="agent-icon"><q-icon :name="agent.icon || 'smart_toy'" size="22px" /></span>
            <span class="col ellipsis">
              <span class="ink-strong text-weight-bold">{{ agent.name }}</span>
              <span class="faint text-caption block">
                {{ agent.tagline ?? agent.slug }}
              </span>
            </span>
            <span class="stat gt-xs">
              <span class="ink-strong">{{ faNumber(agent.stats?.units ?? 0) }}</span>
              <span class="faint text-caption block">{{ agent.unit_name }}</span>
            </span>
            <span class="stat gt-xs">
              <span class="ink-strong ltr">{{ usd(agent.stats?.earned ?? '0') }}</span>
              <span class="faint text-caption block">درآمد خالص</span>
            </span>
            <span class="badges">
              <q-badge :color="statusColors[agent.status]" :label="agent.status_label" />
              <q-badge
                v-if="agent.pending_changes"
                color="warning"
                outline
                label="تغییرات در انتظار"
              />
            </span>
          </router-link>
        </div>
      </template>

      <div class="columns">
        <div class="panel panel-pad">
          <h2 class="panel-title">تسویه‌ها</h2>
          <div v-if="!overview.payouts.length" class="faint">هنوز تسویه‌ای انجام نشده است.</div>
          <div v-for="payout in overview.payouts" :key="payout.id" class="payout">
            <span class="col">
              <span class="ink-strong ltr">{{ usd(payout.amount) }}</span>
              <q-badge
                class="q-ml-sm"
                :color="payout.type === 'deposit' ? 'info' : 'positive'"
                outline
                :label="payout.type === 'deposit' ? 'واریز شما' : 'پرداخت به شما'"
              />
              <span v-if="payout.note" class="faint text-caption block">{{ payout.note }}</span>
            </span>
            <span class="faint text-caption">
              {{ faDateTime(payout.paid_at) }}
              <span v-if="payout.reference" class="ltr block">{{ payout.reference }}</span>
            </span>
          </div>
          <p class="faint text-caption q-mt-md q-mb-none">
            سهم شما از هر فروش و هزینهٔ مدل‌هایی که ایجنت‌تان صدا می‌زند در همان اجرا در حسابتان ثبت
            می‌شود و پلتفرم مانده را، وقتی به
            <span class="ltr">{{ usd(overview.payout_min) }}</span> برسد، به حسابی که وارد کرده‌اید
            تسویه می‌کند. اگر مانده منفی شود، می‌توانید آن را از کیف پول یکی از اپ‌هایتان جبران
            کنید.
          </p>
        </div>

        <div class="panel panel-pad">
          <h2 class="panel-title">پروفایل ناشر</h2>
          <div class="profile">
            <q-input
              v-model="profile.publisher_name"
              outlined
              label="نام عمومی"
              hint="در بازارچه کنار ایجنت‌هایتان دیده می‌شود"
              :readonly="!canPublish"
            />
            <q-input
              v-model="profile.publisher_url"
              outlined
              label="وب‌سایت"
              input-class="ltr"
              :readonly="!canPublish"
            />
            <q-input
              v-model="profile.support_email"
              outlined
              label="ایمیل پشتیبانی"
              input-class="ltr"
              :readonly="!canPublish"
            />
            <q-input
              v-if="canBill"
              v-model="profile.payout_details"
              outlined
              type="textarea"
              autogrow
              label="اطلاعات تسویه"
              hint="مثلاً شماره شبا و نام صاحب حساب؛ رمزنگاری‌شده نگه داشته می‌شود"
            />
          </div>
          <q-btn
            unelevated
            no-caps
            class="btn-pill q-mt-md"
            label="ذخیرهٔ پروفایل"
            :loading="saving"
            @click="saveProfile"
          />
        </div>
      </div>
    </template>

    <q-dialog v-model="depositing">
      <q-card style="width: 440px; max-width: 92vw; border-radius: 18px">
        <q-form @submit.prevent="submitDeposit">
          <q-card-section>
            <div class="text-h6">جبران بدهی از کیف پول</div>
            <div class="faint text-caption">
              مبلغ از کیف پول اپ انتخابی کم و به حساب ناشر اضافه می‌شود.
            </div>
          </q-card-section>
          <q-card-section class="column q-gutter-md">
            <q-select
              v-model="deposit.appId"
              outlined
              emit-value
              map-options
              :options="appOptions"
              label="اپ"
              :rules="[(v) => v !== null || 'یک اپ انتخاب کنید']"
            >
              <template #option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>
                    <q-item-label>{{ scope.opt.label }}</q-item-label>
                    <q-item-label caption class="ltr">{{ scope.opt.caption }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
            <q-input
              v-model="deposit.amount"
              outlined
              type="number"
              step="0.01"
              :min="overview?.deposit_limits.min"
              :max="overview?.deposit_limits.max"
              label="مبلغ (دلار)"
              input-class="ltr"
              :hint="`بدهی فعلی: ${usd(debt.toFixed(2))}`"
              :rules="[(v) => Number(v) > 0 || 'مبلغ لازم است']"
            />
          </q-card-section>
          <q-card-actions align="left" class="q-pa-md">
            <q-btn flat no-caps color="grey" label="انصراف" v-close-popup />
            <q-btn
              type="submit"
              unelevated
              no-caps
              class="btn-pill"
              label="انتقال"
              :loading="depositBusy"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.tiles {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.tile {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px 18px;
  background: var(--surface);
}
.tile.accent {
  border-color: rgb(50 148 106 / 50%);
  background: var(--brand-tint);
}
.tile.accent.negative {
  border-color: rgb(226 90 90 / 50%);
  background: rgb(226 90 90 / 10%);
}
.tile-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--ink-strong);
}
.tile-label {
  color: var(--muted);
  font-size: 0.82rem;
}
.tile-note {
  color: var(--faint);
  font-size: 0.72rem;
  margin-top: 4px;
}
.agents {
  overflow: hidden;
}
.agent {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
  transition: background 0.15s;
}
.agent:last-child {
  border-bottom: 0;
}
.agent:hover {
  background: var(--surface-2);
}
.agent-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: var(--brand-tint);
  color: #6fcf9f;
}
.stat {
  min-width: 90px;
  text-align: center;
}
.badges {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
.block {
  display: block;
}
.columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}
.debt {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.payout {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}
.profile {
  display: grid;
  gap: 14px;
}
@media (max-width: 1023px) {
  .tiles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .columns {
    grid-template-columns: 1fr;
  }
}
</style>
