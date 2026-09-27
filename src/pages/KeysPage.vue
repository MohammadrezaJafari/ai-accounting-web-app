<script setup lang="ts">
import { useMeta } from 'quasar';
import ApiKeysPanel from '../components/ApiKeysPanel.vue';

useMeta({ title: 'کلیدهای API | پلتفرم توسعه‌دهندگان' });
</script>

<template>
  <q-page class="page">
    <div class="page-head">
      <div>
        <h1>کلیدهای API</h1>
        <p>کلید را فقط سمت سرور نگه دارید و هرگز در کد سمت کاربر یا مخزن عمومی قرار ندهید.</p>
      </div>
    </div>
    <ApiKeysPanel />
  </q-page>
</template>
