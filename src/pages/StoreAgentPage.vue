<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMeta, useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { agentCatalog, buyAgentPackage, claimAgentTrial, errorMessage, listApps } from '../api';
import { faNumber, usd } from '../format';
import { renderMarkdown } from '../markdown';
import { useAuthStore } from '../stores/auth';
import type { Agent, AgentPackage, App, ConfigFieldType } from '../types';

/** One agent in the store: what it does, what you set, its packages and buying them. */
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const $q = useQuasar();

const agent = ref<Agent | null>(null);
const apps = ref<App[]>([]);
const buying = ref<AgentPackage | null>(null);
const payFrom = ref<number | null>(null);
const busy = ref(false);
const payApp = computed(() => apps.value.find((a) => a.id === payFrom.value) ?? null);
const description = computed(() =>
  agent.value?.description ? renderMarkdown(agent.value.description) : '',
);

useMeta(() => ({ title: `${agent.value?.name ?? 'ایجنت'} | بازارچهٔ ایجنت‌ها` }));

const typeIcons: Record<ConfigFieldType, string> = {
  text: 'short_text',
  textarea: 'notes',
  number: 'pin',
  select: 'radio_button_checked',
  multiselect: 'checklist',
  tags: 'sell',
  url: 'link',
  url_list: 'link',
  toggle: 'toggle_on',
  secret: 'key',
};

const platform = [
  {
    icon: 'event_repeat',
    text: 'اجرای زمان‌بندی‌شده در ساعت‌ها و روزهایی که تعیین می‌کنید، یا دستی',
  },
  {
    icon: 'forward_to_inbox',
    text: 'ارسال خروجی به تلگرام، بله، ایمیل یا وب‌هوک (n8n، Zapier و …)',
  },
  { icon: 'savings', text: 'اجرایی که چیزی تحویل ندهد یا خطا بخورد اعتباری مصرف نمی‌کند' },
];

async function load(): Promise<void> {
  try {
    const [catalog, appList] = await Promise.all([agentCatalog(), listApps()]);
    agent.value = catalog.data.find((a) => a.id === Number(route.params.agentId)) ?? null;
    apps.value = appList;
    if (!agent.value) await router.replace('/store');
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  }
}

function startPurchase(pack: AgentPackage): void {
  buying.value = pack;
  payFrom.value =
    [...apps.value].sort((a, b) => Number(b.balance) - Number(a.balance))[0]?.id ?? null;
}

async function purchase(): Promise<void> {
  if (!agent.value || !buying.value || !payFrom.value) return;
  busy.value = true;
  try {
    const result = await buyAgentPackage(agent.value.id, buying.value.id, payFrom.value);
    agent.value.credits = result.credits;
    $q.notify({
      type: 'positive',
      message: `${faNumber(buying.value.units)} ${agent.value.unit_name} اضافه شد.`,
    });
    buying.value = null;
    apps.value = await listApps();
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  } finally {
    busy.value = false;
  }
}

async function claimTrial(): Promise<void> {
  if (!agent.value) return;
  busy.value = true;
  try {
    agent.value.credits = (await claimAgentTrial(agent.value.id)).credits;
    agent.value.trial_available = false;
    $q.notify({
      type: 'positive',
      message: `${faNumber(agent.value.free_trial_units)} ${agent.value.unit_name} رایگان اضافه شد.`,
    });
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>

<template>
  <q-page class="page">
    <div v-if="!agent" class="flex flex-center q-pa-xl">
      <q-spinner size="lg" color="primary" />
    </div>

    <template v-else>
      <q-breadcrumbs class="faint text-caption q-mb-md" active-color="grey">
        <q-breadcrumbs-el label="بازارچه" to="/store" />
        <q-breadcrumbs-el :label="agent.name" />
      </q-breadcrumbs>

      <div class="hero panel">
        <span class="agent-icon"><q-icon :name="agent.icon" size="34px" /></span>
        <div class="col">
          <h1 class="q-mb-xs">{{ agent.name }}</h1>
          <p class="muted q-mb-sm">{{ agent.tagline }}</p>
          <div class="meta">
            <span v-if="agent.category" class="tag">{{ agent.category }}</span>
            <span class="faint">
              ناشر:
              <a
                v-if="agent.publisher?.url"
                :href="agent.publisher.url"
                target="_blank"
                rel="noopener"
                class="link"
              >
                {{ agent.publisher.name }}
              </a>
              <template v-else>{{ agent.publisher?.name ?? 'پلتفرم' }}</template>
            </span>
          </div>
        </div>
        <div class="side">
          <div class="credits" :class="{ empty: agent.credits < 1 }">
            <div class="credits-value">{{ faNumber(agent.credits) }}</div>
            <div class="credits-label">{{ agent.unit_name }} باقی‌مانده</div>
          </div>
          <q-btn
            v-if="agent.trial_available && auth.can('manage-apps')"
            outline
            no-caps
            color="primary"
            class="btn-pill full-width"
            icon="redeem"
            :label="`${faNumber(agent.free_trial_units)} ${agent.unit_name} رایگان برای آزمایش`"
            :loading="busy"
            @click="claimTrial"
          />
          <q-btn
            v-if="auth.can('manage-apps')"
            unelevated
            no-caps
            class="btn-pill full-width"
            icon="add"
            label="راه‌اندازی"
            :to="{ path: '/agents/new', query: { agent: agent.id } }"
          />
        </div>
      </div>

      <div class="layout">
        <div class="main">
          <section v-if="description" class="panel panel-pad">
            <h2 class="panel-title">دربارهٔ این ایجنت</h2>
            <!-- eslint-disable-next-line vue/no-v-html -- sanitized by DOMPurify in renderMarkdown -->
            <div class="description" v-html="description" />
          </section>

          <section v-if="agent.config_schema.length" class="panel panel-pad">
            <h2 class="panel-title">چه چیزهایی را تنظیم می‌کنید</h2>
            <ul class="fields">
              <li v-for="field in agent.config_schema" :key="field.key">
                <q-icon :name="typeIcons[field.type]" size="18px" class="faint" />
                <span>
                  <span class="ink-strong">{{ field.label }}</span>
                  <span v-if="field.required" class="faint text-caption"> (لازم)</span>
                  <span v-if="field.hint" class="faint text-caption block">{{ field.hint }}</span>
                </span>
              </li>
            </ul>
          </section>

          <section class="panel panel-pad">
            <h2 class="panel-title">همراه هر ایجنت</h2>
            <ul class="fields">
              <li v-for="item in platform" :key="item.icon">
                <q-icon :name="item.icon" size="18px" class="faint" />
                <span>{{ item.text }}</span>
              </li>
            </ul>
          </section>
        </div>

        <aside class="panel panel-pad">
          <h2 class="panel-title">بسته‌ها</h2>
          <div class="packages">
            <div v-for="pack in agent.packages" :key="pack.id" class="pack">
              <div class="row items-baseline">
                <div class="pack-units col">
                  {{ faNumber(pack.units) }} <small>{{ agent.unit_name }}</small>
                </div>
                <div class="ltr pack-price">{{ usd(pack.price) }}</div>
              </div>
              <div class="faint text-caption">
                هر {{ agent.unit_name }} <span class="ltr">{{ usd(pack.unit_price) }}</span>
              </div>
              <q-btn
                v-if="auth.can('manage-billing')"
                unelevated
                no-caps
                class="btn-pill full-width q-mt-md"
                label="خرید"
                @click="startPurchase(pack)"
              />
            </div>
          </div>
          <p v-if="agent.max_units_per_run > 1" class="faint text-caption q-mt-md q-mb-none">
            هر اجرا بسته به خروجی تا {{ faNumber(agent.max_units_per_run) }} {{ agent.unit_name }}
            مصرف می‌کند.
          </p>
          <p v-if="!auth.can('manage-billing')" class="faint text-caption q-mt-md q-mb-none">
            خرید بسته با مالک یا نقش مالی سازمان است.
          </p>
        </aside>
      </div>
    </template>

    <q-dialog :model-value="!!buying" @update:model-value="buying = null">
      <q-card v-if="buying && agent" style="width: 440px; max-width: 92vw; border-radius: 18px">
        <q-card-section>
          <div class="text-h6">خرید {{ buying.name }}</div>
          <p class="muted q-mt-sm q-mb-none">
            مبلغ <span class="ltr">{{ usd(buying.price) }}</span> از کیف پول اپ انتخابی کم می‌شود و
            {{ faNumber(buying.units) }} {{ agent.unit_name }} «{{ agent.name }}» به اعتبار سازمان
            اضافه می‌شود.
          </p>
        </q-card-section>
        <q-card-section>
          <q-select
            v-model="payFrom"
            outlined
            emit-value
            map-options
            label="پرداخت از کیف پول"
            :options="apps.map((a) => ({ value: a.id, label: `${a.name} — ${usd(a.balance)}` }))"
          />
          <div
            v-if="payApp && Number(payApp.balance) < Number(buying.price)"
            class="error-banner q-mt-md"
          >
            موجودی این اپ کافی نیست.
            <router-link to="/wallet" class="text-weight-bold">شارژ کیف پول</router-link>
          </div>
        </q-card-section>
        <q-card-actions align="left" class="q-pa-md">
          <q-btn v-close-popup flat no-caps color="grey" label="انصراف" />
          <q-btn
            unelevated
            no-caps
            class="btn-pill"
            label="پرداخت و خرید"
            :loading="busy"
            :disable="!payApp || Number(payApp.balance) < Number(buying.price)"
            @click="purchase"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.hero {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  margin-bottom: 20px;
}
.hero h1 {
  font-size: 1.5rem;
}
.agent-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 68px;
  height: 68px;
  border-radius: 18px;
  background: var(--brand-tint);
  color: #6fcf9f;
  align-self: flex-start;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  font-size: 0.85rem;
}
.tag {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 2px 10px;
  color: var(--ink);
}
.link {
  color: #6fcf9f;
}
.side {
  display: grid;
  gap: 10px;
  min-width: 170px;
}
.credits {
  text-align: center;
  border: 1px solid rgb(50 148 106 / 50%);
  background: var(--brand-tint);
  border-radius: 14px;
  padding: 10px 18px;
}
.credits.empty {
  border-color: rgb(226 163 54 / 50%);
  background: var(--amber-tint);
}
.credits-value {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--ink-strong);
  line-height: 1.3;
}
.credits-label {
  font-size: 0.78rem;
  color: var(--muted);
}
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  align-items: start;
}
.main {
  display: grid;
  gap: 20px;
}
.description {
  line-height: 1.9;
  color: var(--ink);
}
.description :deep(p) {
  margin: 0 0 10px;
}
.description :deep(ul) {
  padding-inline-start: 20px;
  margin: 0;
}
.fields {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
}
.fields li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  line-height: 1.7;
}
.block {
  display: block;
}
.packages {
  display: grid;
  gap: 12px;
}
.pack {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px;
  background: var(--surface-2);
}
.pack-units {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--ink-strong);
}
.pack-units small {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--muted);
}
.pack-price {
  font-size: 1.05rem;
  color: var(--ink);
}
@media (max-width: 1023px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 599px) {
  .hero {
    flex-wrap: wrap;
    padding: 16px;
  }
  .side {
    width: 100%;
  }
}
</style>
