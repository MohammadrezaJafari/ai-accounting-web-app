<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMeta, useQuasar } from 'quasar';
import { agentCatalog, buyAgentPackage, errorMessage, listAgentInstances, listApps } from '../api';
import { agentRunStatuses, faDateTime, faNumber, scheduleSummary, usd } from '../format';
import { useAuthStore } from '../stores/auth';
import type { Agent, AgentInstance, AgentPackage, App } from '../types';

useMeta({ title: 'ایجنت‌ها | پلتفرم توسعه‌دهندگان' });

const auth = useAuthStore();
const $q = useQuasar();

const agents = ref<Agent[] | null>(null);
const instances = ref<AgentInstance[]>([]);
const apps = ref<App[]>([]);

const buying = ref<{ agent: Agent; pack: AgentPackage } | null>(null);
const payFrom = ref<number | null>(null);
const busy = ref(false);
const payApp = computed(() => apps.value.find((a) => a.id === payFrom.value) ?? null);

const channelIcons: Record<string, string> = {
  telegram: 'send',
  bale: 'chat',
  email: 'mail_outline',
  webhook: 'webhook',
};

async function load(): Promise<void> {
  try {
    const [catalog, list, appList] = await Promise.all([
      agentCatalog(),
      listAgentInstances(),
      listApps(),
    ]);
    agents.value = catalog.data;
    instances.value = list;
    apps.value = appList;
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  }
}

function startPurchase(agent: Agent, pack: AgentPackage): void {
  buying.value = { agent, pack };
  payFrom.value =
    [...apps.value].sort((a, b) => Number(b.balance) - Number(a.balance))[0]?.id ?? null;
}

async function purchase(): Promise<void> {
  if (!buying.value || !payFrom.value) return;
  busy.value = true;
  try {
    const result = await buyAgentPackage(
      buying.value.agent.id,
      buying.value.pack.id,
      payFrom.value,
    );
    buying.value.agent.credits = result.credits;
    $q.notify({
      type: 'positive',
      message: `${faNumber(buying.value.pack.units)} ${buying.value.agent.unit_name} اضافه شد.`,
    });
    buying.value = null;
    apps.value = await listApps();
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
    <div class="page-head">
      <div>
        <h1>ایجنت‌ها</h1>
        <p>کارهای تکراری را به ایجنت بسپارید؛ هزینه به ازای خروجی است، نه توکن.</p>
      </div>
    </div>

    <div v-if="agents === null" class="flex flex-center q-pa-xl">
      <q-spinner size="lg" color="primary" />
    </div>

    <template v-else>
      <div v-for="agent in agents" :key="agent.id" class="panel agent q-mb-xl">
        <div class="agent-head">
          <span class="agent-icon"><q-icon name="feed" size="28px" /></span>
          <div class="col">
            <div class="agent-name">{{ agent.name }}</div>
            <p class="muted q-mb-none">{{ agent.description }}</p>
          </div>
          <div class="credits" :class="{ empty: agent.credits < 1 }">
            <div class="credits-value">{{ faNumber(agent.credits) }}</div>
            <div class="credits-label">{{ agent.unit_name }} باقی‌مانده</div>
          </div>
        </div>

        <div class="packages">
          <div v-for="pack in agent.packages" :key="pack.id" class="pack">
            <div class="pack-units">
              {{ faNumber(pack.units) }} <small>{{ agent.unit_name }}</small>
            </div>
            <div class="ltr pack-price">{{ usd(pack.price) }}</div>
            <div class="faint text-caption">
              هر {{ agent.unit_name }} <span class="ltr">{{ usd(pack.unit_price) }}</span>
            </div>
            <q-btn
              v-if="auth.can('manage-billing')"
              unelevated
              no-caps
              class="btn-pill full-width q-mt-md"
              label="خرید"
              @click="startPurchase(agent, pack)"
            />
          </div>
        </div>
        <div class="faint text-caption q-mt-md">
          اجرایی که خبر تازه‌ای پیدا نکند اعتباری مصرف نمی‌کند.
        </div>
      </div>

      <div class="row items-center q-mb-md">
        <h2 class="panel-title col q-mb-none">ایجنت‌های من</h2>
        <q-btn
          v-if="auth.can('manage-apps') && agents.length"
          unelevated
          no-caps
          class="btn-pill"
          icon="add"
          label="ایجنت جدید"
          :to="{ path: '/agents/new', query: { agent: agents[0]!.id } }"
        />
      </div>

      <div v-if="!instances.length" class="panel empty">
        <q-icon name="smart_toy" size="44px" class="faint" />
        <p class="q-mt-md">
          هنوز ایجنتی نساخته‌اید. منابع خبری و کلیدواژه‌ها را بدهید تا هر روز برایتان گزارش بسازد.
        </p>
      </div>
      <div v-else class="instances">
        <router-link
          v-for="instance in instances"
          :key="instance.id"
          :to="`/agents/${instance.id}`"
          class="panel panel-pad instance"
        >
          <div class="row items-center no-wrap">
            <div class="col ellipsis">
              <div class="ink-strong text-weight-bold">{{ instance.name }}</div>
              <div class="faint text-caption">{{ instance.agent.name }}</div>
            </div>
            <q-badge v-if="!instance.is_active" color="grey-8" label="متوقف" />
          </div>
          <div class="meta q-mt-md">
            <div>
              <q-icon name="event_repeat" size="16px" class="faint q-mr-xs" />
              {{ scheduleSummary(instance.run_hours, instance.run_days) }}
            </div>
            <div>
              <q-icon name="rss_feed" size="16px" class="faint q-mr-xs" />
              {{ faNumber(instance.config.sources.length) }} منبع
              <template v-if="instance.config.keywords.length">
                · {{ instance.config.keywords.slice(0, 3).join('، ') }}
              </template>
            </div>
          </div>
          <div class="row items-center q-mt-md">
            <div class="col">
              <template v-if="instance.latest_run">
                <q-icon
                  :name="agentRunStatuses[instance.latest_run.status]?.icon"
                  :color="agentRunStatuses[instance.latest_run.status]?.color"
                  size="18px"
                />
                <span class="text-caption q-ml-xs">
                  {{ agentRunStatuses[instance.latest_run.status]?.label }} —
                  {{ faDateTime(instance.latest_run.created_at) }}
                </span>
              </template>
              <span v-else class="faint text-caption">هنوز اجرا نشده</span>
            </div>
            <q-icon
              v-for="destination in instance.destinations"
              :key="destination.id"
              :name="channelIcons[destination.type]"
              size="18px"
              class="faint q-ml-xs"
            >
              <q-tooltip>{{ destination.type_label }}: {{ destination.label }}</q-tooltip>
            </q-icon>
          </div>
        </router-link>
      </div>
    </template>

    <q-dialog :model-value="!!buying" @update:model-value="buying = null">
      <q-card v-if="buying" style="width: 440px; max-width: 92vw; border-radius: 18px">
        <q-card-section>
          <div class="text-h6">خرید {{ buying.pack.name }}</div>
          <p class="muted q-mt-sm q-mb-none">
            مبلغ <span class="ltr">{{ usd(buying.pack.price) }}</span> از کیف پول اپ انتخابی کم
            می‌شود و {{ faNumber(buying.pack.units) }} {{ buying.agent.unit_name }} به اعتبار سازمان
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
            v-if="payApp && Number(payApp.balance) < Number(buying.pack.price)"
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
            :disable="!payApp || Number(payApp.balance) < Number(buying.pack.price)"
            @click="purchase"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.agent {
  padding: 24px;
}
.agent-head {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 22px;
}
.agent-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--brand-tint);
  color: #6fcf9f;
}
.agent-name {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--ink-strong);
  margin-bottom: 4px;
}
.credits {
  text-align: center;
  border: 1px solid rgb(50 148 106 / 50%);
  background: var(--brand-tint);
  border-radius: 14px;
  padding: 10px 18px;
  min-width: 120px;
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
.packages {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
}
.pack {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px;
  background: var(--surface-2);
}
.pack-units {
  font-size: 1.3rem;
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
  margin: 4px 0;
}
.instances {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}
.instance {
  display: block;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.instance:hover {
  border-color: var(--surface-3);
  background: var(--surface-2);
}
.meta {
  display: grid;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--muted);
}
@media (max-width: 599px) {
  .agent {
    padding: 16px;
  }
  .agent-head {
    flex-wrap: wrap;
  }
  .credits {
    width: 100%;
  }
}
</style>
