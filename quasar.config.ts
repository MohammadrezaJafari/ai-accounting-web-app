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
    plugins: ['Notify', 'Dialog', 'Meta', 'Dark'],
    config: {
      dark: true,
      brand: {
        primary: '#32946a',
        secondary: '#2f2f2f',
        accent: '#32946a',
        positive: '#32946a',
        negative: '#e5484d',
        warning: '#e2a336',
      },
      notify: { position: 'top', timeout: 3000 },
    },
  },
  animations: [],
}));
