<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { copyToClipboard, useQuasar } from 'quasar';
import {
  createAgentDestination,
  deleteAgentDestination,
  errorMessage,
  testAgentDestination,
  updateAgentDestination,
} from '../api';
import { faDateTime } from '../format';
import type { AgentDestination, DeliveryType } from '../types';

/** Where an agent's reports go: Telegram, Bale, email or a webhook. */
const props = defineProps<{
  instanceId: number;
  bots: { telegram_bot: string | null; bale_bot: string | null };
  canManage: boolean;
}>();
const destinations = defineModel<AgentDestination[]>({ required: true });
const $q = useQuasar();

const channels: { type: DeliveryType; label: string; icon: string; hint: string }[] = [
  { type: 'telegram', label: 'تلگرام', icon: 'send', hint: 'کانال یا گروه تلگرام' },
  { type: 'bale', label: 'بله', icon: 'chat', hint: 'کانال یا گروه بله' },
  { type: 'email', label: 'ایمیل', icon: 'mail_outline', hint: 'یک یا چند نشانی ایمیل' },
  { type: 'webhook', label: 'وب‌هوک', icon: 'webhook', hint: 'n8n، Zapier، Slack و …' },
];
const iconOf = (type: DeliveryType) => channels.find((c) => c.type === type)?.icon ?? 'send';

const adding = ref(false);
const saving = ref(false);
const testing = ref<number | null>(null);
interface DestinationDraft {
  type: DeliveryType;
  label: string;
  chat_id: string;
  bot_token: string;
  emails: string[];
  url: string;
}
const emptyDraft = (): DestinationDraft => ({
  type: 'telegram',
  label: '',
  chat_id: '',
  bot_token: '',
  emails: [],
  url: '',
});
const draft = reactive<DestinationDraft>(emptyDraft());
const platformBot = computed(() =>
  draft.type === 'telegram'
    ? props.bots.telegram_bot
    : draft.type === 'bale'
      ? props.bots.bale_bot
      : null,
);

function target(destination: AgentDestination): string {
  const s = destination.settings;
  return s.chat_id ?? s.emails?.join('، ') ?? s.url ?? '';
}

function open(): void {
  Object.assign(draft, emptyDraft());
  adding.value = true;
}

async function save(): Promise<void> {
  saving.value = true;
  const settings: Record<string, unknown> =
    draft.type === 'email'
      ? { emails: draft.emails }
      : draft.type === 'webhook'
        ? { url: draft.url }
        : { chat_id: draft.chat_id.trim(), bot_token: draft.bot_token.trim() || null };
  try {
    const created = await createAgentDestination(props.instanceId, {
      type: draft.type,
      ...(draft.label ? { label: draft.label } : {}),
      settings,
    });
    destinations.value = [...destinations.value, created];
    adding.value = false;
    if (created.type === 'webhook' && created.settings.secret) {
      $q.dialog({
        title: 'کلید امضای وب‌هوک',
        message: `هر درخواست هدر X-Signature دارد: HMAC-SHA256 بدنه با این کلید.<br><code dir="ltr">${created.settings.secret}</code>`,
        html: true,
        ok: { label: 'کپی و بستن', unelevated: true, color: 'primary' },
      }).onOk(() => void copyToClipboard(created.settings.secret ?? ''));
    }
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  } finally {
    saving.value = false;
  }
}

async function test(destination: AgentDestination): Promise<void> {
  testing.value = destination.id;
  try {
    const result = await testAgentDestination(destination.id);
    destination.last_error = result.error;
    $q.notify(
      result.ok
        ? { type: 'positive', message: 'پیام آزمایشی فرستاده شد.' }
        : { type: 'negative', message: result.error ?? 'ارسال نشد.', timeout: 6000 },
    );
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  } finally {
    testing.value = null;
  }
}

async function toggle(destination: AgentDestination, active: boolean): Promise<void> {
  Object.assign(destination, await updateAgentDestination(destination.id, { is_active: active }));
}

function remove(destination: AgentDestination): void {
  $q.dialog({
    title: 'حذف مقصد',
    message: `گزارش‌ها دیگر به «${destination.label}» فرستاده نمی‌شوند.`,
    cancel: { flat: true, label: 'انصراف', color: 'grey' },
    ok: { color: 'negative', unelevated: true, label: 'حذف' },
  }).onOk(() => {
    void deleteAgentDestination(destination.id).then(() => {
      destinations.value = destinations.value.filter((d) => d.id !== destination.id);
    });
  });
}
</script>

<template>
  <div>
    <div class="row items-center q-mb-md">
      <p class="muted col q-mb-none">
        هر گزارش علاوه بر همین پنل به این مقصدها هم فرستاده می‌شود. برای هر مقصد پیام آزمایشی
        بفرستید تا مطمئن شوید درست تنظیم شده.
      </p>
      <q-btn
        v-if="canManage"
        unelevated
        no-caps
        class="btn-pill"
        icon="add"
        label="مقصد جدید"
        @click="open"
      />
    </div>

    <div v-if="!destinations.length" class="panel empty">
      <q-icon name="forward_to_inbox" size="40px" class="faint" />
      <p class="q-mt-md">هنوز مقصدی ندارد؛ گزارش‌ها فقط در پنل دیده می‌شوند.</p>
    </div>
    <div v-else class="panel list">
      <div v-for="destination in destinations" :key="destination.id" class="item">
        <span class="channel"><q-icon :name="iconOf(destination.type)" size="20px" /></span>
        <div class="col ellipsis">
          <div class="ink-strong">
            {{ destination.label }}
            <span class="faint text-caption">· {{ destination.type_label }}</span>
          </div>
          <div class="faint text-caption target">{{ target(destination) }}</div>
          <div v-if="destination.last_error" class="text-caption error-text">
            <q-icon name="error_outline" size="14px" /> {{ destination.last_error }}
          </div>
          <div v-else-if="destination.last_delivered_at" class="text-caption ok-text">
            <q-icon name="check_circle" size="14px" /> آخرین ارسال:
            {{ faDateTime(destination.last_delivered_at) }}
          </div>
        </div>
        <template v-if="canManage">
          <q-btn
            flat
            dense
            no-caps
            class="btn-ghost-pill"
            icon="bolt"
            label="ارسال آزمایشی"
            :loading="testing === destination.id"
            @click="test(destination)"
          />
          <q-toggle
            :model-value="destination.is_active"
            color="primary"
            @update:model-value="(value) => toggle(destination, value)"
          />
          <q-btn
            flat
            round
            dense
            size="sm"
            icon="delete_outline"
            color="grey"
            aria-label="حذف"
            @click="remove(destination)"
          />
        </template>
      </div>
    </div>

    <q-dialog v-model="adding">
      <q-card style="width: 520px; max-width: 94vw; border-radius: 18px">
        <q-form @submit.prevent="save">
          <q-card-section>
            <div class="text-h6">مقصد جدید</div>
          </q-card-section>
          <q-card-section class="q-pt-none">
            <div class="channels">
              <button
                v-for="channel in channels"
                :key="channel.type"
                type="button"
                class="channel-option"
                :class="{ active: draft.type === channel.type }"
                @click="draft.type = channel.type"
              >
                <q-icon :name="channel.icon" size="22px" />
                <span class="ink-strong">{{ channel.label }}</span>
                <span class="faint">{{ channel.hint }}</span>
              </button>
            </div>
          </q-card-section>
          <q-card-section class="column q-gutter-md q-pt-none">
            <q-input
              v-model="draft.label"
              outlined
              label="نام (اختیاری)"
              placeholder="مثلاً کانال تیم مدیریت"
            />
            <template v-if="draft.type === 'telegram' || draft.type === 'bale'">
              <div class="note-banner text-caption">
                <template v-if="platformBot">
                  ربات <b class="ltr">@{{ platformBot }}</b> را به کانال یا گروه اضافه و
                  <b>ادمین</b> کنید، یا توکن ربات خودتان را وارد کنید.
                </template>
                <template v-else>
                  یک ربات بسازید، آن را ادمین کانال کنید و توکنش را وارد کنید.
                </template>
              </div>
              <q-input
                v-model="draft.chat_id"
                outlined
                label="شناسهٔ کانال یا گروه"
                placeholder="@my_channel یا -1001234567890"
                input-class="ltr"
                :rules="[(v) => !!v || 'شناسه لازم است']"
              />
              <q-input
                v-model="draft.bot_token"
                outlined
                :label="platformBot ? 'توکن ربات خودتان (اختیاری)' : 'توکن ربات'"
                placeholder="123456:ABC..."
                input-class="ltr"
                type="password"
              />
            </template>
            <q-select
              v-else-if="draft.type === 'email'"
              v-model="draft.emails"
              outlined
              multiple
              use-chips
              use-input
              hide-dropdown-icon
              new-value-mode="add-unique"
              input-debounce="0"
              label="نشانی‌های ایمیل"
              hint="هر نشانی را بنویسید و Enter بزنید"
            />
            <template v-else>
              <q-input
                v-model="draft.url"
                outlined
                label="آدرس وب‌هوک"
                placeholder="https://..."
                input-class="ltr"
                hint="درخواست POST با بدنهٔ JSON (report به Markdown) و امضای X-Signature"
              />
            </template>
          </q-card-section>
          <q-card-actions align="left" class="q-pa-md">
            <q-btn v-close-popup flat no-caps color="grey" label="انصراف" />
            <q-btn
              type="submit"
              unelevated
              no-caps
              class="btn-pill"
              label="افزودن"
              :loading="saving"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
.list {
  overflow: hidden;
}
.item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
}
.item:last-child {
  border-bottom: 0;
}
.channel {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--surface-2);
  color: var(--ink);
}
.target {
  overflow: hidden;
  text-overflow: ellipsis;
  /* rtl:begin:ignore */
  direction: ltr;
  text-align: right;
  /* rtl:end:ignore */
}
.error-text {
  color: #ff8a8e;
}
.ok-text {
  color: #6fcf9f;
}
.channels {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.channel-option {
  display: grid;
  gap: 2px;
  justify-items: start;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.78rem;
  text-align: start;
  cursor: pointer;
}
.channel-option .ink-strong {
  font-size: 0.95rem;
}
.channel-option.active {
  border-color: var(--brand);
  background: var(--brand-tint);
  color: var(--ink);
}
@media (max-width: 599px) {
  .item {
    flex-wrap: wrap;
  }
}
</style>
