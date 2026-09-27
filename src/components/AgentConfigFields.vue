<script setup lang="ts">
import { computed } from 'vue';
import { sections } from '../agentConfig';
import { faNumber } from '../format';
import type { AgentConfig, ConfigField } from '../types';

/** The parameters of an agent, rendered from the schema the admin defined for it. */
const props = defineProps<{ fields: ConfigField[]; secretsSet?: string[]; readonly?: boolean }>();
const config = defineModel<AgentConfig>({ required: true });

const groups = computed(() => sections(props.fields));

function label(field: ConfigField): string {
  return field.required ? `${field.label} *` : field.label;
}

function list(field: ConfigField): string[] {
  const value = config.value[field.key];
  return Array.isArray(value) ? value : [];
}

/** Option values are strings; older saved values may be numbers. */
function selected(field: ConfigField): string | null {
  const value = config.value[field.key];
  return value === null || value === undefined ? null : String(value);
}

function lines(field: ConfigField): string {
  return list(field).join('\n');
}

function setLines(field: ConfigField, text: string | number | null): void {
  config.value[field.key] = String(text ?? '')
    .split(/\s*\n\s*/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function useSlider(field: ConfigField): boolean {
  return field.min !== null && field.max !== null && field.max - field.min <= 100;
}

function asNumber(field: ConfigField): number {
  return Number(config.value[field.key] ?? field.min ?? 0);
}

function listHint(field: ConfigField, fallback: string): string {
  const parts = [field.hint ?? fallback];
  if (field.max_items) parts.push(`حداکثر ${faNumber(field.max_items)} مورد`);
  return parts.join(' — ');
}
</script>

<template>
  <div class="config" :class="{ readonly }">
    <section v-for="group in groups" :key="group.title">
      <h3>{{ group.title }}</h3>
      <div class="grid-2">
        <div
          v-for="field in group.fields"
          :key="field.key"
          :class="{ wide: ['textarea', 'url_list'].includes(field.type) }"
        >
          <q-input
            v-if="field.type === 'text' || field.type === 'url'"
            :model-value="(config[field.key] as string | null) ?? ''"
            outlined
            :label="label(field)"
            :placeholder="field.placeholder ?? undefined"
            :hint="field.hint ?? undefined"
            :input-class="field.type === 'url' ? 'ltr' : undefined"
            :readonly="readonly"
            @update:model-value="(v) => (config[field.key] = v === '' ? null : String(v))"
          />

          <q-input
            v-else-if="field.type === 'textarea'"
            :model-value="(config[field.key] as string | null) ?? ''"
            outlined
            type="textarea"
            autogrow
            :label="label(field)"
            :placeholder="field.placeholder ?? undefined"
            :hint="field.hint ?? undefined"
            :readonly="readonly"
            @update:model-value="(v) => (config[field.key] = v === '' ? null : String(v))"
          />

          <q-input
            v-else-if="field.type === 'url_list'"
            :model-value="lines(field)"
            outlined
            type="textarea"
            autogrow
            :label="label(field)"
            :placeholder="field.placeholder ?? 'https://…'"
            :hint="listHint(field, 'هر خط یک آدرس')"
            input-class="ltr"
            :readonly="readonly"
            @update:model-value="(v) => setLines(field, v)"
          />

          <div v-else-if="field.type === 'number' && useSlider(field)">
            <div class="field-label">{{ field.label }}: {{ faNumber(asNumber(field)) }}</div>
            <q-slider
              :model-value="asNumber(field)"
              :min="field.min!"
              :max="field.max!"
              :step="1"
              color="primary"
              :readonly="readonly"
              @update:model-value="(v) => (config[field.key] = v)"
            />
            <div v-if="field.hint" class="faint text-caption">{{ field.hint }}</div>
          </div>

          <q-input
            v-else-if="field.type === 'number'"
            :model-value="(config[field.key] as number | null) ?? null"
            outlined
            type="number"
            :label="label(field)"
            :hint="field.hint ?? undefined"
            :min="field.min ?? undefined"
            :max="field.max ?? undefined"
            input-class="ltr"
            :readonly="readonly"
            @update:model-value="
              (v) => (config[field.key] = v === '' || v === null ? null : Number(v))
            "
          />

          <div v-else-if="field.type === 'select' && field.options.length <= 4">
            <div class="field-label">{{ label(field) }}</div>
            <div class="segmented">
              <button
                v-for="option in field.options"
                :key="option.value"
                type="button"
                class="chip-filter"
                :class="{ active: selected(field) === option.value }"
                :disabled="readonly"
                @click="config[field.key] = option.value"
              >
                {{ option.label }}
              </button>
            </div>
            <div v-if="field.hint" class="faint text-caption q-mt-xs">{{ field.hint }}</div>
          </div>

          <q-select
            v-else-if="field.type === 'select' || field.type === 'multiselect'"
            :model-value="field.type === 'select' ? selected(field) : list(field)"
            outlined
            emit-value
            map-options
            :multiple="field.type === 'multiselect'"
            :use-chips="field.type === 'multiselect'"
            :options="field.options"
            :label="label(field)"
            :hint="field.hint ?? undefined"
            :readonly="readonly"
            @update:model-value="(v) => (config[field.key] = v)"
          />

          <q-select
            v-else-if="field.type === 'tags'"
            :model-value="list(field)"
            outlined
            multiple
            use-chips
            use-input
            hide-dropdown-icon
            new-value-mode="add-unique"
            input-debounce="0"
            :label="label(field)"
            :hint="listHint(field, 'بنویسید و Enter بزنید')"
            :readonly="readonly"
            @update:model-value="(v) => (config[field.key] = v)"
          />

          <q-toggle
            v-else-if="field.type === 'toggle'"
            :model-value="config[field.key] === true"
            color="primary"
            :label="field.label"
            :disable="readonly"
            @update:model-value="(v) => (config[field.key] = v)"
          >
            <q-tooltip v-if="field.hint">{{ field.hint }}</q-tooltip>
          </q-toggle>

          <q-input
            v-else-if="field.type === 'secret'"
            :model-value="(config[field.key] as string | null) ?? ''"
            outlined
            type="password"
            autocomplete="new-password"
            :label="label(field)"
            :placeholder="
              secretsSet?.includes(field.key)
                ? '•••••••• ذخیره شده؛ برای تغییر مقدار تازه بنویسید'
                : undefined
            "
            :hint="field.hint ?? 'رمزنگاری‌شده نگه داشته می‌شود و دوباره نمایش داده نمی‌شود.'"
            input-class="ltr"
            :readonly="readonly"
            @update:model-value="(v) => (config[field.key] = v === '' ? null : String(v))"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.config {
  display: grid;
  gap: 28px;
}
h3 {
  font-size: 1rem;
  margin-bottom: 12px;
}
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.wide {
  grid-column: 1 / -1;
}
.field-label {
  color: var(--muted);
  font-size: 0.85rem;
  margin-bottom: 8px;
}
.segmented {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.readonly .chip-filter {
  cursor: default;
}
@media (max-width: 599px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
