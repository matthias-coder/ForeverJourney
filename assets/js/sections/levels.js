import { el } from '../dom.js';
import { playerTime } from '../data.js';
import { fmtDateShort, fmtDuration } from '../format.js';
import { qualityColor } from '../names.js';
import { parseItemLink, spreadsFrom } from './spreads.js';

// Equipment from a snapshot (object or array of items) -> [{ slot, name, color }].
function itemsOf(src) {
  const out = [];
  const add = (slot, v) => {
    if (v == null || v === false) return;
    const link = typeof v === 'string' ? v : (v.l ?? v.itemLink ?? v.link ?? v.name);
    if (!link) return;
    const { name, color } = parseItemLink(link, qualityColor(typeof v === 'object' ? v.quality : undefined));
    out.push({ slot: String(slot), name, color });
  };
  if (Array.isArray(src)) src.forEach((v, i) => add(v?.slot ?? v?.slotName ?? i + 1, v));
  else if (src && typeof src === 'object') Object.entries(src).forEach(([k, v]) => add(k, v));
  return out;
}

function equipmentOf(state, n) {
  const snap = itemsOf(state.levelSnapshots?.[n]?.equipment);
  return snap.length ? snap : itemsOf(state.gearByLevel?.[n]?.slots);
}

export function levelRows(record) {
  const state = record.state ?? {};
  const off = playerTime(record);
  return Object.keys(state.levels ?? {}).map(Number).sort((a, b) => a - b).map((n) => {
    const lv = state.levels[n];
    const afk = state.afk?.stationary?.byLevel?.[n];
    return {
      level: n,
      duration: lv.duration != null ? fmtDuration(lv.duration) : '–',
      afk: afk != null ? fmtDuration(afk) : null,
      zone: lv.zone ?? '–',
      completed: lv.completed != null ? fmtDateShort(lv.completed, off) : 'läuft noch',
      equipment: equipmentOf(state, n),
    };
  });
}

export function buildLevelPages(record, ctx) {
  const blocks = levelRows(record).map((r) => {
    const box = el('div', 'entry');
    box.appendChild(el('b', null, `Stufe ${r.level}`));
    const meta = [`Dauer ${r.duration}`, r.afk ? `AFK ${r.afk}` : '', r.zone, r.completed].filter(Boolean).join(' · ');
    box.appendChild(el('div', 'small', meta));
    if (!r.equipment.length) box.appendChild(el('div', 'small', 'keine Ausrüstung erfasst'));
    else {
      const ul = el('ul', 'gear');
      for (const e of r.equipment) {
        const li = el('li', null, `${e.slot}: `);
        const s = el('span', null, e.name);
        s.style.color = e.color;
        li.appendChild(s);
        ul.appendChild(li);
      }
      box.appendChild(ul);
    }
    return { el: box, kind: 'level' };
  });
  return spreadsFrom(blocks, 'Levelaufstiege', ctx);
}
