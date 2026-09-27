import { defineStore } from 'pinia';
import { TOKEN_KEY, logout as apiLogout, me, switchOrganization } from '../api';
import type { Organization, Permission, Session, User } from '../types';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  organizations: Organization[];
  ready: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({ user: null, organization: null, organizations: [], ready: false }),
  getters: {
    loggedIn: (state) => state.user !== null,
    /** Whether the user's role in the current organization allows `permission` (any of a list). */
    can: (state) => (permission: Permission | Permission[]) =>
      [permission].flat().some((p) => state.organization?.permissions.includes(p) ?? false),
  },
  actions: {
    /** Resolve the current user from the stored token; safe to call repeatedly on the client. */
    async restore(): Promise<void> {
      if (this.ready) return;
      try {
        if (localStorage.getItem(TOKEN_KEY)) this.apply(await me());
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        this.user = null;
      } finally {
        this.ready = true;
      }
    },
    /** Reload the session, e.g. after joining, creating or switching organizations. */
    async refresh(): Promise<void> {
      this.apply(await me());
    },
    async switchTo(organizationId: number): Promise<void> {
      await switchOrganization(organizationId);
      await this.refresh();
    },
    signIn(token: string, session: Session): void {
      localStorage.setItem(TOKEN_KEY, token);
      this.apply(session);
      this.ready = true;
    },
    apply(session: Session): void {
      this.user = session.user;
      this.organization = session.organization;
      this.organizations = session.organizations;
    },
    async signOut(): Promise<void> {
      await apiLogout().catch(() => undefined);
      localStorage.removeItem(TOKEN_KEY);
      this.user = null;
      this.organization = null;
      this.organizations = [];
    },
  },
});
