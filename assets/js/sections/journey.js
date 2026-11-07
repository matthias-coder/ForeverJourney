import { el } from '../dom.js';
import { playerTime, deathsOf } from '../data.js';
import { fmtDate } from '../format.js';
import { segmentsByMap, renderMap, renderLegend } from '../map.js';

const TITLE = 'Reiseroute';

export function markersFor(record, mapID, data) {
  const markers = [];
  const first = data?.segments?.[0]?.[0];
  if (first) markers.push({ x: first[2], y: first[3], kind: 'start', label: 'Start' });
  const levels = [];
  for (const [lvl, s] of Object.entries(record.state?.levels ?? {})) {
    if (Number(s?.mapID) === Number(mapID) && typeof s.x === 'number' && typeof s.y === 'number') {
      levels.push({ x: s.x, y: s.y, kind: 'level', label: `Stufe ${lvl}`, n: Number(lvl) });
    }
  }
  markers.push(...levels.sort((a, b) => a.n - b.n));
  for (const d of deathsOf(record)) {
    if (Number(d.mapID) === Number(mapID) && typeof d.x === 'number' && typeof d.y === 'number') {
      markers.push({ x: d.x, y: d.y, kind: 'death', label: '†' });
    }
  }
  return markers;
}

export function buildJourneyPages(record) {
  const off = playerTime(record);
  const maps = [...segmentsByMap(record).entries()].map(([mapID, data]) => {
    const times = data.segments.flat().map((p) => p[0]).filter((t) => typeof t === 'number');
    return { mapID, data, first: Math.min(...times), last: Math.max(...times) };
  }).sort((a, b) => a.first - b.first);
  return maps.map(({ mapID, data, first, last }) => {
    const markers = markersFor(record, mapID, data);
    const left = el('div');
    left.appendChild(el('h2', null, TITLE));
    left.appendChild(renderMap(record, mapID, { markers, width: 340, height: 300 }));
    const right = el('div');
    right.appendChild(el('h3', null, record.maps[String(mapID)].name));
    right.appendChild(renderLegend({
      ghost: data.ghost.some(Boolean),
      level: markers.some((m) => m.kind === 'level'),
      death: markers.some((m) => m.kind === 'death'),
    }));
    const stats = el('div', 'small');
    const points = data.segments.reduce((n, s) => n + s.length, 0);
    for (const t of [`Punkte: ${points}`, `Wegstrecken: ${data.segments.length}`,
      `Erster Besuch: ${fmtDate(first, off)}`, `Letzter Besuch: ${fmtDate(last, off)}`]) stats.appendChild(el('p', null, t));
    right.appendChild(stats);
    return { title: TITLE, left, right };
  });
}
