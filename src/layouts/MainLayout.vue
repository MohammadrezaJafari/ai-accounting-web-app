<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { guides } from '../guides';
import BrandMark from '../components/BrandMark.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const drawer = ref(false);
const usesOpen = ref(route.path.startsWith('/docs/'));

const sections = [
  {
    title: 'شروع کار',
    links: [
      { to: '/', label: 'داشبورد' },
      { to: '/quickstart', label: 'شروع سریع' },
      { to: '/models', label: 'مدل‌ها و قیمت' },
    ],
  },
  {
    title: 'حساب کاربری',
    links: [
      { to: '/apps', label: 'اپ‌ها' },
      { to: '/keys', label: 'کلیدهای API' },
      { to: '/wallet', label: 'کیف پول' },
      { to: '/usage', label: 'نمودار مصارف' },
      { to: '/logs', label: 'لاگ درخواست‌ها' },
    ],
  },
];
const useCases = guides.filter((guide) => guide.slug !== 'api');

async function signOut(): Promise<void> {
  await auth.signOut();
  await router.replace({ name: 'login' });
}
</script>

<template>
  <q-layout view="hHh LpR fFf">
    <q-header class="header">
      <q-toolbar class="q-px-md" style="min-height: 64px">
        <q-btn
          flat
          round
          dense
          icon="menu"
          class="lt-md q-mr-sm"
          aria-label="منو"
          @click="drawer = !drawer"
        />
        <router-link to="/"><BrandMark /></router-link>
        <q-space />
        <router-link to="/quickstart" class="top-link gt-xs">مستندات</router-link>
        <router-link to="/docs/api" class="top-link gt-xs">API Reference</router-link>
        <q-btn flat round dense class="q-ml-sm" aria-label="حساب کاربری">
          <q-avatar size="34px" color="secondary" text-color="grey-4" icon="person" />
          <q-icon name="arrow_drop_down" color="grey-5" />
          <q-menu anchor="bottom end" self="top end" :offset="[0, 8]">
            <q-list style="min-width: 220px" class="q-py-sm">
              <q-item>
                <q-item-section>
                  <q-item-label>{{ auth.user?.name }}</q-item-label>
                  <q-item-label caption class="ltr">{{ auth.user?.email }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator class="q-my-xs" />
              <q-item v-close-popup clickable to="/wallet">
                <q-item-section avatar><q-icon name="account_balance_wallet" /></q-item-section>
                <q-item-section>کیف پول</q-item-section>
              </q-item>
              <q-item v-close-popup clickable to="/chat">
                <q-item-section avatar><q-icon name="chat_bubble_outline" /></q-item-section>
                <q-item-section>چت</q-item-section>
              </q-item>
              <q-item v-close-popup clickable @click="signOut">
                <q-item-section avatar><q-icon name="logout" /></q-item-section>
                <q-item-section>خروج</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawer" show-if-above :width="300" class="sidebar">
      <nav class="q-py-md">
        <template v-for="section in sections" :key="section.title">
          <div class="caption">{{ section.title }}</div>
          <router-link
            v-for="link in section.links"
            :key="link.to"
            :to="link.to"
            class="nav"
            :class="{
              active: link.to === '/' ? route.path === '/' : route.path.startsWith(link.to),
            }"
          >
            {{ link.label }}
          </router-link>
          <div class="divider" />
        </template>

        <div class="caption">مستندات</div>
        <button type="button" class="nav nav-toggle" @click="usesOpen = !usesOpen">
          <span>موارد استفاده</span>
          <q-icon :name="usesOpen ? 'expand_less' : 'expand_more'" size="18px" />
        </button>
        <q-slide-transition>
          <div v-show="usesOpen">
            <router-link
              v-for="guide in useCases"
              :key="guide.slug"
              :to="`/docs/${guide.slug}`"
              class="nav sub"
              :class="{ active: route.path === `/docs/${guide.slug}` }"
            >
              {{ guide.title.replace('استفاده در ', '') }}
            </router-link>
          </div>
        </q-slide-transition>
        <router-link to="/docs/api" class="nav" :class="{ active: route.path === '/docs/api' }">
          API Reference
        </router-link>
        <div class="divider" />
        <router-link to="/chat" class="nav go-chat">
          <q-icon name="arrow_forward" size="18px" />
          <span>رفتن به چت</span>
        </router-link>
      </nav>
    </q-drawer>

    <q-page-container class="content">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<style scoped lang="scss">
.header {
  background: var(--header);
  border-bottom: 1px solid var(--line-soft);
  color: var(--ink);
}
.top-link {
  color: var(--ink);
  margin-inline-start: 28px;
  font-size: 0.95rem;
}
.top-link:hover {
  color: var(--ink-strong);
}
.sidebar {
  background: var(--sidebar);
  border-inline-start: 1px solid var(--line-soft);
}
:deep(.q-drawer) {
  background: var(--sidebar);
}
.caption {
  color: var(--ink);
  font-size: 0.8rem;
  padding: 8px 24px 6px;
}
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 9px 24px;
  color: var(--ink);
  font-size: 0.92rem;
  background: none;
  border: 0;
  font: inherit;
  text-align: start;
  cursor: pointer;
}
.nav:hover {
  background: var(--surface);
}
.nav.active {
  background: var(--surface-2);
  color: var(--ink-strong);
}
.nav.sub {
  padding-inline-start: 44px;
  color: var(--muted);
}
.nav.sub.active {
  color: var(--ink-strong);
}
.go-chat {
  justify-content: flex-start;
  color: var(--muted);
}
.divider {
  height: 1px;
  background: var(--line-soft);
  margin: 12px 0;
}
.content {
  background: var(--page);
}
</style>
