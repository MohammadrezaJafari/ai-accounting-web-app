<script setup lang="ts">
import { computed } from 'vue';
import { copyToClipboard, useQuasar } from 'quasar';
import { renderMarkdown } from '../markdown';
import type { ChatMessage } from '../types';

/** User turns are bubbles; model replies are full-width markdown. */
const props = defineProps<{ message: ChatMessage; pending?: boolean }>();
const $q = useQuasar();

const html = computed(() =>
  props.message.role === 'assistant' && !props.message.error
    ? renderMarkdown(props.message.content)
    : '',
);

async function copy(text: string): Promise<void> {
  await copyToClipboard(text);
  $q.notify({ type: 'positive', message: 'کپی شد.', timeout: 1200 });
}

/** Copy buttons inside rendered code blocks. */
function onClick(event: MouseEvent): void {
  const button = (event.target as HTMLElement).closest('.copy-code');
  const code = button?.closest('.code-block')?.querySelector('code');
  if (code) void copy(code.textContent ?? '');
}
</script>

<template>
  <div v-if="message.role === 'user'" class="user">
    <div class="bubble">{{ message.content }}</div>
  </div>
  <div v-else-if="message.error" class="error-banner reply-error">
    {{ message.content }}
    <router-link v-if="message.status === 402" to="/wallet" class="charge"
      >شارژ کیف پول</router-link
    >
  </div>
  <div v-else class="assistant">
    <div v-if="pending && !message.content" class="typing" aria-label="در حال پاسخ">
      <span /><span /><span />
    </div>
    <!-- eslint-disable-next-line vue/no-v-html -- sanitized by DOMPurify in renderMarkdown -->
    <div v-else class="markdown" @click="onClick" v-html="html" />
    <div v-if="!pending && message.content" class="actions">
      <q-btn
        flat
        round
        dense
        size="sm"
        icon="content_copy"
        aria-label="کپی پاسخ"
        @click="copy(message.content)"
      >
        <q-tooltip>کپی پاسخ</q-tooltip>
      </q-btn>
    </div>
  </div>
</template>

<style scoped>
.user {
  display: flex;
  justify-content: flex-end;
}
.bubble {
  max-width: min(80%, 620px);
  background: var(--surface-2);
  color: var(--ink-strong);
  border-radius: 22px;
  padding: 10px 18px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  unicode-bidi: plaintext;
  line-height: 1.8;
}
.reply-error .charge {
  color: var(--ink-strong);
  text-decoration: underline;
  text-underline-offset: 4px;
  margin-inline-start: 8px;
}
.assistant {
  color: var(--ink);
  line-height: 1.9;
}
.actions {
  margin-top: 4px;
  color: var(--faint);
}
.typing {
  display: flex;
  gap: 5px;
  padding: 10px 0;
}
.typing span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--muted);
  animation: blink 1.2s infinite ease-in-out;
}
.typing span:nth-child(2) {
  animation-delay: 0.2s;
}
.typing span:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes blink {
  0%,
  80%,
  100% {
    opacity: 0.25;
  }
  40% {
    opacity: 1;
  }
}

.markdown {
  overflow-wrap: anywhere;
}
.markdown :deep(> :first-child) {
  margin-top: 0;
}
.markdown :deep(> :last-child) {
  margin-bottom: 0;
}
.markdown :deep(p),
.markdown :deep(li) {
  unicode-bidi: plaintext;
}
.markdown :deep(p) {
  margin: 0 0 12px;
}
.markdown :deep(h1),
.markdown :deep(h2),
.markdown :deep(h3) {
  font-size: 1.15rem;
  margin: 20px 0 8px;
}
.markdown :deep(ul),
.markdown :deep(ol) {
  padding-inline-start: 22px;
  margin: 0 0 12px;
}
.markdown :deep(a) {
  color: #6fcf9f;
  text-decoration: underline;
}
.markdown :deep(blockquote) {
  margin: 0 0 12px;
  padding-inline-start: 14px;
  border-inline-start: 3px solid var(--surface-3);
  color: var(--muted);
}
.markdown :deep(table) {
  border-collapse: collapse;
  margin: 0 0 12px;
  display: block;
  overflow-x: auto;
}
.markdown :deep(th),
.markdown :deep(td) {
  border: 1px solid var(--line);
  padding: 6px 12px;
}
.markdown :deep(:not(pre) > code) {
  font-family: var(--mono);
  background: var(--surface-2);
  border-radius: 6px;
  padding: 1px 6px;
  font-size: 0.88em;
}
.markdown :deep(.code-block) {
  background: var(--code-bg);
  border: 1px solid var(--line);
  border-radius: 12px;
  margin: 0 0 12px;
  overflow: hidden;
  /* rtl:ignore */
  direction: ltr;
}
.markdown :deep(.code-head) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: var(--surface);
  color: var(--muted);
  font-size: 0.78rem;
  font-family: var(--mono);
}
.markdown :deep(.copy-code) {
  background: none;
  border: 0;
  color: var(--muted);
  cursor: pointer;
  font-family: Vazirmatn, Tahoma, sans-serif;
}
.markdown :deep(.copy-code:hover) {
  color: var(--ink-strong);
}
.markdown :deep(pre) {
  margin: 0;
  padding: 14px 16px;
  overflow-x: auto;
  font-family: var(--mono);
  font-size: 0.85rem;
  line-height: 1.7;
  /* rtl:ignore */
  text-align: left;
}
</style>
