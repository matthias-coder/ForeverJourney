import { dayKey, fmtDate, fmtDuration, fmtGold } from './format.js';
import { playerTime, shotsSorted } from './data.js';
import { reasonLabel } from './names.js';

const CAUSES = {
  fall: 'Sturz', drowned: 'ertrunken', fatigue: 'Erschöpfung', lava: 'Lava', fire: 'Feuer', slime: 'Schleim',
};

const plural = (n, one, many) => (n === 1 ? `1 ${one}` : `${n} ${many}`);

// Rule based German sentence (first person) for one raw item. Values come from data, never HTML.
export function sentence(item) {
  const d = item.data ?? {};
  switch (item.type) {
    case 'LEVEL_UP':
      return `Stufe ${item.level ?? d.newLevel} erreicht.`;
    case 'DEATH': {
      const killer = d.killer ?? d.killerName ?? item.killer ?? item.killerName;
      if (killer) return `Von ${killer} getötet.`;
      if (Object.hasOwn(CAUSES, d.cause ?? '')) return `Gestorben: ${CAUSES[d.cause]}.`;
      return 'Gestorben.';
    }
    case 'DUNGEON':
      return item.completed
        ? `${item.dungeon} abgeschlossen (${fmtDuration(item.duration ?? 0)}, ${plural(item.deaths ?? 0, 'Tod', 'Tode')}).`
        : `${item.dungeon} betreten, nicht beendet.`;
    case 'ZONE_FIRST':
      return `Zum ersten Mal in ${item.zone}.`;
    case 'WORLD_DROP':
      return `Gefunden: ${item.item}.`;
    case 'GUILD_JOIN':
      return `Der Gilde ${item.guild} beigetreten.`;
    case 'GOLD':
      return `Goldmarke erreicht: ${fmtGold(item.copper ?? 0)}.`;
    default:
      return '';
  }
}

const KIND = {
  LEVEL_UP: 'level', DEATH: 'death', DUNGEON: 'dungeon', ZONE_FIRST: 'zone',
  WORLD_DROP: 'drop', GUILD_JOIN: 'guild', GOLD: 'gold',
};

function rawItems(record) {
  const lists = record.lists ?? {};
  const raw = [];
  for (const e of lists.events ?? []) {
    if (e.type === 'LEVEL_UP') raw.push({ ...e, level: e.data?.newLevel ?? e.level });
    else if (e.type === 'DEATH') raw.push(e);
    else if (e.type === 'GUILD_JOIN') raw.push({ ...e, guild: e.data?.guild ?? e.data?.guildName });
    else if (e.type === 'GOLD_MILESTONE') raw.push({ ...e, type: 'GOLD', copper: e.data?.copper ?? e.data?.amount });
    else if (e.type === 'ZONE_FIRST_VISIT') raw.push({ ...e, type: 'ZONE_FIRST' });
  }
  const seenZones = new Set(raw.filter((r) => r.type === 'ZONE_FIRST').map((r) => r.zone));
  for (const [zone, v] of Object.entries(record.state?.firstVisitedZones ?? {})) {
    if (v?.time != null && !seenZones.has(zone)) raw.push({ type: 'ZONE_FIRST', time: v.time, zone, level: v.level });
  }
  for (const d of lists.dungeons ?? []) {
    raw.push({
      type: 'DUNGEON', time: d.entered ?? d.startTime ?? d.time, level: d.level, zone: d.zone,
      dungeon: d.dungeon ?? d.name ?? 'Verlies',
      duration: d.duration ?? ((d.left ?? 0) - (d.entered ?? 0)),
      deaths: d.deaths ?? 0, completed: !!d.completed,
    });
  }
  for (const w of lists.worldDrops ?? []) {
    const name = w.name ?? w.itemName ?? w.item?.name ?? (typeof w.item === 'string' ? w.item : null);
    if (name) raw.push({ type: 'WORLD_DROP', time: w.time, level: w.level, zone: w.zone, item: name });
  }
  return raw.filter((r) => r.time != null);
}

export function buildDays(record) {
  const off = playerTime(record);
  const days = new Map();
  const day = (time) => {
    const key = dayKey(time, off);
    if (!days.has(key)) {
      days.set(key, { key, date: fmtDate(time, off), zones: [], playedSeconds: 0, items: [], minLevel: null, maxLevel: null });
    }
    return days.get(key);
  };
  const touch = (d, zone, level) => {
    if (zone && !d.zones.includes(zone)) d.zones.push(zone);
    if (typeof level === 'number' && level > 0) {
      d.minLevel = d.minLevel == null ? level : Math.min(d.minLevel, level);
      d.maxLevel = d.maxLevel == null ? level : Math.max(d.maxLevel, level);
    }
  };

  for (const r of rawItems(record)) {
    const d = day(r.time);
    d.items.push({ time: r.time, kind: KIND[r.type], text: sentence(r, record), level: r.level });
    touch(d, r.zone, r.level);
  }
  for (const j of record.lists?.journal ?? []) {
    if (j.time == null) continue;
    const d = day(j.time);
    d.items.push({ time: j.time, kind: 'journal', text: j.title ?? '', quote: j.text ?? '', level: j.level });
    touch(d, j.zone, j.level);
  }
  for (const shot of shotsSorted(record)) {
    if (shot.time == null) continue;
    const d = day(shot.time);
    const caption = [reasonLabel(shot.reason ?? ''), shot.zone, shot.level != null ? `Stufe ${shot.level}` : null]
      .filter(Boolean).join(' · ');
    d.items.push({ time: shot.time, kind: 'shot', text: caption, level: shot.level, shot });
    touch(d, shot.zone, shot.level);
  }
  for (const s of record.lists?.sessions ?? []) {
    if (s.startTime == null) continue;
    const d = day(s.startTime);
    d.playedSeconds += s.duration ?? 0;
    touch(d, s.zoneStart, s.levelStart);
    touch(d, s.zoneEnd, s.levelEnd);
  }
  return [...days.values()]
    .map((d) => ({ ...d, items: d.items.sort((a, b) => a.time - b.time) }))
    .sort((a, b) => a.key.localeCompare(b.key));
}
