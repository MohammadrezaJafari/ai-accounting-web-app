import 'vue-router';
import type { Permission } from '../types';

declare module 'vue-router' {
  interface RouteMeta {
    auth?: boolean;
    /** The member's role must allow this in the current organization. */
    permission?: Permission;
  }
}
