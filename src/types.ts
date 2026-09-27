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
  | 'manage-apps'
  | 'manage-keys'
  | 'manage-billing'
  | 'manage-members'
  | 'use-chat'
  | 'publish-agents';

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
    type: 'spend_limit' | 'agent_report' | 'agent_no_credits' | 'publisher_review';
    /** publisher_review: approved | rejected | changes_applied | changes_rejected */
    outcome?: string;
    agent_id?: number;
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

export type ConfigFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'tags'
  | 'url'
  | 'url_list'
  | 'toggle'
  | 'secret';

export type ConfigValue = string | number | boolean | string[] | null;

/** One parameter of an agent, defined in the admin panel (or the publisher's manifest). */
export interface ConfigField {
  key: string;
  label: string;
  type: ConfigFieldType;
  required: boolean;
  section: string | null;
  hint: string | null;
  placeholder: string | null;
  default: ConfigValue;
  options: { value: string; label: string }[];
  min: number | null;
  max: number | null;
  max_items: number | null;
}

export interface Agent {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  /** Markdown. */
  description: string | null;
  /** Material icon name. */
  icon: string;
  category: string | null;
  publisher: { name: string; url: string | null } | null;
  unit_name: string;
  max_units_per_run: number;
  config_schema: ConfigField[];
  /** Units the current organization has left. */
  credits: number;
  packages: AgentPackage[];
}

export interface AgentCatalog {
  data: Agent[];
  delivery: { telegram_bot: string | null; bale_bot: string | null };
}

export type AgentConfig = Record<string, ConfigValue>;

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
    /** Lines from the agent about the run, e.g. what it checked. */
    notes?: string[];
    /** Warnings that did not stop the run. */
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
  agent: { id: number; slug: string; name: string; icon: string; unit_name: string };
  app: { id: number; name: string };
  /** Secret parameters come back empty; `secrets_set` says which have a saved value. */
  config: AgentConfig;
  secrets_set: string[];
  run_hours: number[];
  /** 0 = Sunday … 6 = Saturday; empty = every day. */
  run_days: number[];
  notify_empty: boolean;
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
  config: AgentConfig;
  run_hours: number[];
  run_days: number[];
  notify_empty: boolean;
  is_active?: boolean;
}

export type PublisherAgentStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';

export interface PublisherPackage {
  units: number;
  /** USD. */
  price: string;
}

/** Fields of a listing its publisher edits. */
export interface PublisherAgentDraft {
  slug?: string;
  name: string;
  tagline: string | null;
  description: string | null;
  icon: string | null;
  category: string | null;
  unit_name: string;
  max_units_per_run: number;
  endpoint_url: string | null;
  timeout_seconds: number;
  run_deadline_minutes: number;
  /** USD; the publisher's own cap on model cost per run, applied without review. */
  max_cost_per_run: string;
  config_schema: ConfigField[];
  packages: PublisherPackage[];
}

export interface PublisherAgentStats {
  units: number;
  revenue: string;
  /** The publisher's share of sales. */
  share: string;
  /** Model cost charged to the publisher (test runs included). */
  cost: string;
  /** share − cost */
  earned: string;
  customers: number;
  active_instances: number;
  runs: Partial<Record<AgentRunStatus, number>>;
  failure_rate: number | null;
  /** Model cost per run that used a model (USD). */
  avg_run_cost: string | null;
  max_run_cost: string | null;
}

/** A listing as its publisher sees it. */
export interface PublisherAgent extends Omit<PublisherAgentDraft, 'slug'> {
  id: number;
  slug: string;
  status: PublisherAgentStatus;
  status_label: string;
  is_live: boolean;
  /** Changes to a live listing waiting for review. */
  pending_changes: Partial<PublisherAgentDraft> | null;
  review_note: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  signing_secret: string;
  terms: {
    revenue_share: number;
    max_cost_per_run: string | null;
    /** The highest cap the publisher may set. */
    max_cost_ceiling: string;
    default_model: string | null;
    allowed_models: string[];
  };
  stats?: PublisherAgentStats;
  created_at: string;
}

export interface PublisherRun {
  id: number;
  status: AgentRunStatus;
  trigger: 'schedule' | 'manual' | 'test';
  units: number;
  items_found: number;
  error: string | null;
  notes: string[];
  warnings: string[];
  cost: string;
  duration_ms: number | null;
  created_at: string;
  report?: string | null;
  data?: Record<string, unknown> | null;
}

export interface PublisherPayout {
  id: number;
  amount: string;
  reference: string | null;
  note: string | null;
  paid_at: string;
}

export interface PublisherOverview {
  profile: {
    publisher_name: string | null;
    publisher_url: string | null;
    support_email: string | null;
    /** Only for members who handle billing. */
    payout_details: string | null;
  };
  summary: {
    units: number;
    revenue: string;
    /** The publisher's share of sales. */
    share: string;
    /** Model cost of the publisher's agents, charged to it. */
    model_cost: string;
    /** share − model_cost */
    earned: string;
    paid: string;
    balance: string;
    customers: number;
    live_agents: number;
  };
  daily: { date: string; earned: string; units: number }[];
  payouts: PublisherPayout[];
}
