/** All money values are USD decimal strings, e.g. "12.50"; token prices are per 1M tokens. */
export type Usd = string;

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'customer';
  is_active: boolean;
  created_at: string;
}

export type Permission =
  'manage-apps' | 'manage-keys' | 'manage-billing' | 'manage-members' | 'use-chat';

export type OrganizationRole = 'owner' | 'developer' | 'billing';

export interface Organization {
  id: number;
  name: string;
  role: OrganizationRole;
  role_label: string;
  permissions: Permission[];
  members_count?: number;
  apps_count?: number;
  created_at: string;
}

export interface Session {
  user: User;
  organization: Organization;
  organizations: Organization[];
}

export interface Member {
  id: number;
  name: string;
  email: string;
  role: OrganizationRole;
  role_label: string;
  joined_at: string;
}

export interface Invitation {
  id: number;
  email: string;
  role: OrganizationRole;
  role_label: string;
  organization?: { id: number; name: string };
  invited_by?: string | null;
  url?: string;
  expires_at: string;
  is_expired: boolean;
  created_at: string;
}

/** `total` = over the key's lifetime; days and (Jalali) months follow Tehran time. */
export type BudgetPeriod = 'total' | 'daily' | 'monthly';

/** A spend limit and what was spent in its current period. */
export interface Budget {
  spend_limit: Usd | null;
  spend_limit_period: BudgetPeriod;
  spent_this_period: Usd;
  period_ends_at: string | null;
}

export interface AppNotification {
  id: string;
  data: {
    type: 'spend_limit' | 'agent_report' | 'agent_no_credits';
    level?: number;
    subject?: 'app' | 'key';
    app_id?: number;
    agent_instance_id?: number;
    agent_run_id?: number;
    title: string;
    message: string;
  };
  read_at: string | null;
  created_at: string;
}

export interface App extends Budget {
  id: number;
  organization_id: number;
  name: string;
  description: string | null;
  balance: Usd;
  markup_percent: number | null;
  is_active: boolean;
  api_keys_count?: number;
  created_at: string;
}

export interface ApiKey extends Budget {
  id: number;
  app_id: number;
  app?: { id: number; name: string };
  name: string;
  key_prefix: string;
  allowed_providers: string[] | null;
  allowed_models: string[] | null;
  spent: Usd;
  expires_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ApiKeyDraft {
  name: string;
  allowed_providers: string[] | null;
  allowed_models: string[] | null;
  spend_limit: string | null;
  spend_limit_period: BudgetPeriod;
  expires_at: string | null;
  is_active?: boolean;
}

export type PriceCategory = 'input' | 'cached_input' | 'cache_write' | 'output';

export interface AiModel {
  id: number;
  name: string;
  description: string | null;
  public_id: string;
  provider: { id: number; slug: string; name: string; native_format: string | null } | null;
  context_window: number | null;
  is_active: boolean;
  is_featured: boolean;
  price: Record<PriceCategory, Usd>;
}

export interface Package {
  id: number;
  name: string;
  description: string | null;
  price: Usd;
  credit: Usd;
  bonus: Usd;
  is_active: boolean;
  sort_order: number;
}

export interface Catalog {
  data: Package[];
  custom_topup: { enabled: boolean; min: Usd; max: Usd };
}

export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'failed';

export interface Order {
  id: number;
  type: 'package' | 'custom';
  amount: Usd;
  credit: Usd;
  status: OrderStatus;
  gateway: string;
  gateway_ref: string | null;
  meta: { package_name?: string; instructions?: string; payment_url?: string } | null;
  app?: { id: number; name: string };
  user?: { id: number; name: string; email: string };
  package?: { id: number; name: string } | null;
  paid_at: string | null;
  created_at: string;
}

export interface WalletTransaction {
  id: number;
  app_id: number;
  type: 'topup' | 'adjustment' | 'refund';
  amount: Usd;
  balance_after: Usd;
  description: string | null;
  order_id: number | null;
  created_at: string;
}

export interface UsageLog {
  id: number;
  request_id: string;
  app?: { id: number; name: string };
  api_key?: { id: number; name: string } | null;
  endpoint: string;
  model: string;
  stream: boolean;
  input_tokens: number;
  cached_input_tokens: number;
  cache_write_tokens: number;
  output_tokens: number;
  charge: Usd;
  status_code: number;
  latency_ms: number;
  error: string | null;
  created_at: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

export interface UsageTotals {
  requests: number;
  errors: number;
  input_tokens: number;
  output_tokens: number;
  charge: Usd;
}

export interface Dashboard {
  balance: Usd;
  apps_count: number;
  totals: UsageTotals;
  daily: (UsageTotals & { day: string })[];
  by_model: (UsageTotals & { key: string; label: string })[];
  by_app: (UsageTotals & { key: number; label: string })[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
  /** HTTP status of a failed reply (402 = the app's wallet is empty). */
  status?: number;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  appId: number | null;
  messages: ChatMessage[];
  updatedAt: number;
}

export interface AgentPackage {
  id: number;
  name: string;
  units: number;
  price: Usd;
  unit_price: Usd;
}

export interface Agent {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  unit_name: string;
  /** Units the current organization has left. */
  credits: number;
  packages: AgentPackage[];
}

export interface AgentCatalog {
  data: Agent[];
  delivery: { telegram_bot: string | null; bale_bot: string | null };
}

export interface NewsMonitorConfig {
  sources: string[];
  keywords: string[];
  exclude_keywords: string[];
  instructions: string | null;
  max_items: number;
  max_age_hours: number;
  detail: 'brief' | 'detailed';
  language: 'fa' | 'en';
  notify_empty: boolean;
}

export type DeliveryType = 'telegram' | 'bale' | 'email' | 'webhook';

export interface AgentDestination {
  id: number;
  type: DeliveryType;
  type_label: string;
  label: string;
  settings: {
    chat_id?: string;
    bot_token?: string | null;
    emails?: string[];
    url?: string;
    secret?: string;
  };
  is_active: boolean;
  last_delivered_at: string | null;
  last_error: string | null;
  created_at: string;
}

export type AgentRunStatus = 'queued' | 'running' | 'succeeded' | 'empty' | 'no_credits' | 'failed';

export interface AgentRun {
  id: number;
  agent_instance_id: number;
  status: AgentRunStatus;
  trigger: 'schedule' | 'manual';
  units: number;
  items_found: number;
  error: string | null;
  meta: {
    sources?: number;
    fetched?: number;
    new?: number;
    matched?: number;
    errors?: string[];
    deliveries?: {
      destination_id: number;
      type: DeliveryType;
      label: string;
      ok: boolean;
      error: string | null;
    }[];
  } | null;
  report?: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface AgentInstance {
  id: number;
  name: string;
  agent: { id: number; slug: string; name: string; unit_name: string };
  app: { id: number; name: string };
  config: NewsMonitorConfig;
  run_hours: number[];
  /** 0 = Sunday … 6 = Saturday; empty = every day. */
  run_days: number[];
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  latest_run: AgentRun | null;
  destinations: AgentDestination[];
  created_at: string;
}

export interface AgentInstanceDraft {
  agent_id?: number;
  app_id: number | null;
  name: string;
  config: NewsMonitorConfig;
  run_hours: number[];
  run_days: number[];
  is_active?: boolean;
}
