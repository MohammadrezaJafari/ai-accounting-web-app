<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { acceptInvitation, errorMessage, getInvitation } from '../api';
import { faDate } from '../format';
import { useAuthStore } from '../stores/auth';
import type { Invitation } from '../types';

useMeta({ title: 'دعوت به سازمان | پلتفرم توسعه‌دهندگان' });

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const token = String(route.params.token);

const invitation = ref<Invitation | null>(null);
const error = ref('');
const busy = ref(false);

async function accept(): Promise<void> {
  busy.value = true;
  error.value = '';
  try {
    await acceptInvitation(token);
    await auth.refresh();
    await router.replace('/');
  } catch (exception) {
    error.value = errorMessage(exception);
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  try {
    invitation.value = await getInvitation(token);
  } catch (exception) {
    error.value = errorMessage(exception);
  }
});
</script>

<template>
  <q-page class="page flex flex-center">
    <div class="card">
      <div class="icon"><q-icon name="group_add" size="30px" /></div>
      <template v-if="invitation">
        <h1>دعوت به «{{ invitation.organization?.name }}»</h1>
        <p class="muted">
          <template v-if="invitation.invited_by">{{ invitation.invited_by }} شما را</template>
          <template v-else>شما</template>
          با نقش <strong class="ink-strong">{{ invitation.role_label }}</strong> به این سازمان دعوت
          کرده است.
        </p>
        <p class="faint text-caption">
          دعوت برای <span class="ltr">{{ invitation.email }}</span> است و تا
          {{ faDate(invitation.expires_at) }} اعتبار دارد. شما با
          <span class="ltr">{{ auth.user?.email }}</span> وارد شده‌اید.
        </p>
        <div v-if="error" class="error-banner q-mb-md">{{ error }}</div>
        <q-btn
          unelevated
          no-caps
          class="btn-pill full-width"
          label="پذیرفتن دعوت"
          :loading="busy"
          :disable="invitation.is_expired"
          @click="accept"
        />
        <q-btn flat no-caps color="grey" class="full-width q-mt-sm" label="بعداً" to="/" />
      </template>
      <template v-else-if="error">
        <h1>دعوت پیدا نشد</h1>
        <div class="error-banner q-my-md">{{ error }}</div>
        <q-btn unelevated no-caps class="btn-pill" label="بازگشت به داشبورد" to="/" />
      </template>
      <q-spinner v-else color="primary" size="lg" />
    </div>
  </q-page>
</template>

<style scoped>
.card {
  width: 100%;
  max-width: 460px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 24px;
  padding: 32px 28px;
  text-align: center;
}
.icon {
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  margin: 0 auto 18px;
  border-radius: 50%;
  background: var(--brand-tint);
  color: #6fcf9f;
}
h1 {
  font-size: 1.3rem;
  margin-bottom: 12px;
}
p {
  line-height: 1.9;
}
</style>
