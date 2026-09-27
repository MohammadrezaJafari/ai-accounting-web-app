<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { copyToClipboard, useMeta, useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import {
  createInvitation,
  deleteInvitation,
  errorMessage,
  listInvitations,
  listMembers,
  removeMember,
  renameOrganization,
  updateMember,
} from '../api';
import { faDate, organizationRoles } from '../format';
import { useAuthStore } from '../stores/auth';
import type { Invitation, Member, OrganizationRole } from '../types';

useMeta({ title: 'تیم | پلتفرم توسعه‌دهندگان' });

const auth = useAuthStore();
const router = useRouter();
const $q = useQuasar();

const members = ref<Member[] | null>(null);
const invitations = ref<Invitation[]>([]);
const canManage = computed(() => auth.can('manage-members'));
const roleOptions = (Object.keys(organizationRoles) as OrganizationRole[]).map((role) => ({
  value: role,
  label: organizationRoles[role].label,
  description: organizationRoles[role].description,
}));

const invite = reactive<{ email: string; role: OrganizationRole }>({
  email: '',
  role: 'developer',
});
const inviting = ref(false);
const lastLink = ref('');
const orgName = ref(auth.organization?.name ?? '');
const renaming = ref(false);

async function load(): Promise<void> {
  try {
    members.value = await listMembers();
    if (canManage.value) invitations.value = await listInvitations();
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  }
}

async function sendInvite(): Promise<void> {
  inviting.value = true;
  try {
    const invitation = await createInvitation(invite.email, invite.role);
    lastLink.value = invitation.url ?? '';
    invite.email = '';
    invitations.value = await listInvitations();
    $q.notify({ type: 'positive', message: 'دعوت‌نامه ایمیل شد. لینک را هم می‌توانید کپی کنید.' });
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  } finally {
    inviting.value = false;
  }
}

async function copyLink(url: string): Promise<void> {
  await copyToClipboard(url);
  $q.notify({ type: 'positive', message: 'لینک دعوت کپی شد.', timeout: 1200 });
}

async function changeRole(member: Member, role: OrganizationRole): Promise<void> {
  try {
    const updated = await updateMember(member.id, role);
    Object.assign(member, updated);
    if (member.id === auth.user?.id) await auth.refresh();
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  }
}

function remove(member: Member): void {
  const leaving = member.id === auth.user?.id;
  $q.dialog({
    title: leaving ? 'خروج از سازمان' : 'حذف عضو',
    message: leaving
      ? `دیگر به اپ‌ها و کیف پول‌های «${auth.organization?.name}» دسترسی نخواهید داشت.`
      : `${member.name} دیگر به این سازمان دسترسی نخواهد داشت.`,
    cancel: { flat: true, label: 'انصراف', color: 'grey' },
    ok: { color: 'negative', unelevated: true, label: leaving ? 'خروج' : 'حذف' },
  }).onOk(() => {
    void removeMember(member.id)
      .then(async () => {
        if (leaving) {
          await auth.refresh();
          await router.push('/');
        } else {
          members.value = members.value?.filter((m) => m.id !== member.id) ?? null;
        }
      })
      .catch((exception) => $q.notify({ type: 'negative', message: errorMessage(exception) }));
  });
}

async function cancelInvitation(invitation: Invitation): Promise<void> {
  await deleteInvitation(invitation.id).catch(() => undefined);
  invitations.value = invitations.value.filter((i) => i.id !== invitation.id);
}

async function rename(): Promise<void> {
  renaming.value = true;
  try {
    await renameOrganization(orgName.value);
    await auth.refresh();
    $q.notify({ type: 'positive', message: 'ذخیره شد.' });
  } catch (exception) {
    $q.notify({ type: 'negative', message: errorMessage(exception) });
  } finally {
    renaming.value = false;
  }
}

onMounted(load);
</script>

<template>
  <q-page class="page page-narrow">
    <div class="page-head">
      <div>
        <h1>تیم {{ auth.organization?.name }}</h1>
        <p>اعضای سازمان همهٔ اپ‌ها را می‌بینند؛ نقش هر عضو مشخص می‌کند چه کاری می‌تواند بکند.</p>
      </div>
    </div>

    <div class="roles q-mb-xl">
      <div
        v-for="role in roleOptions"
        :key="role.value"
        class="role-card"
        :class="{ mine: auth.organization?.role === role.value }"
      >
        <div class="ink-strong text-weight-bold">
          {{ role.label }}
          <span v-if="auth.organization?.role === role.value" class="you">نقش شما</span>
        </div>
        <div class="faint text-caption q-mt-xs">{{ role.description }}</div>
      </div>
    </div>

    <template v-if="canManage">
      <h2 class="panel-title">دعوت عضو جدید</h2>
      <q-form class="panel panel-pad invite q-mb-md" @submit.prevent="sendInvite">
        <q-input
          v-model="invite.email"
          class="col"
          outlined
          dense
          type="email"
          label="ایمیل"
          input-class="ltr"
          :rules="[(v) => !!v || 'ایمیل لازم است']"
          hide-bottom-space
        />
        <q-select
          v-model="invite.role"
          outlined
          dense
          emit-value
          map-options
          :options="roleOptions"
          label="نقش"
          style="min-width: 160px"
        />
        <q-btn
          type="submit"
          unelevated
          no-caps
          class="btn-pill"
          icon="send"
          label="دعوت"
          :loading="inviting"
        />
      </q-form>
      <div v-if="lastLink" class="success-banner row items-center no-wrap q-mb-lg">
        <div class="col">
          <div class="text-weight-bold">دعوت فرستاده شد</div>
          <div class="muted text-caption q-mt-xs">
            اگر ایمیل نرسید، این لینک را برایش بفرستید. باید با همان ایمیل وارد شود.
          </div>
          <div class="mono text-caption q-mt-sm ellipsis">{{ lastLink }}</div>
        </div>
        <q-btn
          flat
          round
          dense
          icon="content_copy"
          aria-label="کپی لینک"
          @click="copyLink(lastLink)"
        />
      </div>
    </template>

    <h2 class="panel-title q-mt-lg">اعضا</h2>
    <div v-if="members === null" class="flex flex-center q-pa-lg">
      <q-spinner color="primary" />
    </div>
    <div v-else class="panel list">
      <div v-for="member in members" :key="member.id" class="row-item">
        <q-avatar size="38px" color="secondary" text-color="white">{{
          member.name.charAt(0)
        }}</q-avatar>
        <div class="col ellipsis">
          <div class="ink-strong">
            {{ member.name }}
            <span v-if="member.id === auth.user?.id" class="faint text-caption">(شما)</span>
          </div>
          <div class="faint text-caption email">{{ member.email }}</div>
        </div>
        <q-select
          v-if="canManage"
          :model-value="member.role"
          dense
          borderless
          emit-value
          map-options
          options-dense
          :options="roleOptions"
          class="role-select"
          @update:model-value="(role) => changeRole(member, role)"
        />
        <span v-else class="role-chip">{{ member.role_label }}</span>
        <q-btn
          v-if="canManage || member.id === auth.user?.id"
          flat
          round
          dense
          size="sm"
          :icon="member.id === auth.user?.id ? 'logout' : 'person_remove'"
          color="grey"
          :aria-label="member.id === auth.user?.id ? 'خروج از سازمان' : 'حذف عضو'"
          @click="remove(member)"
        >
          <q-tooltip>{{ member.id === auth.user?.id ? 'خروج از سازمان' : 'حذف عضو' }}</q-tooltip>
        </q-btn>
      </div>
    </div>

    <template v-if="canManage && invitations.length">
      <h2 class="panel-title q-mt-xl">دعوت‌های در انتظار</h2>
      <div class="panel list">
        <div v-for="invitation in invitations" :key="invitation.id" class="row-item">
          <q-avatar size="38px" color="grey-9" text-color="grey-5" icon="mail_outline" />
          <div class="col ellipsis">
            <div class="ink-strong email">{{ invitation.email }}</div>
            <div class="faint text-caption">
              {{ invitation.role_label }} ·
              {{
                invitation.is_expired ? 'منقضی شده' : `معتبر تا ${faDate(invitation.expires_at)}`
              }}
            </div>
          </div>
          <q-btn
            v-if="invitation.url && !invitation.is_expired"
            flat
            round
            dense
            size="sm"
            icon="link"
            aria-label="کپی لینک دعوت"
            @click="copyLink(invitation.url)"
          >
            <q-tooltip>کپی لینک دعوت</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            dense
            size="sm"
            icon="close"
            color="grey"
            aria-label="لغو دعوت"
            @click="cancelInvitation(invitation)"
          >
            <q-tooltip>لغو دعوت</q-tooltip>
          </q-btn>
        </div>
      </div>
    </template>

    <template v-if="canManage">
      <h2 class="panel-title q-mt-xl">نام سازمان</h2>
      <q-form class="panel panel-pad invite" @submit.prevent="rename">
        <q-input v-model="orgName" class="col" outlined dense label="نام سازمان" />
        <q-btn
          type="submit"
          unelevated
          no-caps
          class="btn-ghost-pill"
          label="ذخیره"
          :loading="renaming"
          :disable="!orgName || orgName === auth.organization?.name"
        />
      </q-form>
    </template>
  </q-page>
</template>

<style scoped>
.roles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.role-card {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 14px 16px;
}
.role-card.mine {
  border-color: rgb(50 148 106 / 60%);
  background: var(--brand-tint);
}
.you {
  font-size: 0.7rem;
  font-weight: 500;
  color: #6fcf9f;
  margin-inline-start: 6px;
}
.invite {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.list {
  overflow: hidden;
}
.row-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--line);
}
.row-item:last-child {
  border-bottom: 0;
}
.email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  /* rtl:begin:ignore */
  direction: ltr;
  text-align: right;
  /* rtl:end:ignore */
}
.role-select {
  min-width: 130px;
}
.role-chip {
  font-size: 0.8rem;
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 2px 12px;
}
@media (max-width: 599px) {
  .roles {
    grid-template-columns: 1fr;
  }
  .row-item {
    gap: 10px;
    padding: 12px;
  }
  .role-select {
    min-width: 100px;
  }
}
</style>
