<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { errorMessage, login, register } from '../api';
import { useAuthStore } from '../stores/auth';
import BrandMark from '../components/BrandMark.vue';

useMeta({ title: 'ورود | حسابداری AI' });

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const mode = ref<'login' | 'register'>('login');
const form = reactive({ name: '', email: '', password: '' });
const busy = ref(false);
const error = ref('');

async function submit(): Promise<void> {
  busy.value = true;
  error.value = '';
  try {
    const result =
      mode.value === 'login'
        ? await login(form.email, form.password)
        : await register(form.name, form.email, form.password);
    auth.signIn(result.token, result.user);
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
    <div class="panel panel-pad card">
      <BrandMark class="q-mb-md" />
      <h1>{{ mode === 'login' ? 'ورود به پنل' : 'ساخت حساب' }}</h1>
      <p class="muted q-mt-xs q-mb-lg">
        اپ‌هایتان را بسازید، کلید API بگیرید و مصرف مدل‌های GPT، Claude و Gemini را از یک‌جا مدیریت
        کنید.
      </p>
      <q-form class="column q-gutter-md" @submit.prevent="submit">
        <q-input v-if="mode === 'register'" v-model="form.name" outlined label="نام" autofocus />
        <q-input v-model="form.email" outlined type="email" label="ایمیل" input-class="ltr" />
        <q-input
          v-model="form.password"
          outlined
          type="password"
          label="رمز عبور"
          :hint="mode === 'register' ? 'حداقل ۸ کاراکتر' : undefined"
        />
        <q-banner v-if="error" dense rounded class="bg-red-1 text-negative">{{ error }}</q-banner>
        <q-btn
          type="submit"
          color="primary"
          unelevated
          size="lg"
          :loading="busy"
          :label="mode === 'login' ? 'ورود' : 'ثبت‌نام'"
        />
      </q-form>
      <div class="text-center q-mt-md">
        <q-btn
          flat
          no-caps
          color="primary"
          :label="mode === 'login' ? 'حساب ندارید؟ ثبت‌نام کنید' : 'حساب دارید؟ وارد شوید'"
          @click="mode = mode === 'login' ? 'register' : 'login'"
        />
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
  background: radial-gradient(circle at 20% 0%, var(--brand-tint), var(--bg) 60%);
}
.card {
  width: 100%;
  max-width: 420px;
}
h1 {
  font-size: 1.4rem;
}
</style>
