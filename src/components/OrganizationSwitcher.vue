<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { createOrganization, errorMessage } from '../api';
import { useAuthStore } from '../stores/auth';

/** Current organization and role, with switching and creating organizations. */
const auth = useAuthStore();
const router = useRouter();
const $q = useQuasar();
const creating = ref(false);
const name = ref('');
const busy = ref(false);

async function switchTo(id: number): Promise<void> {
  if (id === auth.organization?.id) return;
  try {
    await auth.switchTo(id);
    await router.push('/');
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  }
}

async function create(): Promise<void> {
  busy.value = true;
  try {
    await createOrganization(name.value);
    await auth.refresh();
    creating.value = false;
    name.value = '';
    await router.push('/team');
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <button type="button" class="switcher">
    <span class="initial">{{ auth.organization?.name.charAt(0) }}</span>
    <span class="col text-start ellipsis">
      <span class="name ellipsis">{{ auth.organization?.name }}</span>
      <span class="role">{{ auth.organization?.role_label }}</span>
    </span>
    <q-icon name="unfold_more" size="18px" class="faint" />
    <q-menu fit anchor="bottom middle" self="top middle" :offset="[0, 6]">
      <q-list class="q-py-xs">
        <q-item-label header class="q-py-sm">سازمان‌های شما</q-item-label>
        <q-item
          v-for="organization in auth.organizations"
          :key="organization.id"
          v-close-popup
          clickable
          @click="switchTo(organization.id)"
        >
          <q-item-section>
            <q-item-label class="ink-strong">{{ organization.name }}</q-item-label>
            <q-item-label caption class="faint">{{ organization.role_label }}</q-item-label>
          </q-item-section>
          <q-item-section v-if="organization.id === auth.organization?.id" side>
            <q-icon name="check" color="primary" />
          </q-item-section>
        </q-item>
        <q-separator class="q-my-xs" />
        <q-item v-close-popup clickable to="/team">
          <q-item-section avatar><q-icon name="group" /></q-item-section>
          <q-item-section>اعضا و دعوت‌ها</q-item-section>
        </q-item>
        <q-item v-close-popup clickable @click="creating = true">
          <q-item-section avatar><q-icon name="add" /></q-item-section>
          <q-item-section>سازمان جدید</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </button>

  <q-dialog v-model="creating">
    <q-card style="width: 420px; max-width: 92vw; border-radius: 18px">
      <q-form @submit.prevent="create">
        <q-card-section>
          <div class="text-h6">سازمان جدید</div>
          <p class="muted q-mt-sm q-mb-none">
            مثلاً برای شرکت یا مشتری دیگری. اپ‌ها، کیف پول‌ها و اعضای هر سازمان جدا هستند.
          </p>
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="name"
            outlined
            autofocus
            label="نام سازمان"
            :rules="[(v) => !!v || 'نام لازم است']"
          />
        </q-card-section>
        <q-card-actions align="left" class="q-pa-md">
          <q-btn v-close-popup flat no-caps color="grey" label="انصراف" />
          <q-btn type="submit" unelevated no-caps class="btn-pill" label="ساخت" :loading="busy" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.switcher {
  display: flex;
  align-items: center;
  gap: 10px;
  width: calc(100% - 20px);
  margin: 0 10px 12px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.switcher:hover {
  background: var(--surface-2);
}
.initial {
  display: grid;
  place-items: center;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--brand);
  color: #fff;
  font-weight: 700;
}
.name {
  display: block;
  color: var(--ink-strong);
  font-size: 0.9rem;
  font-weight: 600;
}
.role {
  display: block;
  color: var(--faint);
  font-size: 0.75rem;
}
</style>
