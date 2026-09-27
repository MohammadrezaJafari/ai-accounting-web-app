<script setup lang="ts">
import { ref } from 'vue';
import type { QInput } from 'quasar';

/** Pill-shaped message box: Enter sends, Shift+Enter adds a line, the send button stops a stream. */
const props = defineProps<{ streaming: boolean; disabled?: boolean }>();
const emit = defineEmits<{ send: [text: string]; stop: [] }>();
const text = defineModel<string>({ required: true });
const input = ref<QInput | null>(null);

const tools = [
  { icon: 'attach_file', label: 'افزودن فایل و تصویر' },
  { icon: 'travel_explore', label: 'جست‌وجو در اینترنت' },
  { icon: 'psychology', label: 'تفکر بیشتر' },
];

function submit(): void {
  if (props.streaming) {
    emit('stop');
    return;
  }
  if (!text.value.trim() || props.disabled) return;
  emit('send', text.value);
}

function onEnter(event: KeyboardEvent): void {
  if (event.shiftKey || event.isComposing) return;
  event.preventDefault();
  if (!props.streaming) submit();
}

defineExpose({ focus: () => input.value?.focus() });
</script>

<template>
  <div class="composer">
    <q-btn flat round dense icon="add" class="tool-btn" aria-label="ابزارها">
      <q-menu anchor="top start" self="bottom start" :offset="[0, 8]">
        <q-list class="q-py-xs" style="min-width: 240px">
          <q-item v-for="tool in tools" :key="tool.label" disable>
            <q-item-section avatar><q-icon :name="tool.icon" /></q-item-section>
            <q-item-section>{{ tool.label }}</q-item-section>
            <q-item-section side>
              <q-badge color="grey-9" text-color="grey-5" label="به‌زودی" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
    <q-input
      ref="input"
      v-model="text"
      class="col"
      borderless
      autogrow
      type="textarea"
      placeholder="سوال خود را بپرسید..."
      input-class="composer-input"
      :disable="disabled"
      @keydown.enter="onEnter"
    />
    <button
      type="button"
      class="send"
      :disabled="!streaming && (!text.trim() || disabled)"
      :aria-label="streaming ? 'توقف' : 'ارسال'"
      @click="submit"
    >
      <q-icon :name="streaming ? 'stop' : 'arrow_upward'" size="22px" />
    </button>
  </div>
</template>

<style scoped>
.composer {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  background: var(--surface-2);
  border: 1px solid var(--surface-3);
  border-radius: 28px;
  padding: 8px 10px;
}
.tool-btn {
  color: var(--ink);
  margin-bottom: 2px;
}
.composer :deep(.composer-input) {
  color: var(--ink-strong);
  font-size: 1rem;
  line-height: 1.7;
  max-height: 200px;
  overflow-y: auto;
  padding: 6px 4px;
  resize: none;
}
.composer :deep(.q-field__control),
.composer :deep(.q-field__native) {
  min-height: 40px;
}
.send {
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 0;
  background: var(--ink-strong);
  color: #111;
  cursor: pointer;
  transition: opacity 0.15s;
}
.send:disabled {
  opacity: 0.3;
  cursor: default;
}
</style>
