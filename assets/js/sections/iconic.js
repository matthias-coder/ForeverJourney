import { playerTime } from '../data.js';
import { fmtDateShort } from '../format.js';
import { spreadsFrom, tableBlocks } from './spreads.js';

// state.iconic.moments: object (id -> {count, first}) or array of {id, count, first}.
export function iconicRows(record) {
  const m = record.state?.iconic?.moments;
  if (!m || typeof m !== 'object') return [];
  const list = Array.isArray(m) ? m : Object.entries(m).map(([id, v]) => ({ id, ...v }));
  return list.map((v) => ({ id: v.id, count: v.count ?? 1, first: v.first }))
    .sort((a, b) => (a.first?.time ?? Infinity) - (b.first?.time ?? Infinity));
}

export function buildIconicPages(record, ctx) {
  const rows = iconicRows(record);
  if (!rows.length) return [];
  const off = playerTime(record);
  return spreadsFrom(tableBlocks(['Moment', 'Anzahl', 'Erstmals'], rows.map((r) => [
    r.id, r.count, r.first?.time != null ? fmtDateShort(r.first.time, off) : '–',
  ]), 'iconic'), 'Ikonische Momente', ctx);
}
