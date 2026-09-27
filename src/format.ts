import type { OrderStatus } from './types';

const faDigits = new Intl.NumberFormat('fa-IR');

export const faNumber = (value: number | null | undefined): string =>
  value === null || value === undefined ? '—' : faDigits.format(value);

/** USD strings keep Latin digits; sub-cent amounts (single requests) keep up to 6 decimals. */
export function usd(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  const digits = Math.abs(amount) >= 0.01 || amount === 0 ? 2 : 6;
  const text = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  });
  return `${amount < 0 ? '-' : ''}$${text}`;
}

/** Compact token counts: 1.2M, 35K. */
export function tokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
}

const jalaliDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'Asia/Tehran',
});
const jalaliDateTime = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Tehran',
});
const jalaliDay = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  month: 'short',
  day: 'numeric',
  timeZone: 'Asia/Tehran',
});

export const faDate = (value: string | null): string =>
  value ? jalaliDate.format(new Date(value)) : '—';
export const faDateTime = (value: string | null): string =>
  value ? jalaliDateTime.format(new Date(value)) : '—';
/** "2026-09-27" (a UTC day from the API) → "۵ مهر". */
export const faDay = (day: string): string => jalaliDay.format(new Date(`${day}T12:00:00Z`));

export const orderStatuses: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: 'در انتظار پرداخت', color: 'warning' },
  paid: { label: 'پرداخت‌شده', color: 'positive' },
  cancelled: { label: 'لغوشده', color: 'grey' },
  failed: { label: 'ناموفق', color: 'negative' },
};

export const transactionTypes: Record<string, string> = {
  topup: 'شارژ',
  adjustment: 'اصلاح دستی',
  refund: 'بازپرداخت',
};

/** Base URL apps use for the gateway (same origin as the web app unless configured). */
export const gatewayUrl = (): string =>
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) || window.location.origin;
