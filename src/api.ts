import type {
  AiModel,
  ChatMessage,
  ApiKey,
  ApiKeyDraft,
  App,
  Catalog,
  Dashboard,
  Order,
  Paginated,
  UsageLog,
  User,
  WalletTransaction,
} from './types';

export const TOKEN_KEY = 'ai_accounting_token';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
  }

  /** The first validation message, or the general message. */
  get first(): string {
    return Object.values(this.errors)[0]?.[0] ?? this.message;
  }
}

function storedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');
  const token = storedToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`/api/v1${path}`, { ...options, headers });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, body.message || 'درخواست انجام نشد.', body.errors || {});
  }
  return body as T;
}

const post = <T>(path: string, payload: unknown = {}): Promise<T> =>
  request<T>(path, { method: 'POST', body: JSON.stringify(payload) });
const patch = <T>(path: string, payload: unknown): Promise<T> =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(payload) });
const destroy = (path: string) => request<{ ok: boolean }>(path, { method: 'DELETE' });

/** Human message for any thrown value. */
export const errorMessage = (exception: unknown, fallback = 'اتصال برقرار نشد.'): string =>
  exception instanceof ApiError ? exception.first : fallback;

export const register = (name: string, email: string, password: string) =>
  post<{ token: string; user: User }>('/auth/register', {
    name,
    email,
    password,
    password_confirmation: password,
  });
export const login = (email: string, password: string) =>
  post<{ token: string; user: User }>('/auth/login', { email, password });
export const logout = () => post<{ ok: boolean }>('/auth/logout');
export const me = async () => (await request<{ data: User }>('/auth/me')).data;

export const dashboard = (days = 30) => request<Dashboard>(`/dashboard?days=${days}`);

export const listModels = async (appId?: number) =>
  (await request<{ data: AiModel[] }>(`/catalog/models${appId ? `?app_id=${appId}` : ''}`)).data;
export const catalog = () => request<Catalog>('/catalog/packages');

export const listApps = async () => (await request<{ data: App[] }>('/apps')).data;
export const getApp = async (id: number) => (await request<{ data: App }>(`/apps/${id}`)).data;
export const createApp = async (name: string, description: string | null) =>
  (await post<{ data: App }>('/apps', { name, description })).data;
export const updateApp = async (
  id: number,
  payload: Partial<Pick<App, 'name' | 'description' | 'is_active'>>,
) => (await patch<{ data: App }>(`/apps/${id}`, payload)).data;
export const deleteApp = (id: number) => destroy(`/apps/${id}`);

export const listAllKeys = async () => (await request<{ data: ApiKey[] }>('/keys')).data;
export const listKeys = async (appId: number) =>
  (await request<{ data: ApiKey[] }>(`/apps/${appId}/keys`)).data;
export const createKey = (appId: number, draft: ApiKeyDraft) =>
  post<{ data: ApiKey; plain_key: string }>(`/apps/${appId}/keys`, draft);
export const updateKey = async (appId: number, keyId: number, draft: Partial<ApiKeyDraft>) =>
  (await patch<{ data: ApiKey }>(`/apps/${appId}/keys/${keyId}`, draft)).data;
export const deleteKey = (appId: number, keyId: number) => destroy(`/apps/${appId}/keys/${keyId}`);

export const listTransactions = (appId: number, page = 1) =>
  request<Paginated<WalletTransaction>>(`/apps/${appId}/transactions?page=${page}`);

export const listUsage = (params: URLSearchParams) =>
  request<Paginated<UsageLog>>(`/usage?${params.toString()}`);

export const listOrders = (page = 1) => request<Paginated<Order>>(`/orders?page=${page}`);
export const createOrder = async (
  payload: { app_id: number; package_id: number } | { app_id: number; amount: string },
) => (await post<{ data: Order }>('/orders', payload)).data;
export const cancelOrder = async (id: number) =>
  (await post<{ data: Order }>(`/orders/${id}/cancel`)).data;

/**
 * Stream a chat completion billed to an app. Calls `onDelta` for every text fragment
 * and resolves when the stream ends (or rejects with ApiError on 4xx/5xx).
 */
export async function streamChat(
  appId: number,
  model: string,
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const headers = new Headers({ Accept: 'text/event-stream', 'Content-Type': 'application/json' });
  const token = storedToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`/api/v1/apps/${appId}/chat/completions`, {
    method: 'POST',
    headers,
    signal: signal ?? null,
    body: JSON.stringify({
      model,
      stream: true,
      messages: messages.map(({ role, content }) => ({ role, content })),
    }),
  });

  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.error?.message || body.message || 'پاسخی دریافت نشد.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const event = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
        const text = event.choices?.[0]?.delta?.content;
        if (text) onDelta(text);
      } catch {
        // Ignore keep-alives and partial lines.
      }
    }
  }
}
