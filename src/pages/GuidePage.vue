<script setup lang="ts">
import { computed } from 'vue';
import { useMeta } from 'quasar';
import { useRoute } from 'vue-router';
import { guideBySlug } from '../guides';
import CopyText from '../components/CopyText.vue';

const route = useRoute();
const guide = computed(() => guideBySlug(String(route.params.slug)));

useMeta(() => ({ title: `${guide.value?.title ?? 'مستندات'} | پلتفرم توسعه‌دهندگان` }));
</script>

<template>
  <q-page class="page page-narrow">
    <template v-if="guide">
      <div class="page-head">
        <div class="row items-center q-gutter-md no-wrap">
          <span class="icon"><q-icon :name="guide.icon" size="26px" /></span>
          <div>
            <h1>{{ guide.title }}</h1>
            <p>{{ guide.subtitle }}</p>
          </div>
        </div>
      </div>
      <p class="intro">{{ guide.intro }}</p>
      <ol class="steps">
        <li v-for="(step, index) in guide.steps()" :key="index">
          <p>{{ step.text }}</p>
          <div v-if="step.code" class="snippet">
            <pre>{{ step.code }}</pre>
            <CopyText :text="step.code" />
          </div>
        </li>
      </ol>
      <p class="muted q-mt-xl">
        کلید را از <router-link to="/keys" class="text-primary">کلیدهای API</router-link> بگیرید و
        شناسهٔ مدل‌ها را در
        <router-link to="/models" class="text-primary">مدل‌ها و قیمت</router-link> ببینید.
      </p>
    </template>
    <div v-else class="empty">این راهنما پیدا نشد.</div>
  </q-page>
</template>

<style scoped>
.icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: var(--surface-2);
}
.intro {
  color: var(--muted);
  font-size: 1.02rem;
  line-height: 1.9;
}
.steps {
  counter-reset: step;
  list-style: none;
  padding: 0;
  margin: 24px 0 0;
}
.steps li {
  counter-increment: step;
  position: relative;
  padding-inline-start: 48px;
  padding-bottom: 20px;
  border-inline-start: 1px solid var(--line);
  margin-inline-start: 16px;
}
.steps li::before {
  content: counter(step, persian);
  position: absolute;
  inset-inline-start: -16px;
  top: -2px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--surface-2);
  border: 1px solid var(--surface-3);
  display: grid;
  place-items: center;
  font-size: 0.9rem;
}
.steps li:last-child {
  border-color: transparent;
}
.steps p {
  margin: 0 0 10px;
  line-height: 1.9;
}
.snippet {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  background: var(--code-bg);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 10px 10px 10px 16px;
}
.snippet pre {
  flex: 1;
  margin: 0;
  overflow-x: auto;
  font-family: var(--mono);
  font-size: 0.85rem;
  line-height: 1.7;
  color: #e6e6e6;
  /* rtl:begin:ignore */
  direction: ltr;
  text-align: left;
  /* rtl:end:ignore */
}
</style>
