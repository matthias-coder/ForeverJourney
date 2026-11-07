import test from 'node:test'; import assert from 'node:assert/strict'; import { readFile } from 'node:fs/promises';
import { linePath } from '../../assets/js/chart.js';
import { goldSeries } from '../../assets/js/sections/gold.js';
import { companionRows } from '../../assets/js/sections/companions.js';
import { iconicRows } from '../../assets/js/sections/iconic.js';
import { professionRows, gatheringRows } from '../../assets/js/sections/crafts.js';
import { goldByLevelRows } from '../../assets/js/sections/gold.js';
import { funRows } from '../../assets/js/sections/fun.js';
const rec = JSON.parse(await readFile(new URL('./fixtures/thorgrim-eisenbart.json', import.meta.url), 'utf8'));
test('line path scales points', () => {
  assert.equal(linePath([], 100, 50), '');
  assert.match(linePath([[0, 0], [10, 10]], 100, 50, 0), /^M0,50 L100,0$/);
});
test('gold series from goldHistory', () => {
  assert.deepEqual(goldSeries(rec).map(([, v]) => v), [rec.goldHistory['2026-10-12'].last]);
});
test('companions absent when state has none', () => {
  assert.deepEqual(companionRows({ ...rec, state: {} }), []);
  assert.deepEqual(companionRows({ ...rec, state: { companions: { people: {} } } }), []);
  const brannok = { name: 'Brannok', tier: 'guild', together: 5400, dungeons: 2, raids: 0, bosses: 3, first: { time: 1791830400, level: 10 } };
  assert.deepEqual(companionRows({ ...rec, state: { companions: { people: { brannok } } } }),
    [{ name: 'Brannok', tier: 'guild', together: 5400, dungeons: 2, raids: 0, bosses: 3, firstTime: 1791830400 }]);
});
test('fun rows label known keys', () => {
  assert.deepEqual(funRows({ ...rec, state: { fun: { jumps: 12, weird: 1 } } }), [{ label: 'Sprünge', value: 12 }, { label: 'weird', value: 1 }]);
});
test('line path handles one point and flat y without NaN', () => {
  assert.doesNotMatch(linePath([[5, 3]], 100, 50), /NaN/);
  assert.doesNotMatch(linePath([[0, 7], [10, 7]], 100, 50), /NaN/);
});
test('gathering rows use quantity and events', () => {
  assert.deepEqual(gatheringRows({ state: { gathering: { kinds: { mining: { events: 4, quantity: 40 } } } } }),
    [{ kind: 'mining', label: 'Bergbau', quantity: 40, events: 4 }]);
  assert.deepEqual(gatheringRows({ state: {} }), []);
});
test('iconic rows sorted by first time', () => {
  const state = { iconic: { moments: { b: { count: 1, first: { time: 20 } }, a: { count: 2, first: { time: 10 } } } } };
  assert.deepEqual(iconicRows({ state }).map((r) => [r.id, r.count]), [['a', 2], ['b', 1]]);
});
test('profession rows from current and byLevel', () => {
  const state = { professions: { byLevel: { 8: { 'id:129': { name: 'Erste Hilfe', skill: 21, maxSkill: 75 } } },
    current: { 'id:129': { name: 'Erste Hilfe', skill: 21, maxSkill: 75 } } } };
  assert.deepEqual(professionRows({ state }), [{ name: 'Erste Hilfe', skill: 21, maxSkill: 75, byLevel: { 8: { skill: 21, maxSkill: 75 } } }]);
});
test('gold by level rows', () => {
  const state = { goldByLevel: { 8: { earned: 65, spent: 0, src: { quest: { e: 65, s: 0 } } } } };
  assert.deepEqual(goldByLevelRows({ state }), [{ level: 8, earned: 65, spent: 0, src: { quest: { e: 65, s: 0 } } }]);
});
test('fun rows skip objects and format durations', () => {
  assert.deepEqual(funRows({ state: { fun: { activeSec: 7594.7, aliveActSec: 90, chat: { AFK: 4 }, byLevel: {} } } }),
    [{ label: 'Aktive Zeit', value: '2h 6m' }, { label: 'Aktiv am Stück lebendig', value: '1 min' }]);
});
