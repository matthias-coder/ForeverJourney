const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MONTHS_SHORT = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];
const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const pad = (n) => String(n).padStart(2, '0');
const local = (ts, utcOffset) => new Date((ts + utcOffset) * 1000);

export function fmtDate(ts, utcOffset) {
  const d = local(ts, utcOffset);
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
export function fmtDateShort(ts, utcOffset) {
  const d = local(ts, utcOffset);
  return `${d.getUTCDate()}. ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
export function fmtTime(ts, utcOffset) {
  const d = local(ts, utcOffset);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
export function dayKey(ts, utcOffset) {
  const d = local(ts, utcOffset);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
export function fmtDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  if (s >= 60) return `${Math.floor(s / 60)} min`;
  return `${s} s`;
}
export function fmtGold(copper) {
  const c = Math.max(0, Math.floor(copper));
  const g = Math.floor(c / 10000), s = Math.floor((c % 10000) / 100), k = c % 100;
  const parts = [];
  if (g) parts.push(`${g}g`);
  if (g || s) parts.push(g ? `${pad(s)}s` : `${s}s`);
  parts.push(g || s ? `${pad(k)}k` : `${k}k`);
  return parts.join(' ');
}
// 'YYYY-MM-DD' (as made by dayKey) -> 'November 2026'
export function fmtMonthKey(key) {
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}
