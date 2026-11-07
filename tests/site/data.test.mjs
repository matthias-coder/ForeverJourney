import test from 'node:test'; import assert from 'node:assert/strict'; import { readFile } from 'node:fs/promises';
import { loadIndex, loadCharacter, DataError, shotsSorted, deathsOf } from '../../assets/js/data.js';
const fx = (name) => readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const fakeFetch = async (url) => ({ ok: true, status: 200, json: async () => JSON.parse(await fx(url.split('/').pop())) });
test('loads index and character', async () => {
  const idx = await loadIndex(fakeFetch);
  assert.equal(idx.characters[0].id, 'thorgrim-eisenbart');
  const rec = await loadCharacter(idx.characters[0], fakeFetch);
  assert.equal(rec.meta.name, 'Thorgrim');
  assert.deepEqual(shotsSorted(rec).map(s => s.reason), ['LEVEL_UP', 'PORTRAIT']);
  assert.deepEqual(deathsOf(rec).map(d => [d.level, d.cause]), [[3, 'fall']]);
});
test('rejects bad schema and http errors', async () => {
  await assert.rejects(loadIndex(async () => ({ ok: false, status: 404 })), DataError);
  await assert.rejects(loadIndex(async () => ({ ok: true, json: async () => ({ schemaVersion: 2, characters: [] }) })), DataError);
});
