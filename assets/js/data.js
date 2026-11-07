export class DataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DataError';
  }
}

const SCHEMA_VERSION = 1;

async function fetchJson(url, fetchFn) {
  let res;
  try {
    res = await fetchFn(url);
  } catch {
    throw new DataError(`Daten konnten nicht geladen werden: ${url}`);
  }
  if (!res.ok) throw new DataError(`Daten konnten nicht geladen werden (HTTP ${res.status}): ${url}`);
  const data = await res.json();
  if (data?.schemaVersion !== SCHEMA_VERSION) {
    throw new DataError(`Unbekannte Datenversion (${data?.schemaVersion}) in ${url}`);
  }
  return data;
}

export const loadIndex = (fetchFn = fetch) => fetchJson('data/index.json', fetchFn);
export const loadCharacter = (entry, fetchFn = fetch) => fetchJson(entry.file, fetchFn);

export const playerTime = (record) => record.meta.utcOffset ?? 0;

export function shotsSorted(record) {
  return Object.entries(record.shots ?? {})
    .map(([name, shot]) => ({ name, ...shot }))
    .sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
}

export function deathsOf(record) {
  const deaths = [];
  for (const [levelKey, activity] of Object.entries(record.state?.levelActivity ?? {})) {
    for (const d of activity?.deaths ?? []) {
      deaths.push({
        level: Number(levelKey),
        time: d.time,
        zone: d.zone,
        subZone: d.subZone,
        cause: d.cause,
        killerName: d.killerName,
        mapID: d.mapID,
        x: d.x,
        y: d.y,
      });
    }
  }
  return deaths.sort((a, b) => {
    if (a.time == null) return b.time == null ? 0 : 1;
    if (b.time == null) return -1;
    return a.time - b.time;
  });
}
