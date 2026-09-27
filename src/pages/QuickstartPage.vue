<script setup lang="ts">
import { useMeta } from 'quasar';
import { gatewayUrl } from '../format';
import CodeCard from '../components/CodeCard.vue';
import CopyText from '../components/CopyText.vue';

useMeta({ title: 'شروع سریع | پلتفرم توسعه‌دهندگان' });

const base = `${gatewayUrl()}/v1`;
</script>

<template>
  <q-page class="page page-narrow">
    <div class="page-head">
      <div>
        <h1>شروع سریع</h1>
        <p>در سه قدم اولین درخواست خود را بفرستید.</p>
      </div>
    </div>

    <div class="prose">
      <h2>۱. یک اپ و کلید API بسازید</h2>
      <p>
        در <router-link to="/apps" class="text-primary">اپ‌ها</router-link> برای هر محصولتان یک اپ
        بسازید. هر اپ کیف پول و گزارش مصرف جدا دارد. سپس در
        <router-link to="/keys" class="text-primary">کلیدهای API</router-link> کلید بگیرید؛ کلید فقط
        یک بار نمایش داده می‌شود.
      </p>

      <h2>۲. کیف پول اپ را شارژ کنید</h2>
      <p>
        از <router-link to="/wallet" class="text-primary">کیف پول</router-link> یک بسته بخرید یا
        مبلغ دلخواه شارژ کنید. هزینهٔ هر درخواست بر اساس توکن‌های واقعی از همین موجودی کم می‌شود.
      </p>

      <h2>۳. آدرس پایه را عوض کنید</h2>
      <div class="row items-center no-wrap q-mb-md">
        <span class="inline-code">{{ base }}</span>
        <CopyText :text="base" />
      </div>
      <CodeCard />

      <h2>استریم</h2>
      <p>
        با <span class="inline-code">"stream": true</span> پاسخ به‌صورت Server-Sent Events برمی‌گردد
        و مصرف همان لحظهٔ پایان محاسبه می‌شود.
      </p>

      <h2>مدل‌های Claude با API اختصاصی</h2>
      <p>
        برای SDK رسمی Anthropic یا Claude Code، آدرس پایه را
        <span class="inline-code">{{ gatewayUrl() }}</span> بگذارید؛ endpoint
        <span class="inline-code">/v1/messages</span> با همان کلید کار می‌کند.
        <router-link to="/docs/claude-code" class="text-primary">راهنمای Claude Code</router-link>
      </p>
    </div>
  </q-page>
</template>
