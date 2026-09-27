import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('../pages/LoginPage.vue') },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('../pages/ChatPage.vue'),
    meta: { auth: true, permission: 'use-chat' },
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { auth: true },
    children: [
      { path: '', name: 'dashboard', component: () => import('../pages/DashboardPage.vue') },
      {
        path: 'quickstart',
        name: 'quickstart',
        component: () => import('../pages/QuickstartPage.vue'),
      },
      { path: 'models', name: 'models', component: () => import('../pages/ModelsPage.vue') },
      { path: 'apps', name: 'apps', component: () => import('../pages/AppsPage.vue') },
      {
        path: 'apps/:id(\\d+)',
        name: 'app',
        component: () => import('../pages/AppPage.vue'),
      },
      {
        path: 'keys',
        name: 'keys',
        component: () => import('../pages/KeysPage.vue'),
        meta: { permission: 'manage-keys' },
      },
      {
        path: 'wallet',
        name: 'wallet',
        component: () => import('../pages/WalletPage.vue'),
        meta: { permission: 'manage-billing' },
      },
      { path: 'team', name: 'team', component: () => import('../pages/TeamPage.vue') },
      {
        path: 'invite/:token',
        name: 'invite',
        component: () => import('../pages/InvitePage.vue'),
      },
      { path: 'usage', name: 'usage', component: () => import('../pages/UsagePage.vue') },
      { path: 'logs', name: 'logs', component: () => import('../pages/LogsPage.vue') },
      { path: 'docs/:slug', name: 'guide', component: () => import('../pages/GuidePage.vue') },
      { path: 'docs', redirect: '/quickstart' },
      { path: 'billing', redirect: '/wallet' },
    ],
  },
  { path: '/:catchAll(.*)*', component: () => import('../pages/NotFoundPage.vue') },
];

export default routes;
