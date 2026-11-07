import { el } from '../dom.js';
import { deathsOf, playerTime } from '../data.js';
import { fmtDateShort } from '../format.js';
import { spreadsFrom } from './spreads.js';
import { renderMap } from '../map.js';

const CAUSES = { drowned: 'Ertrunken', fatigue: 'Erschöpfung', fall: 'Sturz', guard: 'Wache', pvp: 'Spieler' };
const ROWS_PER_TABLE = 10;
export const causeLabel = (cause) => (Object.hasOwn(CAUSES, cause ?? '') ? CAUSES[cause] : 'Gegner');

export function deathRows(record) {
  const off = playerTime(record);
  return deathsOf(record).map((d, i) => ({
    n: i + 1,
    date: d.time != null ? fmtDateShort(d.time, off) : '–',
    level: d.level,
    place: [d.zone, d.subZone].filter(Boolean).join(' · ') || '–',
    cause: d.cause ? causeLabel(d.cause) : (d.killerName || causeLabel(undefined)),
  }));
}

function summaryLine(record) {
  const causes = record.state?.combat?.deathCauses;
  if (!causes || typeof causes !== 'object') return null;
  const parts = Object.entries(causes).filter(([, n]) => n > 0).map(([k, n]) => `${causeLabel(k)} ${n}`);
  return parts.length ? `Todesursachen: ${parts.join(' · ')}` : null;
}

export function buildDeathsPages(record, ctx) {
  const rows = deathRows(record);
  if (!rows.length) return [];
  const blocks = [];
  const sum = summaryLine(record);
  if (sum) blocks.push({ el: el('p', 'small', sum), kind: 'summary' });
  // Chunked so the paginator can break between tables; every chunk repeats the header.
  for (let i = 0; i < rows.length; i += ROWS_PER_TABLE) {
    const table = el('table', 'tbl');
    const head = el('tr');
    for (const h of ['#', 'Datum', 'Stufe', 'Ort', 'Ursache']) head.appendChild(el('th', null, h));
    table.appendChild(head);
    for (const r of rows.slice(i, i + ROWS_PER_TABLE)) {
      const tr = el('tr');
      for (const c of [r.n, r.date, r.level, r.place, r.cause]) tr.appendChild(el('td', null, String(c)));
      table.appendChild(tr);
    }
    blocks.push({ el: table, kind: 'deaths' });
  }
  return withDeathMap(record, spreadsFrom(blocks, 'Tode', ctx));
}

// Map of the zone with the most located deaths goes on the right page of the first spread
// (replacing its ornament; if that page holds content, a spread of its own follows).
function withDeathMap(record, spreads) {
  const located = deathsOf(record).filter((d) => typeof d.x === 'number' && typeof d.y === 'number'
    && Object.hasOwn(record.maps ?? {}, String(d.mapID)));
  if (!located.length || !spreads.length) return spreads;
  const counts = new Map();
  for (const d of located) counts.set(d.mapID, (counts.get(d.mapID) ?? 0) + 1);
  const mapID = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const markers = located.filter((d) => d.mapID === mapID).map((d) => ({ x: d.x, y: d.y, kind: 'death', label: '†' }));
  const page = el('div');
  page.appendChild(el('h3', null, 'Todesorte'));
  page.appendChild(renderMap(record, mapID, { markers, width: 340, height: 300 }));
  if (spreads[0].right.classList.contains('orn')) spreads[0].right = page;
  else spreads.splice(1, 0, { title: 'Tode', left: page, right: el('div', 'orn', '✦ ✦ ✦') });
  return spreads;
}
