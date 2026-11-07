import { fmtDuration } from '../format.js';
import { spreadsFrom, tableBlocks } from './spreads.js';

const DUR = fmtDuration;
const KNOWN = {
  jumps: ['Sprünge'], chatTotal: ['Chatzeilen'], emoteTotal: ['Emotes'], bagFull: ['Volle Taschen'],
  mailSent: ['Briefe verschickt'], activeSec: ['Aktive Zeit', DUR], aliveSec: ['Am Stück lebendig', DUR],
  bestAlive: ['Längste Zeit ohne Tod', DUR], combatSec: ['Zeit im Kampf', DUR],
  craftSec: ['Zeit beim Handwerk', DUR], ghostSec: ['Zeit als Geist', DUR],
  aliveActSec: ['Aktiv am Stück lebendig', DUR], bestAliveAct: ['Längste aktive Zeit ohne Tod', DUR],
  mapOpened: ['Karte geöffnet'],
};

// Known scalar keys first (German labels), then remaining scalars under their raw key.
export function funRows(record) {
  const fun = record.state?.fun ?? {};
  const scalar = (k) => fun[k] != null && typeof fun[k] !== 'object';
  const isSec = (k) => k.endsWith('Sec');
  const known = Object.keys(KNOWN).filter(scalar)
    .map((k) => ({ label: KNOWN[k][0], value: KNOWN[k][1] ? KNOWN[k][1](fun[k]) : fun[k] }));
  const rest = Object.keys(fun).filter((k) => scalar(k) && !Object.hasOwn(KNOWN, k))
    .map((k) => ({ label: k, value: typeof fun[k] !== 'number' ? fun[k] : isSec(k) ? fmtDuration(fun[k]) : Number.isInteger(fun[k]) ? fun[k] : Math.round(fun[k] * 100) / 100 }));
  return [...known, ...rest];
}

export function buildFunPages(record, ctx) {
  const rows = funRows(record);
  if (!rows.length) return [];
  return spreadsFrom(tableBlocks(['Statistik', 'Wert'], rows.map((r) => [r.label, r.value]), 'fun', 12), 'Unnütze Statistiken', ctx);
}
