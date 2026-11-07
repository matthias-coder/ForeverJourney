import test from 'node:test'; import assert from 'node:assert/strict';
import { portraitSources } from '../../assets/js/portrait.js';
test('test_portrait_fallback_chain', () => {
  assert.deepEqual(portraitSources({ portrait: { kind: 'none' } }), []);
  assert.deepEqual(portraitSources({ portrait: { kind: 'shot', file: 'shots/a/x.jpg', thumb: 'shots/a/t_x.jpg' } }), ['shots/a/x.jpg']);
  const s = portraitSources({ portrait: { kind: 'armory', url: 'https://render.example/x.jpg', file: 'shots/a/x.jpg' } });
  assert.equal(s.at(-1), 'shots/a/x.jpg'); assert.ok(s.length >= 1);
});
