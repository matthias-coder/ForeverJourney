import test from 'node:test'; import assert from 'node:assert/strict';
import { segmentsByMap } from '../../assets/js/map.js';
test('test_segments_skip_invalid_points', () => {
  const rec = { maps: { '1426': { name: 'Dun Morogh' } }, lists: { journeySegments: [
    [[1, 1426, 0.1, 0.1, 1], [2, 1426, 0.2, 0.2, 1], [3, 1426, 1.7, 0.2, 1]],
    [[4, 1426, 0.5, 0.5, 2]],
    [[5, 9999, 0.5, 0.5, 2], [6, 9999, 0.6, 0.6, 2]],
  ], journeyGhost: [false, false, true] } };
  const m = segmentsByMap(rec);
  assert.deepEqual([...m.keys()], [1426]);
  assert.equal(m.get(1426).segments.length, 1);
  assert.equal(m.get(1426).segments[0].length, 2);
  assert.deepEqual(m.get(1426).ghost, [false]);
});
