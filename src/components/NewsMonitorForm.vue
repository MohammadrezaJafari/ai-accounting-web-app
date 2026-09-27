<script setup lang="ts">
import { computed } from 'vue';
import { faNumber, usd, weekDays } from '../format';
import type { AgentInstanceDraft, App } from '../types';

/** Settings of a news monitor: what to read, what to keep, how to write and when to run. */
const props = defineProps<{ apps: App[]; readonly?: boolean }>();
const draft = defineModel<AgentInstanceDraft>({ required: true });

const sourcesText = computed({
  get: () => draft.value.config.sources.join('\n'),
  set: (text: string) => {
    draft.value.config.sources = text
      .split(/\s*\n\s*/)
      .map((line) => line.trim())
      .filter(Boolean);
  },
});

const ageOptions = [6, 12, 24, 48, 72, 168].map((hours) => ({
  value: hours,
  label: hours < 24 ? `${faNumber(hours)} ساعت اخیر` : `${faNumber(hours / 24)} روز اخیر`,
}));

const presets = [
  { label: 'هر روز ساعت ۸', hours: [8], days: [] as number[] },
  { label: 'صبح و عصر (۸ و ۲۰)', hours: [8, 20], days: [] as number[] },
  { label: 'روزهای کاری ساعت ۹', hours: [9], days: [6, 0, 1, 2, 3] },
  { label: 'فقط دستی', hours: [] as number[], days: [] as number[] },
];

function toggle(list: number[], value: number): number[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function applyPreset(preset: (typeof presets)[number]): void {
  draft.value.run_hours = [...preset.hours];
  draft.value.run_days = [...preset.days];
}

const appOptions = computed(() =>
  props.apps.map((a) => ({ value: a.id, label: `${a.name} (${usd(a.balance)})` })),
);
</script>

<template>
  <div class="form" :class="{ readonly }">
    <section>
      <h3>مشخصات</h3>
      <div class="grid-2">
        <q-input
          v-model="draft.name"
          outlined
          label="نام"
          placeholder="مثلاً پایش بازار پرداخت"
          :readonly="readonly"
        />
        <q-select
          v-model="draft.app_id"
          outlined
          emit-value
          map-options
          :options="appOptions"
          label="اپ"
          hint="مصرف مدل در لاگ همین اپ ثبت می‌شود؛ هزینه از اعتبار گزارش کم می‌شود، نه موجودی."
          :readonly="readonly"
        />
      </div>
    </section>

    <section>
      <h3>منابع خبری</h3>
      <q-input
        v-model="sourcesText"
        outlined
        type="textarea"
        autogrow
        label="آدرس‌ها (هر خط یک آدرس)"
        hint="فید RSS/Atom یا صفحهٔ اول سایت خبری؛ تا ۱۰ منبع."
        input-class="ltr"
        :readonly="readonly"
      />
    </section>

    <section>
      <h3>فیلتر خبرها</h3>
      <div class="grid-2">
        <q-select
          v-model="draft.config.keywords"
          outlined
          multiple
          use-chips
          use-input
          hide-dropdown-icon
          new-value-mode="add-unique"
          input-debounce="0"
          label="کلیدواژه‌ها"
          hint="Enter بزنید. خالی = همهٔ خبرها"
          :readonly="readonly"
        />
        <q-select
          v-model="draft.config.exclude_keywords"
          outlined
          multiple
          use-chips
          use-input
          hide-dropdown-icon
          new-value-mode="add-unique"
          input-debounce="0"
          label="کلیدواژه‌های حذفی"
          hint="خبرهای شامل این‌ها کنار گذاشته می‌شوند"
          :readonly="readonly"
        />
        <q-select
          v-model="draft.config.max_age_hours"
          outlined
          emit-value
          map-options
          :options="ageOptions"
          label="تازگی خبر"
          :readonly="readonly"
        />
        <div>
          <div class="field-label">
            حداکثر {{ faNumber(draft.config.max_items) }} خبر در هر گزارش
          </div>
          <q-slider
            v-model="draft.config.max_items"
            :min="3"
            :max="30"
            :step="1"
            color="primary"
            :readonly="readonly"
          />
        </div>
      </div>
    </section>

    <section>
      <h3>گزارش</h3>
      <div class="grid-2">
        <div>
          <div class="field-label">جزئیات</div>
          <div class="segmented">
            <button
              v-for="option in [
                { value: 'brief', label: 'خلاصه' },
                { value: 'detailed', label: 'مفصل' },
              ]"
              :key="option.value"
              type="button"
              class="chip-filter"
              :class="{ active: draft.config.detail === option.value }"
              :disabled="readonly"
              @click="draft.config.detail = option.value as 'brief' | 'detailed'"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <div>
          <div class="field-label">زبان گزارش</div>
          <div class="segmented">
            <button
              v-for="option in [
                { value: 'fa', label: 'فارسی' },
                { value: 'en', label: 'English' },
              ]"
              :key="option.value"
              type="button"
              class="chip-filter"
              :class="{ active: draft.config.language === option.value }"
              :disabled="readonly"
              @click="draft.config.language = option.value as 'fa' | 'en'"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
      <q-input
        v-model="draft.config.instructions"
        class="q-mt-md"
        outlined
        type="textarea"
        autogrow
        label="دستورالعمل (اختیاری)"
        placeholder="مثلاً: روی اثر خبرها بر بازار پرداخت تمرکز کن و اعداد را پررنگ کن."
        :readonly="readonly"
      />
    </section>

    <section>
      <h3>زمان‌بندی (به وقت تهران)</h3>
      <div class="presets">
        <button
          v-for="preset in presets"
          :key="preset.label"
          type="button"
          class="chip-filter"
          :disabled="readonly"
          @click="applyPreset(preset)"
        >
          {{ preset.label }}
        </button>
      </div>
      <div class="field-label q-mt-md">ساعت‌ها</div>
      <div class="hours">
        <button
          v-for="hour in 24"
          :key="hour - 1"
          type="button"
          class="slot"
          :class="{ active: draft.run_hours.includes(hour - 1) }"
          :disabled="readonly"
          @click="draft.run_hours = toggle(draft.run_hours, hour - 1)"
        >
          {{ faNumber(hour - 1) }}
        </button>
      </div>
      <div class="field-label q-mt-md">روزها</div>
      <div class="days">
        <button
          v-for="day in weekDays"
          :key="day.value"
          type="button"
          class="slot"
          :class="{ active: !draft.run_days.length || draft.run_days.includes(day.value) }"
          :disabled="readonly"
          @click="
            draft.run_days = toggle(
              draft.run_days.length ? draft.run_days : weekDays.map((d) => d.value),
              day.value,
            )
          "
        >
          {{ day.label }}
        </button>
      </div>
      <q-toggle
        v-model="draft.config.notify_empty"
        class="q-mt-md"
        color="primary"
        label="وقتی خبر تازه‌ای نیست هم به مقصدها خبر بده"
        :disable="readonly"
      />
    </section>
  </div>
</template>

<style scoped>
.form {
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
.field-label {
  color: var(--muted);
  font-size: 0.85rem;
  margin-bottom: 8px;
}
.segmented,
.presets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.hours {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 6px;
  max-width: 640px;
}
.days {
  display: flex;
  gap: 6px;
}
.slot {
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  border-radius: 8px;
  height: 34px;
  min-width: 38px;
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}
.slot.active {
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
}
.readonly .slot,
.readonly .chip-filter {
  cursor: default;
}
@media (max-width: 599px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
  .hours {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}
</style>
