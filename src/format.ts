import type { BudgetPeriod, OrderStatus, OrganizationRole } from './types';

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

export const budgetPeriods: Record<BudgetPeriod, string> = {
  total: 'کل',
  daily: 'روزانه',
  monthly: 'ماهانه',
};

export const organizationRoles: Record<OrganizationRole, { label: string; description: string }> = {
  owner: { label: 'مالک', description: 'همهٔ کارها، از جمله اعضا و دعوت‌ها' },
  developer: { label: 'توسعه‌دهنده', description: 'اپ‌ها، کلیدهای API و سقف کلیدها، چت' },
  billing: { label: 'مالی', description: 'کیف پول، شارژ، سفارش‌ها و سقف هزینهٔ اپ‌ها' },
};

export const agentRunStatuses: Record<string, { label: string; color: string; icon: string }> = {
  queued: { label: 'در صف', color: 'grey', icon: 'schedule' },
  running: { label: 'در حال اجرا', color: 'info', icon: 'autorenew' },
  succeeded: { label: 'گزارش آماده', color: 'positive', icon: 'task_alt' },
  empty: { label: 'خبر تازه نبود', color: 'grey', icon: 'inbox' },
  no_credits: { label: 'اعتبار تمام شده', color: 'warning', icon: 'credit_card_off' },
  failed: { label: 'ناموفق', color: 'negative', icon: 'error_outline' },
};

/** Days of the week as the API numbers them (0 = Sunday), in Iranian week order. */
export const weekDays = [
  { value: 6, label: 'ش' },
  { value: 0, label: 'ی' },
  { value: 1, label: 'د' },
  { value: 2, label: 'س' },
  { value: 3, label: 'چ' },
  { value: 4, label: 'پ' },
  { value: 5, label: 'ج' },
];

/** "ساعت ۸ و ۲۰، شنبه تا چهارشنبه" */
export function scheduleSummary(hours: number[], days: number[]): string {
  if (!hours.length) return 'فقط اجرای دستی';
  const at = `ساعت ${[...hours]
    .sort((a, b) => a - b)
    .map((h) => faNumber(h))
    .join(' و ')}`;
  if (!days.length || days.length === 7) return `هر روز ${at}`;
  const names = weekDays.filter((d) => days.includes(d.value)).map((d) => d.label);
  return `${at} — ${names.join('، ')}`;
}

export const transactionTypes: Record<string, string> = {
  topup: 'شارژ',
  adjustment: 'اصلاح دستی',
  refund: 'بازپرداخت',
  agent_purchase: 'خرید بستهٔ ایجنت',
};

/** Base URL apps use for the gateway (same origin as the web app unless configured). */
export const gatewayUrl = (): string =>
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) || window.location.origin;
