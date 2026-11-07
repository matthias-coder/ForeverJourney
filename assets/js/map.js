// Schematic map rendering (no Blizzard map art): paper tone, zone title, light grid, trail and markers.
const NS = 'http://www.w3.org/2000/svg';
const inRange = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;

// Groups journey segments by the mapID of their first point; drops invalid points,
// segments with < 2 valid points and maps unknown in record.maps.
export function segmentsByMap(record) {
  const segs = record.lists?.journeySegments ?? [];
  const ghosts = record.lists?.journeyGhost ?? [];
  const out = new Map();
  segs.forEach((seg, i) => {
    if (!Array.isArray(seg) || !seg.length) return;
    const mapID = Number(seg[0]?.[1]);
    if (!Object.hasOwn(record.maps ?? {}, String(mapID))) return;
    const pts = seg.filter((p) => Array.isArray(p) && Number(p[1]) === mapID && inRange(p[2]) && inRange(p[3]));
    if (pts.length < 2) return;
    if (!out.has(mapID)) out.set(mapID, { segments: [], ghost: [] });
    out.get(mapID).segments.push(pts);
    out.get(mapID).ghost.push(Boolean(ghosts[i]));
  });
  return out;
}

function svg(tag, attrs, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs ?? {})) n.setAttribute(k, String(v));
  if (text != null) n.textContent = text;
  return n;
}

const KIND_COLOR = { start: '#3e6b3a', level: '#3e6b3a', death: '#8a2b1d' };

export function renderMap(record, mapID, { markers = [], width = 520, height = 360 } = {}) {
  const root = svg('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', role: 'img', class: 'schematic-map' });
  const name = record.maps?.[String(mapID)]?.name ?? `Karte ${mapID}`;
  root.appendChild(svg('title', {}, `Karte: ${name}`));
  const top = 34, pad = 14;
  const mx = pad, my = top, mw = width - 2 * pad, mh = height - top - pad;
  root.appendChild(svg('rect', { x: 0, y: 0, width, height, fill: '#efe0bb', stroke: '#b9a27a', 'stroke-width': 2, rx: 4 }));
  root.appendChild(svg('text', { x: width / 2, y: 24, 'text-anchor': 'middle', 'font-size': 20, 'font-family': 'IM Fell English SC, serif', fill: '#2b1d12' }, name));
  root.appendChild(svg('rect', { x: mx, y: my, width: mw, height: mh, fill: '#f3e7c9', stroke: '#b9a27a' }));
  for (let i = 1; i < 10; i++) {
    root.appendChild(svg('line', { x1: mx + (mw * i) / 10, y1: my, x2: mx + (mw * i) / 10, y2: my + mh, stroke: '#b9a27a', 'stroke-width': 0.5, opacity: 0.45 }));
    root.appendChild(svg('line', { x1: mx, y1: my + (mh * i) / 10, x2: mx + mw, y2: my + (mh * i) / 10, stroke: '#b9a27a', 'stroke-width': 0.5, opacity: 0.45 }));
  }
  // Compass needle, top right inside the map.
  const cx = mx + mw - 28, cy = my + 30;
  root.appendChild(svg('path', { d: `M${cx} ${cy - 18} L${cx + 5} ${cy} L${cx} ${cy + 18} L${cx - 5} ${cy} Z`, fill: '#8a7a5a', opacity: 0.6 }));
  root.appendChild(svg('text', { x: cx, y: cy - 21, 'text-anchor': 'middle', 'font-size': 11, fill: '#5a4634' }, 'N'));
  const X = (x) => mx + x * mw, Y = (y) => my + y * mh;
  const data = segmentsByMap(record).get(Number(mapID));
  data?.segments.forEach((seg, i) => {
    const d = seg.map((p, j) => `${j ? 'L' : 'M'}${X(p[2]).toFixed(1)} ${Y(p[3]).toFixed(1)}`).join(' ');
    const ghost = data.ghost[i];
    const attrs = { d, fill: 'none', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: ghost ? 'trail ghost' : 'trail' };
    attrs.stroke = ghost ? '#2f4f7a' : '#6b3b22';
    if (ghost) attrs['stroke-dasharray'] = '6 5';
    root.appendChild(svg('path', attrs));
  });
  for (const m of markers.filter((k) => inRange(k.x) && inRange(k.y))) {
    const g = svg('g', { class: `marker ${m.kind}` });
    const px = X(m.x), py = Y(m.y);
    g.appendChild(svg('circle', { cx: px, cy: py, r: m.kind === 'death' ? 5 : 4.5, fill: KIND_COLOR[m.kind] ?? '#2b1d12', stroke: '#f3e7c9', 'stroke-width': 1.5 }));
    if (m.label) {
      const right = px < mx + mw * 0.7;
      g.appendChild(svg('text', { x: right ? px + 8 : px - 8, y: py - 7, 'text-anchor': right ? 'start' : 'end', 'font-size': 13, fill: KIND_COLOR[m.kind] ?? '#2b1d12', stroke: '#f3e7c9', 'stroke-width': 3, 'paint-order': 'stroke' }, m.label));
    }
    root.appendChild(g);
  }
  return root;
}

// Legend as SVG: swatch + German label per row.
export function renderLegend({ ghost = false, level = true, death = false } = {}) {
  const items = [['trail', 'Wegstrecke'], ...(ghost ? [['ghost', 'Geisterlauf']] : []), ['start', 'Start'],
    ...(level ? [['level', 'Stufenaufstieg']] : []), ...(death ? [['death', 'Tod †']] : [])];
  const h = items.length * 24 + 4;
  const root = svg('svg', { viewBox: `0 0 220 ${h}`, width: 150, class: 'map-legend' });
  items.forEach(([k, label], i) => {
    const y = 14 + i * 24;
    if (k === 'trail' || k === 'ghost') {
      const a = { x1: 4, y1: y, x2: 30, y2: y, stroke: k === 'ghost' ? '#2f4f7a' : '#6b3b22', 'stroke-width': 2.5 };
      if (k === 'ghost') a['stroke-dasharray'] = '6 5';
      root.appendChild(svg('line', a));
    } else root.appendChild(svg('circle', { cx: 17, cy: y, r: 5, fill: KIND_COLOR[k] }));
    root.appendChild(svg('text', { x: 40, y: y + 5, 'font-size': 15, fill: '#2b1d12' }, label));
  });
  return root;
}
