import test from 'node:test'; import assert from 'node:assert/strict'; import { readFile } from 'node:fs/promises';
import { causeLabel, deathRows } from '../../assets/js/sections/deaths.js';
import { levelRows } from '../../assets/js/sections/levels.js';
import { dungeonRows } from '../../assets/js/sections/dungeons.js';
import { sectionTitle } from '../../assets/js/sections/index.js';
import { parseItemLink } from '../../assets/js/sections/spreads.js';
const rec = JSON.parse(await readFile(new URL('./fixtures/thorgrim-eisenbart.json', import.meta.url), 'utf8'));
test('rows from fixture', () => {
  assert.deepEqual(deathRows(rec).map(r => [r.level, r.cause]), [[3, 'Sturz']]);
  assert.equal(causeLabel('drowned'), 'Ertrunken'); assert.equal(causeLabel(undefined), 'Gegner');
  assert.deepEqual(levelRows(rec).map(r => r.level), [1, 2, 3]);
  // The fixture holds one dungeon run in lists.dungeons (the brief expected [], which contradicts the fixture).
  const d = dungeonRows(rec);
  assert.deepEqual(d.map(r => [r.name, r.bosses, r.completed]), [['Die Todesminen', 1, true]]);
  assert.deepEqual(d[0].loot.map(l => [l.name, l.color]), [['Kurzschwert des Kapitäns', '#1eff00']]);
  assert.equal(sectionTitle('gold'), 'Schatzkammer');
});
test('test_sections_handle_empty', () => {
  const empty = { ...rec, state: {}, lists: {}, shots: {} };
  assert.deepEqual(deathRows(empty), []); assert.deepEqual(levelRows(empty), []); assert.deepEqual(dungeonRows(empty), []);
});
test('killer name, running level and gear fallback', () => {
  const r = { meta: {}, state: {
    levelActivity: { 8: { deaths: [{ time: 1, zone: 'Z', killerName: 'Hogger' }] } },
    levels: { 8: { duration: 60, zone: 'Z' } },
    gearByLevel: { 8: { slots: { Kopf: { l: '|cff0070dd|Hitem:1|h[Helm]|h|r' } } } },
  }, lists: {} };
  assert.equal(deathRows(r)[0].cause, 'Hogger');
  const l = levelRows(r)[0];
  assert.equal(l.completed, 'läuft noch');
  assert.deepEqual(l.equipment, [{ slot: 'Kopf', name: 'Helm', color: '#0070dd' }]);
  assert.deepEqual(parseItemLink('[X]', '#fff'), { name: 'X', color: '#fff' });
});
