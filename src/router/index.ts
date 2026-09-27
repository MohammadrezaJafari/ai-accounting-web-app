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

  // Signed-out visitors go to the login page and come back afterwards.
  router.beforeEach(async (to) => {
    if (!to.matched.some((record) => record.meta.auth)) return true;
    const auth = useAuthStore(store);
    await auth.restore();
    return auth.loggedIn ? true : { name: 'login', query: { redirect: to.fullPath } };
  });

  return router;
});
