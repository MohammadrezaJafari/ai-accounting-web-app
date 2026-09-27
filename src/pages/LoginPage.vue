<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { errorMessage, login, register } from '../api';
import { useAuthStore } from '../stores/auth';

useMeta({ title: 'ورود | پلتفرم توسعه‌دهندگان' });

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const mode = ref<'login' | 'register'>('login');
const form = reactive({ name: '', organization: '', email: '', password: '' });
const busy = ref(false);
const error = ref('');

async function submit(): Promise<void> {
  busy.value = true;
  error.value = '';
  try {
    const result =
      mode.value === 'login'
        ? await login(form.email, form.password)
        : await register(form.name, form.email, form.password, form.organization || null);
    auth.signIn(result.token, result);
    const redirect = route.query.redirect;
    await router.replace(
      typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
        ? redirect
        : '/',
    );
  } catch (exception) {
    error.value = errorMessage(exception);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="auth">
    <div class="card">
      <div class="logo" aria-hidden="true">AI</div>
      <h1>{{ mode === 'login' ? 'ورود به پلتفرم توسعه‌دهندگان' : 'ساخت حساب کاربری' }}</h1>
      <p class="subtitle">
        {{
          mode === 'login'
            ? 'برای مدیریت اپ‌ها، کلیدهای API و کیف پول وارد شوید.'
            : 'با یک حساب به مدل‌های GPT، Claude، Gemini و … دسترسی بگیرید.'
        }}
      </p>
      <q-form class="column form" @submit.prevent="submit">
        <q-input
          v-if="mode === 'register'"
          v-model="form.name"
          outlined
          rounded
          label="نام"
          autofocus
        />
        <q-input
          v-if="mode === 'register'"
          v-model="form.organization"
          outlined
          rounded
          label="نام شرکت یا سازمان (اختیاری)"
          hint="بعداً می‌توانید اعضای تیم را به آن دعوت کنید."
        />
        <q-input
          v-model="form.email"
          outlined
          rounded
          type="email"
          label="ایمیل"
          input-class="ltr"
          autocomplete="email"
        />
        <q-input
          v-model="form.password"
          outlined
          rounded
          type="password"
          label="رمز عبور"
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
          :hint="mode === 'register' ? 'حداقل ۸ کاراکتر' : undefined"
        />
        <div v-if="error" class="error-banner">{{ error }}</div>
        <q-btn
          type="submit"
          unelevated
          no-caps
          class="btn-pill full-width"
          :loading="busy"
          :label="mode === 'login' ? 'ورود' : 'ثبت‌نام'"
        />
      </q-form>
      <div class="switch">
        {{ mode === 'login' ? 'حساب ندارید؟' : 'حساب دارید؟' }}
        <button type="button" @click="mode = mode === 'login' ? 'register' : 'login'">
          {{ mode === 'login' ? 'ثبت‌نام کنید' : 'وارد شوید' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px 16px;
  background: var(--page);
}
.card {
  width: 100%;
  max-width: 420px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 24px;
  padding: 36px 28px 28px;
  text-align: center;
}
.logo {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: var(--ink-strong);
  color: #111;
  font-weight: 800;
  font-size: 1.2rem;
}
h1 {
  font-size: 1.35rem;
}
.subtitle {
  color: var(--muted);
  margin: 8px 0 28px;
  line-height: 1.8;
}
.form {
  gap: 16px;
  text-align: start;
}
.switch {
  margin-top: 20px;
  color: var(--muted);
  font-size: 0.9rem;
}
.switch button {
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  color: var(--ink-strong);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 4px;
}
</style>
