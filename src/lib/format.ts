const TZ = 'Europe/Moscow';

export const fmtNum = (n: number) => new Intl.NumberFormat('ru-RU').format(n);

export function fmtCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace('.', ',')} млн`;
  if (n >= 10_000) return `${Math.round(n / 1000)} тыс.`;
  return fmtNum(n);
}

export const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, day: 'numeric', month: 'long' }).format(new Date(d));

export const fmtDateShort = (d: Date | string) =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, day: 'numeric', month: 'short' }).format(new Date(d)).replace('.', '');

export const fmtDateTime = (d: Date | string) =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(d));

export function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

export function timeAgo(d: Date | string | null | undefined) {
  if (!d) return 'нет данных';
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'только что';
  if (s < 3600) return `${Math.floor(s / 60)} мин назад`;
  if (s < 86400) return `${Math.floor(s / 3600)} ч назад`;
  const days = Math.floor(s / 86400);
  if (days === 1) return 'вчера';
  if (days < 30) return `${days} ${plural(days, 'день', 'дня', 'дней')} назад`;
  return fmtDate(d);
}

export const daysSince = (d: Date | string | null | undefined) =>
  d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null;

export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase() || '?';

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export const tzLabel = (tz: number) => (tz ? `МСК+${tz}` : 'МСК');
