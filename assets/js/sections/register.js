import { el } from '../dom.js';
import { className, raceName } from '../names.js';
import { fmtDateShort, fmtDuration } from '../format.js';
import { renderPortrait } from '../portrait.js';
import { toHash } from '../router.js';

export const STATUS_LABELS = { active: 'aktiv', resting: 'rastet', retired: 'aufgegeben', fallen: 'gefallen' };
const STATUS_CLASS = { active: 'alive', resting: 'rest', retired: 'dead', fallen: 'dead' };

function card(entry) {
  const gone = entry.status === 'retired' || entry.status === 'fallen';
  const a = el('a', `char${gone ? ' fallen' : ''}`);
  a.href = toHash({ view: 'chapter', id: entry.id });
  a.appendChild(renderPortrait(entry));
  a.appendChild(el('div', 'lvl', String(entry.level ?? '')));
  a.appendChild(el('div', 'name', entry.displayName ?? entry.name));
  a.appendChild(el('div', 'meta', `${raceName(entry.race)} ${className(entry.class)}`));
  const realm = el('div', 'meta');
  if (entry.realmType) realm.appendChild(el('span', 'tag', entry.realmType));
  if (entry.realmName) realm.appendChild(document.createTextNode(entry.realmName));
  if (realm.childNodes.length) a.appendChild(realm);
  a.appendChild(el('div', 'meta', `${fmtDuration(entry.playedSeconds ?? 0)} gespielt · ${entry.deaths ?? 0} Tode`));
  if (entry.lastSeen) a.appendChild(el('div', 'meta', `zuletzt gesehen ${fmtDateShort(entry.lastSeen, 0)}`));
  a.appendChild(el('span', `status ${STATUS_CLASS[entry.status] ?? 'alive'}`, STATUS_LABELS[entry.status] ?? entry.status));
  return a;
}

export function renderRegister(index) {
  const left = el('div');
  left.appendChild(el('h2', null, index.title ?? 'Chronik der Ewigen'));
  left.appendChild(el('div', 'orn', '✦ ✦ ✦'));
  left.appendChild(el('p', null, 'Dieses Buch hält die Reisen der Ewigen fest: Jeder Held bekommt sein eigenes Kapitel mit Tagebuch, Bildern, Toden, Levelaufstiegen und mehr.'));
  left.appendChild(el('p', null, 'Es schreibt sich von selbst. Ein Programm liest nach jeder Spielsitzung die Aufzeichnungen des Addons und fügt neue Seiten hinzu.'));

  const right = el('div');
  right.appendChild(el('h2', null, 'Heldenregister'));
  const grid = el('div', 'gallery');
  for (const entry of index.characters ?? []) grid.appendChild(card(entry));
  if (!grid.childNodes.length) grid.appendChild(el('p', 'small', 'Noch keine Helden verzeichnet.'));
  right.appendChild(grid);
  return { left, right };
}
