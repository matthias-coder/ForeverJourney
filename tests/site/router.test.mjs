import test from 'node:test'; import assert from 'node:assert/strict';
import { parseHash, toHash, SECTIONS } from '../../assets/js/router.js';
test('parse and format routes', () => {
  assert.deepEqual(parseHash(''), { view: 'register' });
  assert.deepEqual(parseHash('#/'), { view: 'register' });
  assert.deepEqual(parseHash('#/c/thorgrim-eisenbart'), { view: 'chapter', id: 'thorgrim-eisenbart' });
  assert.deepEqual(parseHash('#/c/thorgrim-eisenbart/diary/3'), { view: 'section', id: 'thorgrim-eisenbart', section: 'diary', page: 3 });
  assert.equal(toHash({ view: 'section', id: 'x', section: 'gold', page: 2 }), '#/c/x/gold/2');
  assert.equal(SECTIONS[0], 'diary'); assert.equal(SECTIONS.length, 11);
});
test('test_parse_hash_invalid_falls_back', () => {
  assert.deepEqual(parseHash('#/c/x/nope/1'), { view: 'chapter', id: 'x' });
  assert.deepEqual(parseHash('#/c/x/diary/0'), { view: 'chapter', id: 'x' });
  assert.deepEqual(parseHash('#/what'), { view: 'register' });
});
