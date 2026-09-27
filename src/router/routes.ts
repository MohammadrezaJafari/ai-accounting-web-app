import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('../pages/LoginPage.vue') },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { auth: true },
    children: [
      { path: '', name: 'dashboard', component: () => import('../pages/DashboardPage.vue') },
      { path: 'apps', name: 'apps', component: () => import('../pages/AppsPage.vue') },
      {
        path: 'apps/:id(\\d+)',
        name: 'app',
        component: () => import('../pages/AppPage.vue'),
      },
      { path: 'models', name: 'models', component: () => import('../pages/ModelsPage.vue') },
      { path: 'usage', name: 'usage', component: () => import('../pages/UsagePage.vue') },
      { path: 'billing', name: 'billing', component: () => import('../pages/BillingPage.vue') },
      { path: 'docs', name: 'docs', component: () => import('../pages/DocsPage.vue') },
    ],
  },
  { path: '/:catchAll(.*)*', component: () => import('../pages/NotFoundPage.vue') },
];

export default routes;
