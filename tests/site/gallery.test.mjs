import test from 'node:test'; import assert from 'node:assert/strict';
import { galleryRows } from '../../assets/js/sections/gallery.js';
test('splits shots into pages of 12 in time order', () => {
  const shots = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`s${i}.jpg`, { file: `f${i}`, thumb: `t${i}`, time: 1000 - i }]));
  const rows = galleryRows({ shots });
  assert.deepEqual(rows.map(r => r.length), [12, 12, 1]);
  assert.equal(rows[0][0].time, 976);
});
