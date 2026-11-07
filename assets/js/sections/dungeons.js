import { el } from '../dom.js';
import { playerTime } from '../data.js';
import { fmtDateShort, fmtDuration } from '../format.js';
import { qualityColor } from '../names.js';
import { parseItemLink, spreadsFrom } from './spreads.js';

export function dungeonRows(record) {
  const off = playerTime(record);
  return (record.lists?.dungeons ?? []).map((d) => ({
    name: d.dungeon ?? d.name ?? 'Verlies',
    date: d.entered != null ? fmtDateShort(d.entered, off) : '–',
    duration: d.duration != null ? fmtDuration(d.duration) : '–',
    bosses: Array.isArray(d.bosses) ? d.bosses.length : (d.bosses ?? 0),
    deaths: d.deaths ?? 0,
    completed: Boolean(d.completed),
    fullClear: Boolean(d.fullClear),
    loot: (d.loot ?? d.fullLoot ?? []).map((l) => ({
      ...parseItemLink(l.itemLink ?? l.item, qualityColor(l.quality)),
      quantity: l.quantity ?? 1,
      player: l.player,
    })),
  }));
}

export function buildDungeonPages(record, ctx) {
  const blocks = dungeonRows(record).map((r) => {
    const box = el('div', 'entry');
    box.appendChild(el('b', null, r.name));
    const meta = [r.date, `Dauer ${r.duration}`, `Bosse ${r.bosses}`, `Tode ${r.deaths}`,
      `vollendet ${r.completed ? '✓' : '–'}`, r.fullClear ? 'komplett geräumt' : ''].filter(Boolean).join(' · ');
    box.appendChild(el('div', 'small', meta));
    if (r.loot.length) {
      const ul = el('ul', 'gear');
      for (const l of r.loot) {
        const li = el('li');
        const s = el('span', null, l.name);
        s.style.color = l.color;
        li.appendChild(s);
        const extra = [l.quantity > 1 ? `×${l.quantity}` : '', l.player ? `(${l.player})` : ''].filter(Boolean).join(' ');
        if (extra) li.appendChild(document.createTextNode(` ${extra}`));
        ul.appendChild(li);
      }
      box.appendChild(ul);
    }
    return { el: box, kind: 'dungeon' };
  });
  return spreadsFrom(blocks, 'Verliese', ctx);
}
