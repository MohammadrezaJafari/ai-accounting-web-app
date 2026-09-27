<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import BrandMark from '../components/BrandMark.vue';

const auth = useAuthStore();
const router = useRouter();
const drawer = ref(false);

const links = [
  { to: '/', label: 'داشبورد', icon: 'space_dashboard' },
  { to: '/apps', label: 'اپ‌ها و کلیدها', icon: 'apps' },
  { to: '/billing', label: 'شارژ و سفارش‌ها', icon: 'account_balance_wallet' },
  { to: '/usage', label: 'گزارش مصرف', icon: 'query_stats' },
  { to: '/models', label: 'مدل‌ها و قیمت‌ها', icon: 'memory' },
  { to: '/docs', label: 'راهنمای اتصال', icon: 'code' },
];

async function signOut(): Promise<void> {
  await auth.signOut();
  await router.replace({ name: 'login' });
}
</script>

<template>
  <q-layout view="hHh LpR fFf">
    <q-header bordered class="bg-white text-dark">
      <q-toolbar class="q-px-md" style="min-height: 60px">
        <q-btn
          flat
          round
          dense
          icon="menu"
          class="lt-md"
          aria-label="منو"
          @click="drawer = !drawer"
        />
        <router-link to="/"><BrandMark /></router-link>
        <q-space />
        <q-btn flat no-caps icon="account_circle" :label="auth.user?.name">
          <q-menu anchor="bottom end" self="top end">
            <q-list style="min-width: 200px">
              <q-item>
                <q-item-section>
                  <q-item-label>{{ auth.user?.name }}</q-item-label>
                  <q-item-label caption class="ltr">{{ auth.user?.email }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item v-close-popup clickable @click="signOut">
                <q-item-section avatar><q-icon name="logout" /></q-item-section>
                <q-item-section>خروج</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawer" show-if-above bordered :width="240" class="bg-white">
      <q-list padding class="q-px-sm">
        <q-item
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :exact="link.to === '/'"
          clickable
          class="nav-item"
          active-class="nav-item--active"
        >
          <q-item-section avatar><q-icon :name="link.icon" /></q-item-section>
          <q-item-section>{{ link.label }}</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<style scoped lang="scss">
.nav-item {
  border-radius: 10px;
  margin-bottom: 2px;
  color: var(--ink);
}
.nav-item--active {
  background: var(--brand-tint);
  color: var(--brand);
  font-weight: 700;
}
</style>
