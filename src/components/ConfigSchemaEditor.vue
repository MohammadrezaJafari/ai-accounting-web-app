<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ConfigField, ConfigFieldType } from '../types';

/** Builds the parameters customers fill in for an agent, field by field or as JSON. */
defineProps<{ readonly?: boolean }>();
const fields = defineModel<ConfigField[]>({ required: true });

const types: { value: ConfigFieldType; label: string; icon: string }[] = [
  { value: 'text', label: 'متن کوتاه', icon: 'short_text' },
  { value: 'textarea', label: 'متن بلند', icon: 'notes' },
  { value: 'number', label: 'عدد', icon: 'pin' },
  { value: 'select', label: 'انتخاب یکی', icon: 'radio_button_checked' },
  { value: 'multiselect', label: 'انتخاب چندتا', icon: 'checklist' },
  { value: 'tags', label: 'فهرست کلمه‌ها', icon: 'sell' },
  { value: 'url', label: 'آدرس وب', icon: 'link' },
  { value: 'url_list', label: 'فهرست آدرس‌ها', icon: 'dynamic_feed' },
  { value: 'toggle', label: 'روشن / خاموش', icon: 'toggle_on' },
  { value: 'secret', label: 'کلید محرمانه', icon: 'key' },
];
const typeOf = (type: ConfigFieldType) => types.find((t) => t.value === type)!;
const isList = (type: ConfigFieldType) => ['multiselect', 'tags', 'url_list'].includes(type);
const hasOptions = (type: ConfigFieldType) => type === 'select' || type === 'multiselect';

const open = ref<number | null>(null);
const jsonMode = ref(false);
const jsonText = ref('');
const jsonError = ref<string | null>(null);

function blank(): ConfigField {
  return {
    key: `field_${fields.value.length + 1}`,
    label: '',
    type: 'text',
    required: false,
    section: null,
    hint: null,
    placeholder: null,
    default: null,
    options: [],
    min: null,
    max: null,
    max_items: null,
  };
}

function add(): void {
  fields.value = [...fields.value, blank()];
  open.value = fields.value.length - 1;
}

function remove(index: number): void {
  fields.value = fields.value.filter((_, i) => i !== index);
  open.value = null;
}

function move(index: number, by: number): void {
  const list = [...fields.value];
  const [field] = list.splice(index, 1);
  list.splice(index + by, 0, field!);
  fields.value = list;
  open.value = index + by;
}

function setType(field: ConfigField, type: ConfigFieldType): void {
  field.type = type;
  field.default = type === 'toggle' ? false : null;
  if (hasOptions(type) && !field.options.length) {
    field.options = [{ value: 'option_1', label: 'گزینهٔ ۱' }];
  }
}

/** Defaults are typed in as text; lists are comma separated. */
function defaultText(field: ConfigField): string {
  return Array.isArray(field.default) ? field.default.join(', ') : String(field.default ?? '');
}

function setDefault(field: ConfigField, text: string | number | null): void {
  const value = String(text ?? '').trim();
  if (!value) field.default = null;
  else if (isList(field.type)) field.default = value.split(/\s*[,،]\s*/).filter(Boolean);
  else if (field.type === 'number') field.default = Number(value);
  else field.default = value;
}

const toNumber = (value: string | number | null) =>
  value === '' || value === null ? null : Number(value);
const toText = (value: string | number | null) =>
  value === '' || value === null ? null : String(value);

watch(jsonMode, (on) => {
  if (on) {
    jsonText.value = JSON.stringify(fields.value, null, 2);
    jsonError.value = null;
  }
});

function applyJson(): void {
  try {
    const parsed: unknown = JSON.parse(jsonText.value);
    if (!Array.isArray(parsed)) throw new Error('باید یک آرایه از پارامترها باشد.');
    fields.value = parsed.map((item: Partial<ConfigField>) => ({ ...blank(), ...item }));
    jsonError.value = null;
    jsonMode.value = false;
  } catch (exception) {
    jsonError.value = exception instanceof Error ? exception.message : 'JSON معتبر نیست.';
  }
}
</script>

<template>
  <div class="editor">
    <div class="row items-center q-mb-md">
      <p class="muted col q-mb-none">
        هر پارامتر یک فیلد در فرم مشتری است و مقدارش در <code class="ltr">config</code> هر اجرا به
        سرویس شما می‌رسد.
      </p>
      <q-toggle v-model="jsonMode" color="primary" label="ویرایش JSON" :disable="readonly" />
    </div>

    <template v-if="jsonMode">
      <q-input
        v-model="jsonText"
        outlined
        type="textarea"
        autogrow
        input-class="ltr code"
        :error="!!jsonError"
        :error-message="jsonError ?? undefined"
      />
      <div class="row q-gutter-sm q-mt-sm">
        <q-btn unelevated no-caps class="btn-pill" label="اعمال" @click="applyJson" />
        <q-btn flat no-caps color="grey" label="انصراف" @click="jsonMode = false" />
      </div>
    </template>

    <template v-else>
      <div v-if="!fields.length" class="panel empty">
        <q-icon name="tune" size="36px" class="faint" />
        <p class="q-mt-sm">ایجنت پارامتری ندارد؛ مشتری فقط نام و زمان‌بندی را تعیین می‌کند.</p>
      </div>

      <div class="list">
        <div
          v-for="(field, index) in fields"
          :key="index"
          class="field panel"
          :class="{ open: open === index }"
        >
          <button type="button" class="field-head" @click="open = open === index ? null : index">
            <q-icon :name="typeOf(field.type).icon" size="20px" class="faint" />
            <span class="col ellipsis">
              <span class="ink-strong">{{ field.label || 'بدون عنوان' }}</span>
              <span class="faint text-caption q-ml-sm ltr">{{ field.key }}</span>
            </span>
            <span class="faint text-caption">{{ typeOf(field.type).label }}</span>
            <q-icon v-if="field.required" name="emergency" size="12px" color="negative">
              <q-tooltip>اجباری</q-tooltip>
            </q-icon>
            <q-icon :name="open === index ? 'expand_less' : 'expand_more'" />
          </button>

          <div v-if="open === index" class="field-body">
            <div class="grid-3">
              <q-input
                v-model="field.label"
                outlined
                dense
                label="عنوان در فرم"
                :readonly="readonly"
              />
              <q-input
                v-model="field.key"
                outlined
                dense
                label="شناسه (در config)"
                input-class="ltr"
                :rules="[(v) => /^[a-z][a-z0-9_]*$/.test(v) || 'حرف کوچک انگلیسی، عدد و _']"
                :readonly="readonly"
              />
              <q-select
                :model-value="field.type"
                outlined
                dense
                emit-value
                map-options
                :options="types"
                label="نوع"
                :readonly="readonly"
                @update:model-value="(type) => setType(field, type)"
              />
              <q-input
                :model-value="field.section ?? ''"
                outlined
                dense
                label="بخش فرم"
                placeholder="مثلاً فیلترها"
                :readonly="readonly"
                @update:model-value="(v) => (field.section = toText(v))"
              />
              <q-input
                :model-value="field.hint ?? ''"
                outlined
                dense
                label="راهنما"
                :readonly="readonly"
                @update:model-value="(v) => (field.hint = toText(v))"
              />
              <q-input
                :model-value="field.placeholder ?? ''"
                outlined
                dense
                label="نمونه"
                :readonly="readonly"
                @update:model-value="(v) => (field.placeholder = toText(v))"
              />
              <q-toggle
                v-if="field.type === 'toggle'"
                :model-value="field.default === true"
                color="primary"
                label="پیش‌فرض روشن"
                :disable="readonly"
                @update:model-value="(v) => (field.default = v)"
              />
              <q-input
                v-else-if="field.type !== 'secret'"
                :model-value="defaultText(field)"
                outlined
                dense
                label="پیش‌فرض"
                :hint="isList(field.type) ? 'با کاما جدا کنید' : undefined"
                :readonly="readonly"
                @update:model-value="(v) => setDefault(field, v)"
              />
              <template v-if="field.type === 'number'">
                <q-input
                  :model-value="field.min"
                  outlined
                  dense
                  type="number"
                  label="حداقل"
                  :readonly="readonly"
                  @update:model-value="(v) => (field.min = toNumber(v))"
                />
                <q-input
                  :model-value="field.max"
                  outlined
                  dense
                  type="number"
                  label="حداکثر"
                  :readonly="readonly"
                  @update:model-value="(v) => (field.max = toNumber(v))"
                />
              </template>
              <q-input
                v-else-if="['text', 'textarea', 'secret'].includes(field.type)"
                :model-value="field.max"
                outlined
                dense
                type="number"
                label="حداکثر طول"
                :readonly="readonly"
                @update:model-value="(v) => (field.max = toNumber(v))"
              />
              <q-input
                v-if="isList(field.type)"
                :model-value="field.max_items"
                outlined
                dense
                type="number"
                label="حداکثر تعداد"
                :readonly="readonly"
                @update:model-value="(v) => (field.max_items = toNumber(v))"
              />
              <q-toggle
                v-model="field.required"
                color="primary"
                label="اجباری"
                :disable="readonly"
              />
            </div>

            <div v-if="hasOptions(field.type)" class="options">
              <div class="field-label">گزینه‌ها</div>
              <div v-for="(option, i) in field.options" :key="i" class="option">
                <q-input v-model="option.label" outlined dense label="عنوان" :readonly="readonly" />
                <q-input
                  v-model="option.value"
                  outlined
                  dense
                  label="مقدار"
                  input-class="ltr"
                  :readonly="readonly"
                />
                <q-btn
                  v-if="!readonly"
                  flat
                  round
                  dense
                  size="sm"
                  icon="close"
                  color="grey"
                  aria-label="حذف گزینه"
                  @click="field.options.splice(i, 1)"
                />
              </div>
              <q-btn
                v-if="!readonly"
                flat
                dense
                no-caps
                icon="add"
                label="گزینه"
                color="primary"
                @click="
                  field.options.push({
                    value: `option_${field.options.length + 1}`,
                    label: '',
                  })
                "
              />
            </div>

            <div v-if="!readonly" class="row items-center q-mt-md">
              <q-btn
                flat
                dense
                round
                icon="arrow_upward"
                aria-label="بالاتر"
                :disable="index === 0"
                @click="move(index, -1)"
              />
              <q-btn
                flat
                dense
                round
                icon="arrow_downward"
                aria-label="پایین‌تر"
                :disable="index === fields.length - 1"
                @click="move(index, 1)"
              />
              <q-space />
              <q-btn
                flat
                dense
                no-caps
                color="negative"
                label="حذف پارامتر"
                @click="remove(index)"
              />
            </div>
          </div>
        </div>
      </div>

      <q-btn
        v-if="!readonly"
        outline
        no-caps
        class="q-mt-md full-width add"
        icon="add"
        label="افزودن پارامتر"
        @click="add"
      />
    </template>
  </div>
</template>

<style scoped>
.list {
  display: grid;
  gap: 8px;
}
.field {
  overflow: hidden;
}
.field.open {
  border-color: var(--surface-3);
}
.field-head {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: 0;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}
.field-body {
  padding: 4px 16px 16px;
  border-top: 1px solid var(--line);
}
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-items: start;
  padding-top: 14px;
}
.field-label {
  color: var(--muted);
  font-size: 0.85rem;
  margin: 14px 0 8px;
}
.option {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.add {
  border-style: dashed;
  color: var(--muted);
}
:deep(.code) {
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
}
@media (max-width: 767px) {
  .grid-3 {
    grid-template-columns: 1fr;
  }
}
</style>
