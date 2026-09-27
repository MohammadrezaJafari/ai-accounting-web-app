<script setup lang="ts">
import { computed, ref } from 'vue';
import type { AiModel } from '../types';
import ProviderIcon from './ProviderIcon.vue';

/** Header model switcher: featured models in a dropdown, the full catalog in a dialog. */
const props = defineProps<{ models: AiModel[] }>();
const model = defineModel<string>({ required: true });

const current = computed(() => props.models.find((m) => m.public_id === model.value) ?? null);
const featured = computed(() => {
  const picked = props.models.filter((m) => m.is_featured);
  return picked.length ? picked : props.models.slice(0, 6);
});

const browsing = ref(false);
const search = ref('');
const groups = computed(() => {
  const term = search.value.trim().toLowerCase();
  const byProvider = new Map<string, AiModel[]>();
  props.models
    .filter(
      (m) =>
        !term || m.name.toLowerCase().includes(term) || m.public_id.toLowerCase().includes(term),
    )
    .forEach((m) => {
      const provider = m.provider?.name ?? 'سایر';
      byProvider.set(provider, [...(byProvider.get(provider) ?? []), m]);
    });
  return [...byProvider.entries()];
});

function pick(publicId: string): void {
  model.value = publicId;
  browsing.value = false;
}
</script>

<template>
  <q-btn flat no-caps class="picker" :disable="!models.length">
    <span class="current">{{ current?.name ?? 'انتخاب مدل' }}</span>
    <q-icon name="expand_more" size="20px" class="faint" />
    <q-menu anchor="bottom start" self="top start" :offset="[0, 6]" class="picker-menu">
      <q-list class="q-pa-sm" style="width: 360px; max-width: 92vw">
        <q-item
          v-for="option in featured"
          :key="option.id"
          v-close-popup
          clickable
          class="option"
          :class="{ active: option.public_id === model }"
          @click="pick(option.public_id)"
        >
          <q-item-section avatar>
            <ProviderIcon :slug="option.provider?.slug" :size="48" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="ink-strong">{{ option.name }}</q-item-label>
            <q-item-label caption class="faint">
              {{ option.description || option.provider?.name }}
            </q-item-label>
          </q-item-section>
          <q-item-section v-if="option.public_id === model" side>
            <q-icon name="check" color="primary" />
          </q-item-section>
        </q-item>
        <q-separator class="q-my-sm" />
        <q-item v-close-popup clickable class="option" @click="browsing = true">
          <q-item-section avatar><q-icon name="apps" /></q-item-section>
          <q-item-section>انتخاب مدل‌های دیگر</q-item-section>
          <q-item-section side><q-icon name="chevron_left" /></q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>

  <q-dialog v-model="browsing">
    <q-card class="browser">
      <q-card-section class="row items-center no-wrap q-pb-sm">
        <div class="text-h6 col">همهٔ مدل‌ها</div>
        <q-btn v-close-popup flat round dense icon="close" aria-label="بستن" />
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-input v-model="search" outlined dense rounded autofocus placeholder="جست‌وجوی مدل">
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </q-card-section>
      <q-card-section class="q-pt-none list">
        <div v-if="!groups.length" class="empty">مدلی پیدا نشد.</div>
        <div v-for="[provider, items] in groups" :key="provider" class="q-mb-md">
          <div class="faint text-caption q-mb-xs">{{ provider }}</div>
          <q-item
            v-for="option in items"
            :key="option.id"
            clickable
            class="option"
            :class="{ active: option.public_id === model }"
            @click="pick(option.public_id)"
          >
            <q-item-section avatar>
              <ProviderIcon :slug="option.provider?.slug" :size="36" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="ink-strong">{{ option.name }}</q-item-label>
              <q-item-label caption class="mono faint">{{ option.public_id }}</q-item-label>
            </q-item-section>
          </q-item>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.picker {
  border-radius: 10px;
  padding: 4px 10px;
}
.current {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--ink-strong);
  margin-inline-end: 4px;
}
.option {
  border-radius: 12px;
  padding: 10px 12px;
}
.option.active {
  background: var(--brand-tint);
}
.browser {
  width: 520px;
  max-width: 94vw;
  border-radius: 18px;
}
.list {
  max-height: 60vh;
  overflow-y: auto;
}
</style>
