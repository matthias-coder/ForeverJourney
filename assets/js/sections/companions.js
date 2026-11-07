import { spreadsFrom, tableBlocks } from './spreads.js';

// Most shared groups first; `guild` only present when known.
export function companionRows(record) {
  const people = record.state?.companions?.people;
  if (!people || typeof people !== 'object') return [];
  return Object.entries(people).map(([key, p]) => {
    const row = { name: p?.name ?? key, groups: p?.groups ?? 0 };
    if (p?.guild) row.guild = p.guild;
    return row;
  }).sort((a, b) => b.groups - a.groups);
}

export function buildCompanionsPages(record, ctx) {
  const rows = companionRows(record);
  if (!rows.length) return [];
  return spreadsFrom(tableBlocks(['Name', 'Gemeinsame Gruppen', 'Gilde'],
    rows.map((r) => [r.name, r.groups, r.guild ?? '–']), 'companions', 12), 'Gefährten', ctx);
}
