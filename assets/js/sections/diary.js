import { el } from '../dom.js';
import { buildDays } from '../diary.js';
import { paginate } from '../paginate.js';
import { fmtDuration, fmtMonthKey, fmtTime } from '../format.js';
import { playerTime } from '../data.js';

const TAGS = { level: ['lvl', 'Stufe'], death: ['death', 'Tod'], dungeon: ['dng', 'Verlies'] };

function photoBlock(item) {
  const fig = el('div', 'shot');
  const a = el('a');
  a.href = item.shot.file; // Task 5 replaces this with a lightbox
  a.target = '_blank';
  a.rel = 'noopener';
  const img = el('img', 'photo');
  img.loading = 'lazy';
  img.alt = item.text;
  img.src = item.shot.thumb ?? item.shot.file;
  // Reserve the height up front so measuring works before the lazy image has loaded.
  if (item.shot.width && item.shot.height) img.style.aspectRatio = `${item.shot.width} / ${item.shot.height}`;
  a.appendChild(img);
  fig.appendChild(a);
  fig.appendChild(el('div', 'cap', item.text));
  return { el: fig, kind: 'shot' };
}

function itemBlock(item, off) {
  if (item.kind === 'shot') return photoBlock(item);
  if (item.kind === 'journal') {
    const wrap = el('div', 'entry');
    wrap.appendChild(el('b', null, item.text));
    if (item.quote) wrap.appendChild(el('div', 'quote', item.quote));
    return { el: wrap, kind: 'journal' };
  }
  const p = el('p', 'entry');
  p.appendChild(el('span', 'small', `${fmtTime(item.time, off)} `));
  if (TAGS[item.kind]) p.appendChild(el('span', `tag ${TAGS[item.kind][0]}`, TAGS[item.kind][1]));
  p.appendChild(document.createTextNode(item.text));
  return { el: p, kind: item.kind };
}

export function diaryBlocks(record) {
  const off = playerTime(record);
  const days = buildDays(record);
  const blocks = [];
  let month = null;
  for (const day of days) {
    const m = day.key.slice(0, 7);
    if (m !== month) {
      month = m;
      const mDays = days.filter((d) => d.key.startsWith(m));
      const lo = Math.min(...mDays.map((d) => d.minLevel ?? Infinity));
      const hi = Math.max(...mDays.map((d) => d.maxLevel ?? -Infinity));
      const span = Number.isFinite(lo) ? ` · Stufe ${lo === hi ? lo : `${lo}–${hi}`}` : '';
      blocks.push({ el: el('h3', null, `${fmtMonthKey(day.key)}${span}`), kind: 'month' });
    }
    const head = el('div', 'dayhead');
    head.appendChild(el('b', null, day.date));
    const meta = [day.zones.join(', '), day.playedSeconds ? `Spielzeit ${fmtDuration(day.playedSeconds)}` : '']
      .filter(Boolean).join(' · ');
    if (meta) head.appendChild(el('div', 'small', meta));
    blocks.push({ el: head, kind: 'day' });
    for (const item of day.items) blocks.push(itemBlock(item, off));
  }
  return blocks;
}

// Single printed pages are paired into spreads (odd count -> ornament on the empty right page).
export function buildDiaryPages(record, ctx) {
  const blocks = diaryBlocks(record);
  if (!blocks.length) return [];
  blocks.unshift({ el: el('h2', null, 'Tagebuch'), kind: 'title' });
  const singles = paginate(blocks, ctx.pageHeight, ctx.measure).map((page) => {
    const node = el('div');
    for (const b of page) node.appendChild(b.el);
    return node;
  });
  const spreads = [];
  for (let i = 0; i < singles.length; i += 2) {
    const right = singles[i + 1] ?? el('div', 'orn', '✦ ✦ ✦');
    spreads.push({ title: 'Tagebuch', left: singles[i], right });
  }
  return spreads;
}
