<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { guides } from '../guides';
import type { Permission } from '../types';
import BrandMark from '../components/BrandMark.vue';
import NotificationBell from '../components/NotificationBell.vue';
import OrganizationSwitcher from '../components/OrganizationSwitcher.vue';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const drawer = ref(false);
const usesOpen = ref(route.path.startsWith('/docs/'));

interface NavLink {
  to: string;
  label: string;
  icon: string;
  permission?: Permission;
}

const allSections: { title: string; links: NavLink[] }[] = [
  {
    title: 'شروع کار',
    links: [
      { to: '/', label: 'داشبورد', icon: 'space_dashboard' },
      { to: '/quickstart', label: 'شروع سریع', icon: 'rocket_launch' },
      { to: '/models', label: 'مدل‌ها و قیمت', icon: 'auto_awesome' },
    ],
  },
  {
    title: 'ایجنت‌ها',
    links: [
      { to: '/store', label: 'بازارچه', icon: 'storefront' },
      { to: '/agents', label: 'ایجنت‌های من', icon: 'smart_toy' },
    ],
  },
  {
    title: 'حساب کاربری',
    links: [
      { to: '/apps', label: 'اپ‌ها', icon: 'apps' },
      { to: '/keys', label: 'کلیدهای API', icon: 'vpn_key', permission: 'manage-keys' },
      {
        to: '/wallet',
        label: 'کیف پول',
        icon: 'account_balance_wallet',
        permission: 'manage-billing',
      },
      { to: '/usage', label: 'نمودار مصارف', icon: 'bar_chart' },
      { to: '/logs', label: 'لاگ درخواست‌ها', icon: 'receipt_long' },
      { to: '/team', label: 'تیم', icon: 'group' },
    ],
  },
];
// Links the member's role cannot use are hidden (the router guards them too).
const sections = computed(() =>
  allSections.map((section) => ({
    ...section,
    links: section.links.filter((link) => !link.permission || auth.can(link.permission)),
  })),
);
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
        <q-btn
          v-if="auth.can('use-chat')"
          unelevated
          no-caps
          dense
          class="btn-pill chat-pill gt-xs"
          icon="chat_bubble_outline"
          label="چت"
          to="/chat"
        />
        <NotificationBell />
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
              <q-item v-close-popup clickable to="/team">
                <q-item-section avatar><q-icon name="group" /></q-item-section>
                <q-item-section>تیم</q-item-section>
              </q-item>
              <q-item v-if="auth.can('manage-billing')" v-close-popup clickable to="/wallet">
                <q-item-section avatar><q-icon name="account_balance_wallet" /></q-item-section>
                <q-item-section>کیف پول</q-item-section>
              </q-item>
              <q-item v-if="auth.can('use-chat')" v-close-popup clickable to="/chat">
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
        <OrganizationSwitcher />
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
            <q-icon :name="link.icon" size="19px" class="nav-icon" />
            <span class="col">{{ link.label }}</span>
          </router-link>
          <div class="divider" />
        </template>

        <div class="caption">مستندات</div>
        <button type="button" class="nav nav-toggle" @click="usesOpen = !usesOpen">
          <q-icon name="menu_book" size="19px" class="nav-icon" />
          <span class="col">موارد استفاده</span>
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
          <q-icon name="data_object" size="19px" class="nav-icon" />
          <span class="col">API Reference</span>
        </router-link>
        <div class="divider" />
        <router-link v-if="auth.can('use-chat')" to="/chat" class="nav go-chat">
          <q-icon name="chat_bubble_outline" size="19px" class="nav-icon" />
          <span class="col">رفتن به چت</span>
          <q-icon name="arrow_back" size="16px" />
        </router-link>
      </nav>
    </q-drawer>

    <q-page-container class="content">
      <!-- Pages reload their data when the organization changes. -->
      <router-view :key="auth.organization?.id ?? 0" />
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
  color: var(--faint);
  font-size: 0.78rem;
  padding: 8px 24px 6px;
}
.chat-pill.q-btn {
  margin-inline-start: 24px;
  min-height: 36px;
  padding: 0 16px;
  font-size: 0.88rem;
}
.nav-icon {
  color: var(--muted);
}
.nav.active .nav-icon {
  color: var(--brand);
}
.nav {
  display: flex;
  align-items: center;
  gap: 12px;
  width: calc(100% - 20px);
  margin: 1px 10px;
  border-radius: 10px;
  padding: 9px 14px;
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
  padding-inline-start: 45px;
  color: var(--muted);
}
.nav.sub.active {
  color: var(--ink-strong);
}
.go-chat {
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
