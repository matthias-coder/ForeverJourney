import test from 'node:test'; import assert from 'node:assert/strict';
import { parseHash, toHash, SECTIONS } from '../../assets/js/router.js';
test('parse and format routes', () => {
  assert.deepEqual(parseHash(''), { view: 'register' });
  assert.deepEqual(parseHash('#/'), { view: 'register' });
  assert.deepEqual(parseHash('#/c/thorgrim-eisenbart'), { view: 'chapter', id: 'thorgrim-eisenbart' });
  assert.deepEqual(parseHash('#/c/thorgrim-eisenbart/diary/3'), { view: 'section', id: 'thorgrim-eisenbart', section: 'diary', page: 3 });
  assert.equal(toHash({ view: 'section', id: 'x', section: 'gold', page: 2 }), '#/c/x/gold/2');
  assert.deepEqual(SECTIONS, ['diary','gallery','deaths','levels','dungeons','gold','crafts','companions','iconic','journey','fun']);
});
test('test_parse_hash_invalid_falls_back', () => {
  assert.deepEqual(parseHash('#/c/x/nope/1'), { view: 'chapter', id: 'x' });
  assert.deepEqual(parseHash('#/c/x/diary/0'), { view: 'chapter', id: 'x' });
  assert.deepEqual(parseHash('#/what'), { view: 'register' });
});
test('parseHash is total on malformed input', () => {
  assert.deepEqual(parseHash('#/c/%E0%A4%A'), { view: 'chapter', id: '%E0%A4%A' });
  for (const p of ['abc', '-1', '1.5']) assert.deepEqual(parseHash(`#/c/x/diary/${p}`), { view: 'chapter', id: 'x' });
});
