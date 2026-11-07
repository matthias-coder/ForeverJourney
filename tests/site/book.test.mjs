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
test('drain runs a queued navigation before a pending re-pagination', async () => {
  const { drain } = await import('../../assets/js/book.js');
  const calls = [];
  const fake = { queued: { view: 'chapter', id: 'a' }, again: true, goto: async (t) => calls.push(['goto', t.id]), repaginate: async () => calls.push(['repaginate']) };
  await drain(fake);
  assert.deepEqual(calls, [['goto', 'a']]);
  assert.equal(fake.queued, null);
  assert.equal(fake.again, true); // goto's own drain handles it next
  fake.queued = null;
  await drain(fake);
  assert.deepEqual(calls, [['goto', 'a'], ['repaginate']]);
  assert.equal(fake.again, false);
  assert.equal(await drain(fake), undefined);
});

test('keyTarget: arrows navigate unless lightbox, typing or modifiers', async () => {
  const { keyTarget } = await import('../../assets/js/book.js');
  const nav = { prev: { view: 'register' }, next: { view: 'chapter', id: 'a' } };
  assert.equal(keyTarget({ key: 'ArrowLeft' }, nav), nav.prev);
  assert.equal(keyTarget({ key: 'ArrowRight' }, nav), nav.next);
  assert.equal(keyTarget({ key: 'ArrowRight' }, nav, { lightbox: true }), null);
  assert.equal(keyTarget({ key: 'ArrowRight' }, nav, { typing: true }), null);
  assert.equal(keyTarget({ key: 'ArrowRight', ctrlKey: true }, nav), null);
  assert.equal(keyTarget({ key: 'a' }, nav), null);
  assert.equal(keyTarget({ key: 'ArrowLeft' }, { prev: null, next: null }), null);
  assert.equal(keyTarget({ key: 'ArrowLeft' }, null), null);
});
import { startKind, shouldRepaginate, needsCanonicalHash } from '../../assets/js/book.js';
test('startKind opens a shut cover on a fresh load', () => {
  const to = { view: 'chapter', id: 'a' };
  assert.equal(startKind(null, to, { hasShutLid: true, narrow: false }), 'open-lid');
  assert.equal(startKind(null, to, { hasShutLid: true, narrow: true }), 'none');
  assert.equal(startKind(null, { view: 'register' }, { hasShutLid: false, narrow: false }), 'none');
  assert.equal(startKind({ view: 'register' }, to, { narrow: false }), 'lid');
  assert.equal(startKind({ view: 'register' }, to, { narrow: true }), 'fade');
  assert.equal(startKind(to, to, {}), 'none');
});
test('shouldRepaginate ignores mobile height-only changes', () => {
  const a = { width: 375, height: 700 };
  assert.equal(shouldRepaginate(a, { width: 375, height: 790 }, true), false);
  assert.equal(shouldRepaginate(a, { width: 380, height: 700 }, true), true);
  const w = { width: 1400, height: 900 };
  assert.equal(shouldRepaginate(w, { width: 1401, height: 901 }, false), false);
  assert.equal(shouldRepaginate(w, { width: 1400, height: 850 }, false), true);
  assert.equal(shouldRepaginate(w, { width: 1300, height: 900 }, false), true);
});
test('needsCanonicalHash flags bogus sections', () => {
  const route = { view: 'chapter', id: 'a' };
  assert.equal(needsCanonicalHash(route, '#/c/a/bogus/2'), true);
  assert.equal(needsCanonicalHash(route, '#/c/a'), false);
});
