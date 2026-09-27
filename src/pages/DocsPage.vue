<script setup lang="ts">
import { useMeta } from 'quasar';
import { gatewayUrl } from '../format';
import ConnectSnippet from '../components/ConnectSnippet.vue';
import CopyText from '../components/CopyText.vue';

useMeta({ title: 'راهنمای اتصال | حسابداری AI' });

const base = `${gatewayUrl()}/v1`;
</script>

<template>
  <q-page class="page">
    <div class="page-head">
      <div>
        <h1>راهنمای اتصال</h1>
        <p>API ما با OpenAI سازگار است؛ کافی است آدرس پایه و کلید را عوض کنید.</p>
      </div>
    </div>

    <div class="panel panel-pad q-mb-lg">
      <div class="panel-title">۱. آدرس پایه</div>
      <div class="row items-center no-wrap">
        <code class="mono code-inline">{{ base }}</code>
        <CopyText :text="base" />
      </div>
      <div class="panel-title q-mt-lg">۲. کلید API</div>
      <p class="muted">
        در صفحهٔ <router-link to="/apps" class="text-primary">اپ‌ها</router-link> یک اپ بسازید و
        برایش کلید بگیرید. کلید را در هدر <span class="mono">Authorization: Bearer</span> (یا
        <span class="mono">x-api-key</span> برای SDK کلود) بفرستید.
      </p>
      <div class="panel-title q-mt-lg">۳. نمونه کد</div>
      <ConnectSnippet />
    </div>

    <div class="panel panel-pad">
      <div class="panel-title">نکته‌ها</div>
      <ul class="muted q-pl-md q-my-none">
        <li>
          <span class="mono">GET /v1/models</span> مدل‌هایی را که کلید شما مجاز است برمی‌گرداند.
        </li>
        <li>
          همهٔ مدل‌ها (GPT، Claude، Gemini، DeepSeek، Grok) از
          <span class="mono">/v1/chat/completions</span> در دسترس‌اند؛ stream هم پشتیبانی می‌شود.
        </li>
        <li>
          برای ویژگی‌های اختصاصی Claude (مثل prompt caching) از
          <span class="mono">/v1/messages</span> با SDK رسمی Anthropic استفاده کنید.
        </li>
        <li>
          هزینهٔ هر درخواست بر اساس توکن‌های واقعی گزارش‌شده توسط ارائه‌دهنده از موجودی اپ کسر
          می‌شود. درخواست‌های ناموفق هزینه ندارند.
        </li>
        <li>وقتی موجودی تمام شود، پاسخ با کد <span class="mono">402</span> برمی‌گردد.</li>
      </ul>
    </div>
  </q-page>
</template>

<style scoped>
.code-inline {
  background: var(--line-soft);
  border-radius: 8px;
  padding: 6px 12px;
}
li {
  margin-bottom: 6px;
}
</style>
