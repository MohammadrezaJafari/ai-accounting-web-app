<script setup lang="ts">
import { computed, ref } from 'vue';
import { copyToClipboard, useQuasar } from 'quasar';
import type { SnippetLanguage } from '../snippets';
import { chatSnippet, highlight, snippetLanguages } from '../snippets';

const props = withDefaults(
  defineProps<{ apiKey?: string; model?: string; languages?: SnippetLanguage[] }>(),
  { apiKey: 'YOUR_API_KEY', model: 'gpt-4o-mini', languages: () => snippetLanguages },
);

const $q = useQuasar();
const language = ref<SnippetLanguage>('python');
const code = computed(() => chatSnippet(language.value, props.apiKey, props.model));
const lines = computed(() => highlight(code.value, language.value).split('\n'));

async function copy(): Promise<void> {
  await copyToClipboard(code.value);
  $q.notify({ type: 'positive', message: 'کد کپی شد.', timeout: 1200 });
}
</script>

<template>
  <div class="code-card">
    <div class="bar">
      <div class="tabs">
        <button
          v-for="lang in languages"
          :key="lang"
          type="button"
          class="tab"
          :class="{ active: lang === language }"
          @click="language = lang"
        >
          {{ lang }}
        </button>
      </div>
      <q-btn flat dense round size="sm" icon="content_copy" aria-label="کپی کد" @click="copy" />
    </div>
    <div class="body">
      <div v-for="(line, index) in lines" :key="index" class="line">
        <span class="num">{{ index + 1 }}</span>
        <!-- eslint-disable-next-line vue/no-v-html -- escaped by highlight() -->
        <code v-html="line || ' '" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.code-card {
  background: var(--code-bg);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  /* rtl:ignore */
  direction: ltr;
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--line-soft);
  background: #1a1a1a;
}
.tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.tab {
  font-family: var(--mono);
  font-size: 0.82rem;
  color: var(--muted);
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 3px 14px;
  cursor: pointer;
}
.tab.active {
  color: var(--ink-strong);
  background: var(--surface-2);
  border-color: var(--surface-3);
}
.body {
  padding: 14px 0;
  overflow-x: auto;
  font-family: var(--mono);
  font-size: 0.86rem;
  line-height: 1.75;
}
.line {
  display: flex;
  white-space: pre;
}
.num {
  flex: none;
  width: 44px;
  padding-right: 14px;
  /* rtl:ignore */
  text-align: right;
  color: #5c5c5c;
  user-select: none;
  border-right: 1px solid var(--line-soft);
  margin-right: 16px;
}
code {
  color: #e6e6e6;
  font-family: inherit;
  padding-right: 16px;
}
:deep(.tok-c) {
  color: #8fbf7f;
}
:deep(.tok-s) {
  color: #e8a26b;
}
:deep(.tok-k) {
  color: #6fc3a0;
}
:deep(.tok-f) {
  color: #9ab8ff;
}
</style>
