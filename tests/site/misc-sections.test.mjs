import test from 'node:test'; import assert from 'node:assert/strict'; import { readFile } from 'node:fs/promises';
import { linePath } from '../../assets/js/chart.js';
import { goldSeries } from '../../assets/js/sections/gold.js';
import { companionRows } from '../../assets/js/sections/companions.js';
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
  assert.deepEqual(companionRows({ ...rec, state: { companions: { people: { brannok: { name: 'Brannok', groups: 3 } } } } }), [{ name: 'Brannok', groups: 3 }]);
});
test('fun rows label known keys', () => {
  assert.deepEqual(funRows({ ...rec, state: { fun: { jumps: 12, weird: 1 } } }), [{ label: 'Sprünge', value: 12 }, { label: 'weird', value: 1 }]);
});
