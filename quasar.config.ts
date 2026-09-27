import { defineConfig } from '#q-app';

export default defineConfig(() => ({
  boot: [],
  css: ['app.scss'],
  extras: ['material-icons', 'material-icons-outlined'],
  build: {
    vueRouterMode: 'history',
    typescript: { strict: true, vueShim: true },
    env: { clientPrefix: 'VITE_' },
  },
  devServer: {
    port: 9000,
    open: false,
    proxy: {
      // API مشتری و gateway هر دو روی بک‌اند لاراول‌اند.
      '/api': {
        target: process.env.API_INTERNAL_URL || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/v1': {
        target: process.env.API_INTERNAL_URL || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  framework: {
    lang: 'fa-IR',
    plugins: ['Notify', 'Dialog', 'Meta'],
    config: {
      brand: {
        primary: '#4f46e5',
        secondary: '#0f172a',
        accent: '#10b981',
        positive: '#059669',
        negative: '#e11d48',
      },
      notify: { position: 'top', timeout: 3000 },
    },
  },
  animations: [],
}));
