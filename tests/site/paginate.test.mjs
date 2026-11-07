import test from 'node:test'; import assert from 'node:assert/strict';
import { paginate } from '../../assets/js/paginate.js';
const m = (b) => b.height;
test('fills pages in order', () => {
  const pages = paginate([{ height: 40 }, { height: 50 }, { height: 30 }, { height: 90 }], 100, m);
  assert.deepEqual(pages.map(p => p.map(b => b.height)), [[40, 50], [30], [90]]);
});
test('test_paginate_oversized_block_gets_own_page', () => {
  const pages = paginate([{ height: 10 }, { height: 500 }, { height: 10 }], 100, m);
  assert.deepEqual(pages.map(p => p.map(b => b.height)), [[10], [500], [10]]);
});
test('empty input gives no pages', () => { assert.deepEqual(paginate([], 100, m), []); });
