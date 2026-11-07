import test from 'node:test'; import assert from 'node:assert/strict'; import { readFile } from 'node:fs/promises';
import { buildDays, sentence } from '../../assets/js/diary.js';
const rec = JSON.parse(await readFile(new URL('./fixtures/thorgrim-eisenbart.json', import.meta.url), 'utf8'));
test('groups fixture into one day with items in time order', () => {
  const days = buildDays(rec);
  assert.equal(days.length, 1); assert.equal(days[0].key, '2026-10-12');
  assert.equal(days[0].playedSeconds, 3600);
  const kinds = days[0].items.map(i => i.kind);
  assert.ok(kinds.includes('level') && kinds.includes('death') && kinds.includes('shot') && kinds.includes('journal'));
  assert.deepEqual([...days[0].items.map(i => i.time)].sort((a, b) => a - b), days[0].items.map(i => i.time));
});
test('sentences', () => {
  assert.equal(sentence({ type: 'LEVEL_UP', level: 10 }, rec), 'Stufe 10 erreicht.');
  assert.equal(sentence({ type: 'DEATH', data: { cause: 'fall' } }, rec), 'Gestorben: Sturz.');
  assert.equal(sentence({ type: 'DEATH', data: { killer: 'Hogger' } }, rec), 'Von Hogger getötet.');
  assert.equal(sentence({ type: 'DEATH' }, rec), 'Gestorben.');
  assert.equal(sentence({ type: 'DUNGEON', dungeon: 'Die Todesminen', duration: 5640, deaths: 0, completed: true }, rec), 'Die Todesminen abgeschlossen (1h 34m, 0 Tode).');
  assert.equal(sentence({ type: 'ZONE_FIRST', zone: 'Loch Modan' }, rec), 'Zum ersten Mal in Loch Modan.');
});
test('dungeon run from the addon schema lands on its day', () => {
  const day = buildDays(rec).find((d) => d.key === '2026-10-12');
  const dng = day.items.find((i) => i.kind === 'dungeon');
  assert.equal(dng.text, 'Die Todesminen abgeschlossen (1h 34m, 0 Tode).');
  assert.equal(dng.time, 1791832000);
});
test('further sentences', () => {
  assert.equal(sentence({ type: 'DEATH', data: { cause: 'drowned' } }, rec), 'Gestorben: ertrunken.');
  assert.equal(sentence({ type: 'DEATH', killerName: 'Muskelprotz' }, rec), 'Von Muskelprotz getötet.');
  assert.equal(sentence({ type: 'DUNGEON', dungeon: 'Die Todesminen', completed: false }, rec), 'Die Todesminen betreten, nicht beendet.');
  assert.equal(sentence({ type: 'WORLD_DROP', item: 'Schwert' }, rec), 'Gefunden: Schwert.');
  assert.equal(sentence({ type: 'GUILD_JOIN', guild: 'Die Ewigen' }, rec), 'Der Gilde Die Ewigen beigetreten.');
});
test('test_diary_empty_record', () => {
  const empty = { ...rec, lists: { events: [], sessions: [], journal: [], screenshots: [], dungeons: [], worldDrops: [], journeySegments: [], journeyGhost: [], pvpHistory: [] }, shots: {} };
  assert.deepEqual(buildDays(empty), []);
});
