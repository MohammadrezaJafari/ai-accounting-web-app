import type { Conversation } from './types';

/** Chat history lives only in this browser, one list per user. */
const conversationsKey = (userId: number) => `ai_accounting_conversations_${userId}`;
const preferencesKey = (userId: number) => `ai_accounting_chat_${userId}`;
const MAX_CONVERSATIONS = 100;

export interface ChatPreferences {
  appId: number | null;
  model: string | null;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: history just isn't kept.
  }
}

export function loadConversations(userId: number): Conversation[] {
  const list = read<unknown>(conversationsKey(userId), []);
  return Array.isArray(list) ? (list as Conversation[]) : [];
}

export const saveConversations = (userId: number, list: Conversation[]): void =>
  write(conversationsKey(userId), list.slice(0, MAX_CONVERSATIONS));

export const loadChatPreferences = (userId: number): ChatPreferences =>
  read<ChatPreferences>(preferencesKey(userId), { appId: null, model: null });

export const saveChatPreferences = (userId: number, preferences: ChatPreferences): void =>
  write(preferencesKey(userId), preferences);

export const newConversationId = (): string =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
