<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useMeta, useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { createApp, errorMessage, listApps } from '../api';
import { faNumber, usd } from '../format';
import type { App } from '../types';

useMeta({ title: 'اپ‌ها | پلتفرم توسعه‌دهندگان' });

const $q = useQuasar();
const router = useRouter();
const apps = ref<App[] | null>(null);
const creating = ref(false);
const draft = reactive({ name: '', description: '' });
const busy = ref(false);

async function load(): Promise<void> {
  try {
    apps.value = await listApps();
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  }
}

async function submit(): Promise<void> {
  busy.value = true;
  try {
    const app = await createApp(draft.name, draft.description || null);
    creating.value = false;
    await router.push(`/apps/${app.id}`);
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>

<template>
  <q-page class="page">
    <div class="page-head">
      <div>
        <h1>اپ‌ها</h1>
        <p>هر اپ موجودی و کلیدهای API جداگانه دارد.</p>
      </div>
      <q-btn
        unelevated
        no-caps
        class="btn-pill"
        icon="add"
        label="اپ جدید"
        @click="creating = true"
      />
    </div>

    <div v-if="apps === null" class="flex flex-center q-pa-xl">
      <q-spinner size="lg" color="primary" />
    </div>
    <div v-else-if="!apps.length" class="panel empty">
      <q-icon name="apps" size="48px" class="faint" />
      <p class="q-mt-md">هنوز اپی نساخته‌اید. برای شروع یک اپ بسازید و برایش کلید API بگیرید.</p>
      <q-btn unelevated no-caps class="btn-pill" label="ساخت اولین اپ" @click="creating = true" />
    </div>
    <div v-else class="apps">
      <router-link
        v-for="app in apps"
        :key="app.id"
        :to="`/apps/${app.id}`"
        class="panel panel-pad app"
      >
        <div class="row items-center no-wrap">
          <div class="col">
            <div class="text-weight-bold text-subtitle1 ink-strong">{{ app.name }}</div>
            <div class="faint ellipsis">{{ app.description || 'بدون توضیح' }}</div>
          </div>
          <q-badge v-if="!app.is_active" color="grey-8" label="غیرفعال" />
        </div>
        <div class="row items-end q-mt-md">
          <div class="col">
            <div class="muted text-caption">موجودی</div>
            <div
              class="text-h6 text-weight-bolder ink-strong"
              :class="{ 'text-negative': Number(app.balance) <= 0 }"
            >
              <span class="ltr">{{ usd(app.balance) }}</span>
            </div>
          </div>
          <div class="faint text-caption">{{ faNumber(app.api_keys_count ?? 0) }} کلید</div>
        </div>
      </router-link>
    </div>

    <q-dialog v-model="creating">
      <q-card style="width: 440px; max-width: 92vw; border-radius: 18px">
        <q-form @submit.prevent="submit">
          <q-card-section><div class="text-h6">اپ جدید</div></q-card-section>
          <q-card-section class="column q-gutter-md">
            <q-input
              v-model="draft.name"
              outlined
              label="نام اپ"
              autofocus
              :rules="[(v) => !!v || 'نام لازم است']"
            />
            <q-input
              v-model="draft.description"
              outlined
              type="textarea"
              autogrow
              label="توضیح (اختیاری)"
            />
          </q-card-section>
          <q-card-actions align="left" class="q-pa-md">
            <q-btn flat no-caps color="grey" label="انصراف" v-close-popup />
            <q-btn type="submit" unelevated no-caps class="btn-pill" label="ساخت" :loading="busy" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.apps {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
.app {
  display: block;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.app:hover {
  border-color: var(--surface-3);
  background: var(--surface-2);
}
</style>
