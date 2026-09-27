import { defineRouter } from '#q-app';
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import routes from './routes';

export default defineRouter(({ store }) => {
  const router = createRouter({
    history: createWebHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
    routes,
    scrollBehavior: () => ({ top: 0 }),
  });

  // Signed-out visitors go to the login page and come back afterwards; pages the member's
  // role cannot use (meta.permission) fall back to the dashboard.
  router.beforeEach(async (to) => {
    if (!to.matched.some((record) => record.meta.auth)) return true;
    const auth = useAuthStore(store);
    await auth.restore();
    if (!auth.loggedIn) return { name: 'login', query: { redirect: to.fullPath } };
    const permission = to.matched.find((record) => record.meta.permission)?.meta.permission;
    return permission && !auth.can(permission) ? { name: 'dashboard' } : true;
  });

  return router;
});
