<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useMeta, useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { ApiError, errorMessage, listApps, listModels, streamChat } from '../api';
import {
  loadChatPreferences,
  loadConversations,
  newConversationId,
  saveChatPreferences,
  saveConversations,
} from '../conversations';
import { usd } from '../format';
import { useAuthStore } from '../stores/auth';
import type { AiModel, App, Conversation } from '../types';
import ChatComposer from '../components/ChatComposer.vue';
import ChatMessageView from '../components/ChatMessageView.vue';
import ModelPicker from '../components/ModelPicker.vue';

useMeta({ title: 'چت | پلتفرم توسعه‌دهندگان' });

const $q = useQuasar();
const router = useRouter();
const auth = useAuthStore();
const userId = auth.user?.id ?? 0;
const preferences = loadChatPreferences(userId);

const drawer = ref(false);
const apps = ref<App[]>([]);
const models = ref<AiModel[]>([]);
const appId = ref<number | null>(preferences.appId);
const model = ref(preferences.model ?? '');
const conversations = ref<Conversation[]>(loadConversations(userId));
const activeId = ref<string | null>(null);
const draft = ref('');
const controller = ref<AbortController | null>(null);
const composer = ref<InstanceType<typeof ChatComposer> | null>(null);
const searching = ref(false);
const search = ref('');

const active = computed(() => conversations.value.find((c) => c.id === activeId.value) ?? null);
const streaming = computed(() => controller.value !== null);
const currentApp = computed(() => apps.value.find((a) => a.id === appId.value) ?? null);
const appOptions = computed(() => apps.value.map((a) => ({ value: a.id, label: a.name })));
const canSend = computed(() => !!currentApp.value && !!model.value);

const DAY = 24 * 60 * 60 * 1000;
const history = computed(() => {
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const groups = [
    { title: 'امروز', items: [] as Conversation[] },
    { title: '۷ روز گذشته', items: [] as Conversation[] },
    { title: 'قدیمی‌تر', items: [] as Conversation[] },
  ];
  conversations.value.forEach((c) => {
    const group = c.updatedAt >= startOfToday ? 0 : c.updatedAt >= startOfToday - 7 * DAY ? 1 : 2;
    groups[group]!.items.push(c);
  });
  return groups.filter((g) => g.items.length);
});
const searchResults = computed(() => {
  const term = search.value.trim().toLowerCase();
  return conversations.value.filter(
    (c) =>
      !term ||
      c.title.toLowerCase().includes(term) ||
      c.messages.some((m) => m.content.toLowerCase().includes(term)),
  );
});

const persist = () => saveConversations(userId, conversations.value);
const isMobile = () => $q.screen.width < 1024;

async function loadApps(): Promise<void> {
  apps.value = await listApps().catch(() => apps.value);
  if (!apps.value.some((a) => a.id === appId.value)) {
    appId.value = apps.value.find((a) => a.is_active)?.id ?? apps.value[0]?.id ?? null;
  }
}

function scrollToBottom(force = false): void {
  const root = document.scrollingElement ?? document.documentElement;
  const nearBottom = root.scrollHeight - root.scrollTop - window.innerHeight < 160;
  if (force || nearBottom) void nextTick(() => window.scrollTo({ top: root.scrollHeight }));
}

function stop(): void {
  controller.value?.abort();
}

function startNew(): void {
  stop();
  activeId.value = null;
  draft.value = '';
  searching.value = false;
  if (isMobile()) drawer.value = false;
  void nextTick(() => composer.value?.focus());
}

function open(conversation: Conversation): void {
  stop();
  activeId.value = conversation.id;
  if (models.value.some((m) => m.public_id === conversation.model))
    model.value = conversation.model;
  if (apps.value.some((a) => a.id === conversation.appId)) appId.value = conversation.appId;
  searching.value = false;
  if (isMobile()) drawer.value = false;
  scrollToBottom(true);
}

function remove(conversation: Conversation): void {
  if (conversation.id === activeId.value) startNew();
  conversations.value = conversations.value.filter((c) => c.id !== conversation.id);
  persist();
}

async function send(text: string): Promise<void> {
  const content = text.trim();
  if (!content || streaming.value || !canSend.value) return;

  if (!active.value) {
    conversations.value.unshift({
      id: newConversationId(),
      title: content.replace(/\s+/g, ' ').slice(0, 60),
      model: model.value,
      appId: appId.value,
      messages: [],
      updatedAt: Date.now(),
    });
    activeId.value = conversations.value[0]!.id;
  }
  const conversation = active.value!;
  conversation.model = model.value;
  conversation.appId = appId.value;
  conversation.updatedAt = Date.now();
  conversation.messages.push({ role: 'user', content });
  const context = conversation.messages.filter((m) => !m.error);
  conversation.messages.push({ role: 'assistant', content: '' });
  const reply = conversation.messages[conversation.messages.length - 1]!;
  conversations.value = [conversation, ...conversations.value.filter((c) => c !== conversation)];
  draft.value = '';
  persist();
  scrollToBottom(true);

  const abort = new AbortController();
  controller.value = abort;
  try {
    await streamChat(
      appId.value!,
      model.value,
      context,
      (delta) => {
        reply.content += delta;
        scrollToBottom();
      },
      abort.signal,
    );
  } catch (exception) {
    if (!abort.signal.aborted) {
      reply.error = true;
      reply.status = exception instanceof ApiError ? exception.status : 0;
      reply.content = errorMessage(exception, 'پاسخی دریافت نشد.');
    }
  } finally {
    if (!reply.content) conversation.messages.pop();
    controller.value = null;
    conversation.updatedAt = Date.now();
    persist();
    void loadApps();
  }
}

async function signOut(): Promise<void> {
  stop();
  await auth.signOut();
  await router.replace({ name: 'login' });
}

watch([appId, model], () => {
  saveChatPreferences(userId, { appId: appId.value, model: model.value || null });
});

onMounted(async () => {
  drawer.value = !isMobile();
  const [, list] = await Promise.all([loadApps(), listModels().catch(() => [] as AiModel[])]);
  models.value = list;
  if (!list.some((m) => m.public_id === model.value)) {
    model.value = (list.find((m) => m.is_featured) ?? list[0])?.public_id ?? '';
  }
});
onBeforeUnmount(stop);
</script>

<template>
  <q-layout view="lHh LpR lFf" class="chat">
    <q-drawer v-model="drawer" :width="260" :breakpoint="1023" class="side">
      <div class="side-inner">
        <div class="side-top">
          <q-btn
            flat
            round
            dense
            icon="view_sidebar"
            aria-label="بستن سایدبار"
            @click="drawer = false"
          >
            <q-tooltip>بستن سایدبار</q-tooltip>
          </q-btn>
          <q-space />
          <q-btn flat round dense icon="search" aria-label="جست‌وجو" @click="searching = true">
            <q-tooltip>جست‌وجو در گفت‌وگوها</q-tooltip>
          </q-btn>
        </div>

        <button type="button" class="side-link" @click="startNew">
          <q-icon name="edit_square" size="20px" />
          <span>گفت‌وگو جدید</span>
        </button>
        <router-link to="/models" class="side-link">
          <q-icon name="auto_awesome" size="20px" />
          <span>لیست مدل‌ها</span>
        </router-link>
        <router-link to="/" class="side-link">
          <q-icon name="code" size="20px" />
          <span>پلتفرم توسعه‌دهندگان</span>
        </router-link>

        <div class="history">
          <div v-if="!conversations.length" class="faint text-caption q-px-md q-pt-md">
            گفت‌وگوهای شما اینجا ذخیره می‌شوند.
          </div>
          <template v-for="group in history" :key="group.title">
            <div class="history-title">{{ group.title }}</div>
            <div
              v-for="conversation in group.items"
              :key="conversation.id"
              class="history-item"
              :class="{ active: conversation.id === activeId }"
            >
              <button type="button" class="history-open" @click="open(conversation)">
                {{ conversation.title }}
              </button>
              <q-btn
                flat
                round
                dense
                size="sm"
                icon="more_horiz"
                class="history-more"
                aria-label="گزینه‌ها"
              >
                <q-menu anchor="bottom end" self="top end">
                  <q-list dense style="min-width: 140px">
                    <q-item
                      v-close-popup
                      clickable
                      class="text-negative"
                      @click="remove(conversation)"
                    >
                      <q-item-section avatar><q-icon name="delete_outline" /></q-item-section>
                      <q-item-section>حذف</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
          </template>
        </div>

        <div class="side-bottom">
          <div class="wallet">
            <template v-if="apps.length">
              <div class="row items-center no-wrap">
                <q-icon name="account_balance_wallet" size="18px" class="muted q-mr-sm" />
                <q-select
                  v-model="appId"
                  class="col"
                  dense
                  borderless
                  emit-value
                  map-options
                  options-dense
                  :options="appOptions"
                  aria-label="اپ پرداخت‌کننده"
                />
              </div>
              <div class="row items-center no-wrap q-mt-xs">
                <span
                  class="ltr balance"
                  :class="{ 'text-negative': Number(currentApp?.balance ?? 0) <= 0 }"
                  >{{ usd(currentApp?.balance) }}</span
                >
                <q-space />
                <router-link to="/wallet" class="charge">شارژ کیف پول</router-link>
              </div>
            </template>
            <template v-else>
              <div class="muted text-caption">برای استفاده از چت یک اپ بسازید و شارژ کنید.</div>
              <router-link to="/apps" class="charge">ساخت اپ</router-link>
            </template>
          </div>

          <q-btn flat no-caps class="account" align="left">
            <q-avatar size="32px" color="secondary" text-color="white" icon="person" />
            <span class="account-name ellipsis">{{ auth.user?.name ?? 'حساب کاربری' }}</span>
            <q-menu anchor="top middle" self="bottom middle" :offset="[0, 8]" fit>
              <q-list class="q-py-xs">
                <q-item class="q-py-sm">
                  <q-item-section>
                    <q-item-label class="ink-strong">{{ auth.user?.name }}</q-item-label>
                    <q-item-label caption class="ltr faint">{{ auth.user?.email }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-separator class="q-my-xs" />
                <q-item v-close-popup clickable to="/">
                  <q-item-section avatar><q-icon name="code" /></q-item-section>
                  <q-item-section>پلتفرم توسعه‌دهندگان</q-item-section>
                </q-item>
                <q-item v-close-popup clickable to="/wallet">
                  <q-item-section avatar><q-icon name="account_balance_wallet" /></q-item-section>
                  <q-item-section>کیف پول</q-item-section>
                </q-item>
                <q-item v-close-popup clickable @click="signOut">
                  <q-item-section avatar><q-icon name="logout" /></q-item-section>
                  <q-item-section>خروج</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
      </div>
    </q-drawer>

    <q-header class="head">
      <q-toolbar style="min-height: 56px">
        <template v-if="!drawer">
          <q-btn
            flat
            round
            dense
            icon="view_sidebar"
            aria-label="باز کردن سایدبار"
            @click="drawer = true"
          />
          <q-btn
            flat
            round
            dense
            icon="edit_square"
            class="q-ml-xs"
            aria-label="گفت‌وگو جدید"
            @click="startNew"
          />
        </template>
        <ModelPicker v-model="model" :models="models" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page class="chat-page" :class="{ empty: !active }">
        <div v-if="!active" class="welcome">
          <h1>چطور می‌توانم به شما کمک کنم؟</h1>
          <ChatComposer
            ref="composer"
            v-model="draft"
            :streaming="streaming"
            :disabled="!canSend"
            @send="send"
            @stop="stop"
          />
          <div v-if="!apps.length" class="faint text-caption q-mt-md">
            برای ارسال پیام اول در <router-link to="/apps" class="text-primary">اپ‌ها</router-link>
            یک اپ بسازید و آن را شارژ کنید.
          </div>
        </div>
        <div v-else class="thread">
          <ChatMessageView
            v-for="(message, index) in active.messages"
            :key="index"
            :message="message"
            :pending="streaming && index === active.messages.length - 1"
          />
        </div>
      </q-page>
    </q-page-container>

    <q-footer v-if="active" class="foot">
      <div class="foot-inner">
        <ChatComposer
          ref="composer"
          v-model="draft"
          :streaming="streaming"
          :disabled="!canSend"
          @send="send"
          @stop="stop"
        />
        <div class="disclaimer">
          مدل‌های هوش مصنوعی ممکن است اشتباه کنند؛ صحت اطلاعات مهم را بررسی کنید.
        </div>
      </div>
    </q-footer>

    <q-dialog v-model="searching" position="top">
      <q-card class="search-card">
        <q-card-section class="q-pb-sm">
          <q-input
            v-model="search"
            dense
            borderless
            autofocus
            placeholder="جست‌وجو در گفت‌وگوها..."
          >
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </q-card-section>
        <q-separator />
        <q-list class="search-list q-py-xs">
          <q-item clickable @click="startNew">
            <q-item-section avatar><q-icon name="edit_square" /></q-item-section>
            <q-item-section>گفت‌وگو جدید</q-item-section>
          </q-item>
          <q-item
            v-for="conversation in searchResults"
            :key="conversation.id"
            clickable
            @click="open(conversation)"
          >
            <q-item-section avatar><q-icon name="chat_bubble_outline" /></q-item-section>
            <q-item-section>
              <q-item-label class="ellipsis">{{ conversation.title }}</q-item-label>
            </q-item-section>
          </q-item>
          <q-item v-if="search && !searchResults.length">
            <q-item-section class="faint">نتیجه‌ای پیدا نشد.</q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<style scoped>
.chat {
  background: var(--page);
}
.side :deep(.q-drawer),
:deep(.q-drawer) {
  background: var(--sidebar);
}
.side-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 10px 8px;
}
.side-top {
  display: flex;
  align-items: center;
  padding: 0 4px 8px;
  color: var(--ink);
}
.side-link {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border-radius: 10px;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.92rem;
  color: var(--ink);
  cursor: pointer;
  text-align: start;
}
.side-link:hover {
  background: var(--surface);
}
.history {
  flex: 1;
  overflow-y: auto;
  margin: 12px 0 8px;
}
.history-title {
  color: var(--faint);
  font-size: 0.78rem;
  padding: 12px 12px 6px;
}
.history-item {
  display: flex;
  align-items: center;
  border-radius: 10px;
}
.history-item:hover,
.history-item.active {
  background: var(--surface-2);
}
.history-open {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.88rem;
  color: var(--ink);
  text-align: start;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}
.history-more {
  opacity: 0;
  color: var(--muted);
}
.history-item:hover .history-more,
.history-item.active .history-more,
.history-more:focus-visible {
  opacity: 1;
}
.side-bottom {
  border-top: 1px solid var(--line-soft);
  padding-top: 8px;
}
.wallet {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 8px 12px 10px;
  margin-bottom: 6px;
}
.wallet :deep(.q-field__native),
.wallet :deep(.q-field__control) {
  min-height: 30px;
  color: var(--ink-strong);
  font-size: 0.88rem;
}
.balance {
  font-weight: 700;
  color: var(--ink-strong);
}
.charge {
  font-size: 0.82rem;
  color: #6fcf9f;
}
.account {
  width: 100%;
  border-radius: 10px;
  padding: 6px 8px;
  color: var(--ink);
}
.account-name {
  margin-inline-start: 10px;
  font-size: 0.9rem;
}
.head {
  background: var(--page);
  color: var(--ink);
}
.chat-page {
  display: flex;
  flex-direction: column;
}
.chat-page.empty {
  justify-content: center;
}
.welcome {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 0 16px 12vh;
  text-align: center;
}
.welcome h1 {
  font-size: 1.75rem;
  font-weight: 600;
  margin-bottom: 28px;
}
.welcome .composer {
  text-align: start;
}
.thread {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 24px 16px 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.foot {
  background: var(--page);
}
.foot-inner {
  max-width: 760px;
  margin: 0 auto;
  padding: 0 16px 8px;
}
.disclaimer {
  color: var(--faint);
  font-size: 0.75rem;
  text-align: center;
  padding-top: 8px;
}
.search-card {
  width: 560px;
  max-width: 94vw;
  margin-top: 10vh;
  border-radius: 18px;
}
.search-list {
  max-height: 50vh;
  overflow-y: auto;
}
</style>
