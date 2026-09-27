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

export interface App {
  id: number;
  name: string;
  description: string | null;
  balance: Usd;
  markup_percent: number | null;
  is_active: boolean;
  api_keys_count?: number;
  created_at: string;
}

export interface ApiKey {
  id: number;
  app_id: number;
  app?: { id: number; name: string };
  name: string;
  key_prefix: string;
  allowed_providers: string[] | null;
  allowed_models: string[] | null;
  spend_limit: Usd | null;
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
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  appId: number | null;
  messages: ChatMessage[];
  updatedAt: number;
}
