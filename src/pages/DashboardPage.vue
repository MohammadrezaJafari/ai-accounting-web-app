<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { listModels } from '../api';
import { faNumber, gatewayUrl } from '../format';
import { guides } from '../guides';
import type { AiModel } from '../types';
import CodeCard from '../components/CodeCard.vue';
import CopyText from '../components/CopyText.vue';
import ModelCard from '../components/ModelCard.vue';

useMeta({ title: 'داشبورد | پلتفرم توسعه‌دهندگان' });

const models = ref<AiModel[]>([]);
const featured = computed(() => {
  const picked = models.value.filter((m) => m.is_featured);
  return (picked.length ? picked : models.value).slice(0, 6);
});
const base = `${gatewayUrl()}/v1`;

const quickAccess = [
  {
    to: '/keys',
    icon: 'vpn_key',
    title: 'دریافت API Key',
    subtitle: 'کلید API خود را برای شروع استفاده دریافت کنید',
  },
  ...guides
    .filter((guide) => guide.slug !== 'api')
    .map((guide) => ({
      to: `/docs/${guide.slug}`,
      icon: guide.icon,
      title: guide.title,
      subtitle: guide.subtitle,
    })),
];

onMounted(async () => {
  models.value = await listModels().catch(() => []);
});
</script>

<template>
  <q-page class="page">
    <div class="note-banner q-mb-xl row items-center no-wrap q-gutter-md">
      <q-icon name="info_outline" color="warning" size="22px" />
      <div class="col">
        آدرس پایهٔ API برای همهٔ SDKهای سازگار با OpenAI:
        <span class="inline-code">{{ base }}</span>
        <div class="faint text-caption q-mt-xs">
          برای Claude Code و SDK رسمی Anthropic آدرس بدون /v1 را بدهید.
        </div>
      </div>
      <CopyText :text="base" label="کپی آدرس" />
    </div>

    <div class="hero">
      <div class="hero-text">
        <h1>شروع سریع</h1>
        <p>
          بدون نیاز به تغییر کد، با یک کلید به مدل‌های OpenAI، Claude، Gemini و … دسترسی داشته
          باشید.
        </p>
        <q-btn unelevated no-caps class="btn-pill q-mt-lg" label="شروع کنید" to="/keys" />
      </div>
      <div class="hero-code"><CodeCard /></div>
    </div>

    <h2 class="section-title">مدل‌ها</h2>
    <div class="models">
      <ModelCard v-for="model in featured" :key="model.id" :model="model" />
    </div>
    <div v-if="models.length > featured.length" class="more">
      <q-btn flat no-caps class="btn-ghost-pill" to="/models">
        +{{ faNumber(models.length - featured.length) }} مدل دیگر
        <q-icon name="arrow_back" size="18px" class="q-ml-sm" />
      </q-btn>
    </div>

    <h2 class="section-title">دسترسی سریع</h2>
    <div class="quick">
      <router-link v-for="item in quickAccess" :key="item.to" :to="item.to" class="quick-item">
        <span class="quick-icon"><q-icon :name="item.icon" size="24px" /></span>
        <span>
          <span class="quick-title">{{ item.title }}</span>
          <span class="quick-sub">{{ item.subtitle }}</span>
        </span>
      </router-link>
    </div>
  </q-page>
</template>

<style scoped>
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.55fr);
  gap: 32px;
  align-items: center;
}
.hero-text h1 {
  font-size: 2.1rem;
}
.hero-text p {
  color: var(--muted);
  font-size: 1.1rem;
  line-height: 1.9;
  margin-top: 16px;
}
.models {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}
.more {
  display: flex;
  justify-content: center;
  margin-top: 28px;
  position: relative;
}
.more::before {
  content: '';
  position: absolute;
  inset-inline: 0;
  top: 50%;
  border-top: 1px solid var(--line-soft);
  z-index: 0;
}
.more .q-btn {
  background: var(--page);
  z-index: 1;
}
.quick {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px 48px;
}
.quick-item {
  display: flex;
  align-items: center;
  gap: 18px;
}
.quick-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: var(--surface-2);
  color: var(--ink);
  flex: none;
}
.quick-item:hover .quick-icon {
  background: var(--surface-3);
}
.quick-title {
  display: block;
  color: var(--ink-strong);
  font-size: 1.05rem;
}
.quick-sub {
  display: block;
  color: var(--muted);
  font-size: 0.9rem;
  margin-top: 2px;
}
@media (max-width: 1023px) {
  .hero {
    grid-template-columns: 1fr;
  }
  .models {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 599px) {
  .models,
  .quick {
    grid-template-columns: 1fr;
  }
}
</style>
