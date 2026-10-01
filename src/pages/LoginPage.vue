<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import type { AuthMethods } from '../api';
import { authMethods, errorMessage, login, oidcExchange, register } from '../api';
import { useAuthStore } from '../stores/auth';

useMeta({ title: 'ورود | پلتفرم توسعه‌دهندگان' });

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const mode = ref<'login' | 'register'>('login');
const form = reactive({ name: '', organization: '', email: '', password: '' });
const busy = ref(false);
const error = ref('');
// Until the backend answers, assume the old behaviour (password only).
const methods = ref<AuthMethods | null>(null);
const passwordOn = computed(() => methods.value?.password ?? true);
const tenant = ref('');

/** Only a path on this panel (no scheme, host or protocol-relative URL). */
function intended(): string | null {
  const redirect = route.query.redirect;
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    ? redirect
    : null;
}

const oidcHref = computed(() => {
  if (!methods.value?.oidc || !methods.value.oidc_url) return null;
  const url = new URL(methods.value.oidc_url, window.location.origin);
  const path = intended();
  if (path) url.searchParams.set('intended', path);
  if (methods.value.tenant_required) url.searchParams.set('tenant', tenant.value.trim());
  return url.toString();
});

async function finish(result: Awaited<ReturnType<typeof login>>): Promise<void> {
  auth.signIn(result.token, result);
  await router.replace(intended() ?? '/');
}

async function submit(): Promise<void> {
  busy.value = true;
  error.value = '';
  try {
    await finish(
      mode.value === 'login'
        ? await login(form.email, form.password)
        : await register(form.name, form.email, form.password, form.organization || null),
    );
  } catch (exception) {
    error.value = errorMessage(exception);
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  const code = new URLSearchParams(window.location.hash.slice(1)).get('oidc_code');
  if (code) {
    // The code is single-use: drop it from the address bar (and history) before trading it.
    window.history.replaceState(window.history.state, '', route.fullPath.split('#')[0]);
    busy.value = true;
    try {
      await finish(await oidcExchange(code));
      return;
    } catch (exception) {
      error.value = errorMessage(exception);
    } finally {
      busy.value = false;
    }
  }
  methods.value = await authMethods().catch(() => null);
});
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
      <div v-if="oidcHref && mode === 'login'" class="column form">
        <q-input
          v-if="methods?.tenant_required"
          v-model="tenant"
          outlined
          rounded
          label="شناسهٔ سازمان"
          input-class="ltr"
        />
        <q-btn
          unelevated
          no-caps
          class="btn-pill full-width"
          :href="oidcHref"
          :disable="busy || (methods?.tenant_required && !tenant.trim())"
          label="ورود با حساب سازمانی"
        />
        <div v-if="!passwordOn && error" class="error-banner">{{ error }}</div>
        <div v-if="passwordOn" class="divider">یا</div>
      </div>
      <div v-else-if="!passwordOn && error" class="error-banner">{{ error }}</div>
      <q-form v-if="passwordOn" class="column form" @submit.prevent="submit">
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
      <div v-if="passwordOn" class="switch">
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
.divider {
  color: var(--muted);
  font-size: 0.85rem;
  text-align: center;
  margin-bottom: 16px;
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
