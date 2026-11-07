import { fmtDateShort, fmtDuration } from '../format.js';
import { playerTime } from '../data.js';
import { spreadsFrom, tableBlocks } from './spreads.js';

// people[lowername] = { name, tier, first:{time}, together (s), dungeons, raids, bosses }.
export function companionRows(record) {
  const people = record.state?.companions?.people;
  if (!people || typeof people !== 'object') return [];
  return Object.entries(people).map(([key, p]) => ({
    name: p?.name ?? key, tier: p?.tier, together: p?.together ?? 0,
    dungeons: p?.dungeons ?? 0, raids: p?.raids ?? 0, bosses: p?.bosses ?? 0, firstTime: p?.first?.time,
  })).sort((a, b) => b.together - a.together || b.dungeons - a.dungeons);
}

const TIER = { friend: 'Freund', guild: 'Gilde' };

export function buildCompanionsPages(record, ctx) {
  const rows = companionRows(record);
  if (!rows.length) return [];
  const off = playerTime(record);
  return spreadsFrom(tableBlocks(['Name', 'Beziehung', 'Zeit zusammen', 'Verliese', 'Raids', 'Bosse', 'Seit'],
    rows.map((r) => [r.name, TIER[r.tier] ?? r.tier ?? '–', fmtDuration(r.together), r.dungeons, r.raids, r.bosses,
      r.firstTime != null ? fmtDateShort(r.firstTime, off) : '–']), 'companions', 12), 'Gefährten', ctx);
}
