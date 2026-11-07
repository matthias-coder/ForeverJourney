import { fmtGold } from '../format.js';
import { linePath } from '../chart.js';
import { spreadsFrom, tableBlocks } from './spreads.js';

const SRC = {
  loot: 'Beute', quest: 'Quests', merchant: 'Händler', repair: 'Reparatur', mail: 'Post',
  trade: 'Handel', auction: 'Auktionshaus', train: 'Ausbildung', other: 'Sonstiges',
};
const NS = 'http://www.w3.org/2000/svg';
const srcLabel = (k) => (Object.hasOwn(SRC, k) ? SRC[k] : k);

// goldHistory ("YYYY-MM-DD" -> {last}) -> [midnight UTC seconds, copper][] sorted by time.
export function goldSeries(record) {
  return Object.entries(record.goldHistory ?? {})
    .map(([day, v]) => [Date.parse(`${day}T00:00:00Z`) / 1000, v?.last])
    .filter(([t, v]) => Number.isFinite(t) && Number.isFinite(v))
    .sort((a, b) => a[0] - b[0]);
}

export function goldByLevelRows(record) {
  const byLevel = record.state?.goldByLevel ?? {};
  return Object.keys(byLevel).map(Number).filter(Number.isFinite).sort((a, b) => a - b).map((level) => {
    const g = byLevel[level] ?? {};
    return { level, earned: g.earned ?? 0, spent: g.spent ?? 0, src: g.src ?? {} };
  });
}

function svgNode(parent, tag, attrs, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  parent.appendChild(n);
  return n;
}

function chart(series) {
  const W = 420, H = 150, LEFT = 110, PAD = 14;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'goldchart');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Goldverlauf');
  const vals = series.map((p) => p[1]);
  svgNode(svg, 'text', { x: 2, y: 18, 'font-size': 18, fill: 'currentColor' }, fmtGold(Math.max(...vals)));
  svgNode(svg, 'text', { x: 2, y: H - 4, 'font-size': 18, fill: 'currentColor' }, fmtGold(Math.min(...vals)));
  const g = svgNode(svg, 'g', { transform: `translate(${LEFT},0)` });
  const d = linePath(series, W - LEFT, H, PAD);
  if (series.length === 1) {
    const [cx, cy] = d.slice(1).split(',');
    svgNode(g, 'circle', { cx, cy, r: 4, fill: 'currentColor' });
  } else {
    svgNode(g, 'path', { d, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linejoin': 'round' });
  }
  return svg;
}

export function buildGoldPages(record, ctx) {
  const series = goldSeries(record);
  const rows = goldByLevelRows(record);
  if (!series.length && !rows.length) return [];
  const blocks = [];
  if (series.length) blocks.push({ el: chart(series), kind: 'chart' });
  const table = rows.map((r) => [
    r.level, fmtGold(r.earned), fmtGold(r.spent),
    Object.entries(r.src).filter(([, v]) => (v?.e ?? 0) > 0)
      .map(([k, v]) => `${srcLabel(k)} ${fmtGold(v.e)}`).join(' · ') || '–',
  ]);
  blocks.push(...tableBlocks(['Stufe', 'Verdient', 'Ausgegeben', 'Quellen'], table, 'gold', 8));
  return spreadsFrom(blocks, 'Schatzkammer', ctx);
}
