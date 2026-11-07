import { el } from '../dom.js';
import { SECTIONS } from '../router.js';
import { className, raceName } from '../names.js';
import { fmtDate, fmtDuration, fmtGold } from '../format.js';
import { playerTime } from '../data.js';
import { renderPortrait } from '../portrait.js';
import { STATUS_LABELS } from './register.js';

export const SECTION_TITLES = {
  diary: 'Tagebuch', gallery: 'Fotogalerie', deaths: 'Tode', levels: 'Levelaufstiege',
  dungeons: 'Verliese und Beute', gold: 'Schatzkammer', crafts: 'Handwerk', companions: 'Gefährten',
  iconic: 'Ikonische Momente und Erfolge', journey: 'Reiseroute', fun: 'Unnütze Statistiken',
};

// Running page numbers: the chapter opening is spread 1 (pages 1-2), every section page is one
// further spread (two printed pages). Returns { section: number of its first printed page }.
export function firstPageNumbers(pageCounts) {
  const out = {};
  let spreads = 1;
  for (const s of SECTIONS) {
    const n = pageCounts[s] ?? 0;
    if (n <= 0) continue;
    out[s] = spreads * 2 + 1;
    spreads += n;
  }
  return out;
}

const count = (v) => (Array.isArray(v) ? v.length : Object.keys(v ?? {}).length);

export function chapterFacts(record, entry) {
  const off = playerTime(record);
  const st = record.state ?? {};
  const dungeons = record.lists?.dungeons ?? [];
  const gold = Object.values(record.goldHistory ?? {}).sort((a, b) => (a.lastTime ?? 0) - (b.lastTime ?? 0)).at(-1);
  const levels = Object.values(st.levels ?? {});
  const longest = levels.reduce((m, l) => (l.duration > (m?.duration ?? -1) ? l : m), null);
  const afk = longest ? st.afk?.stationary?.byLevel?.[longest.level] : undefined;
  return {
    created: entry.created != null ? fmtDate(entry.created, off) : '–',
    played: fmtDuration(entry.playedSeconds ?? 0),
    deaths: String(entry.deaths ?? 0),
    dungeons: `${dungeons.length} / ${dungeons.filter((d) => d.completed).length}`,
    gold: gold ? fmtGold(gold.last) : '–',
    zones: String(count(st.firstVisitedZones)),
    longest: longest
      ? `Stufe ${longest.level}: ${fmtDuration(longest.duration)}${afk != null ? ` (davon ${fmtDuration(afk)} AFK)` : ''}`
      : '–',
    companions: String(count(st.companions?.people)),
    iconic: String(count(st.iconic?.moments ?? record.iconic?.moments)),
  };
}

export function renderChapter(record, entry, pageCounts, onOpen = () => {}) {
  const f = chapterFacts(record, entry);
  const left = el('div');
  const hero = el('div', 'hero');
  hero.appendChild(renderPortrait(entry));
  const head = el('div');
  head.appendChild(el('h2', null, entry.displayName ?? entry.name));
  head.appendChild(el('div', 'small', `${raceName(entry.race)} ${className(entry.class)}, Stufe ${entry.level}`));
  head.appendChild(el('div', 'small', `Status: ${STATUS_LABELS[entry.status] ?? entry.status}`));
  hero.appendChild(head);
  left.appendChild(hero);
  const stats = el('div', 'stats');
  const rows = [
    ['Erschaffen', f.created], ['Spielzeit', f.played], ['Tode', f.deaths],
    ['Verliese (gesamt / vollendet)', f.dungeons], ['Gold', f.gold], ['Besuchte Zonen', f.zones],
    ['Längstes Level', f.longest], ['Gefährten', f.companions], ['Erfolge', f.iconic],
  ];
  for (const [k, v] of rows) {
    const cell = el('div', null, `${k}: `);
    cell.appendChild(el('b', null, v));
    stats.appendChild(cell);
  }
  left.appendChild(stats);

  const right = el('div');
  right.appendChild(el('h2', null, 'Inhalt'));
  const nums = firstPageNumbers(pageCounts);
  const toc = el('ul', 'toc');
  let n = 0;
  for (const s of SECTIONS) {
    if (!nums[s]) continue;
    n += 1;
    const li = el('li');
    li.appendChild(el('span', 't', `${n}. ${SECTION_TITLES[s]}`));
    li.appendChild(el('span', 'dots'));
    li.appendChild(el('span', 'n', String(nums[s])));
    li.addEventListener('click', () => onOpen({ view: 'section', id: entry.id, section: s, page: 1 }));
    toc.appendChild(li);
  }
  if (n) right.appendChild(toc);
  else right.appendChild(el('p', 'small', 'Die Seiten dieses Kapitels werden noch geschrieben.'));
  return { left, right };
}
