import test from 'node:test'; import assert from 'node:assert/strict';
import { transitionKind, resolveRoute } from '../../assets/js/book.js';
const idx = { characters: [{ id: 'a' }] };
test('transition kinds', () => {
  assert.equal(transitionKind({ view: 'register' }, { view: 'chapter', id: 'a' }), 'lid');
  assert.equal(transitionKind({ view: 'chapter', id: 'a' }, { view: 'section', id: 'a', section: 'diary', page: 1 }), 'fade');
  assert.equal(transitionKind({ view: 'section', id: 'a', section: 'diary', page: 1 }, { view: 'section', id: 'b', section: 'diary', page: 1 }), 'lid');
  assert.equal(transitionKind({ view: 'register' }, { view: 'register' }), 'none');
});
test('test_resolve_route_clamps_page', () => {
  const pc = { diary: 3, gold: 0 };
  assert.deepEqual(resolveRoute({ view: 'section', id: 'a', section: 'diary', page: 9 }, idx, pc), { view: 'section', id: 'a', section: 'diary', page: 3 });
  assert.deepEqual(resolveRoute({ view: 'section', id: 'a', section: 'gold', page: 1 }, idx, pc), { view: 'chapter', id: 'a' });
  assert.deepEqual(resolveRoute({ view: 'chapter', id: 'zzz' }, idx, pc), { view: 'register' });
});
test('recoverState clears stale route, lid and closed class', async () => {
  const { recoverState } = await import('../../assets/js/book.js');
  const removed = [];
  const classes = new Set(['book', 'closed']);
  const fake = {
    route: { view: 'chapter', id: 'a' }, nav: { prev: null, next: null },
    book: { classList: { remove: (c) => classes.delete(c) }, querySelectorAll: () => [{ remove: () => removed.push('lid') }] },
  };
  recoverState(fake);
  assert.equal(fake.route, null); assert.equal(fake.nav, null);
  assert.ok(!classes.has('closed')); assert.deepEqual(removed, ['lid']);
});
