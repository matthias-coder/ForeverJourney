import test from 'node:test'; import assert from 'node:assert/strict';
import { fmtDate, fmtDateShort, fmtTime, fmtDuration, fmtGold, dayKey } from '../../assets/js/format.js';
import { className, raceName, qualityColor, reasonLabel } from '../../assets/js/names.js';
const OFF = 7200; // CEST
test('dates in player time', () => {
  assert.equal(fmtDate(1791830651, OFF), 'Montag, 12. Oktober 2026');
  assert.equal(fmtDateShort(1791830651, OFF), '12. Okt. 2026');
  assert.equal(fmtTime(1791830651, OFF), '20:44');
  assert.equal(dayKey(1791830651, OFF), '2026-10-12');
});
test('durations and gold', () => {
  assert.equal(fmtDuration(13260), '3h 41m'); assert.equal(fmtDuration(2820), '47 min'); assert.equal(fmtDuration(12), '12 s');
  assert.equal(fmtGold(143208), '14g 32s 08k'); assert.equal(fmtGold(0), '0k'); assert.equal(fmtGold(1205), '12s 05k');
});
test('names', () => {
  assert.equal(className('WARRIOR'), 'Krieger'); assert.equal(raceName('Dwarf'), 'Zwerg'); assert.equal(raceName('Murloc'), 'Murloc');
  assert.equal(qualityColor(2), '#1eff00'); assert.equal(reasonLabel('ICONIC_hogger'), 'Ikonischer Moment'); assert.equal(reasonLabel('X_Y'), 'X_Y');
  assert.equal(reasonLabel('CHRONICLE_START'), 'Beginn der Chronik'); assert.equal(raceName('Skyborne'), 'Skyborne'); assert.equal(reasonLabel('DEATH'), 'Tod');
});
test('prototype keys do not leak', () => {
  assert.equal(raceName('constructor'), 'constructor'); assert.equal(reasonLabel('toString'), 'toString');
  assert.equal(className('constructor'), 'constructor');
});
test('midnight boundary uses player offset', () => {
  assert.equal(dayKey(1791847800, 3600), '2026-10-13');
  assert.equal(fmtDate(1791847800, 3600), 'Dienstag, 13. Oktober 2026');
  assert.equal(dayKey(1791847800, 0), '2026-10-12');
});

test('plural: singular only for exactly one', async () => {
  const { plural } = await import('../../assets/js/format.js');
  assert.equal(plural(0, 'Tod', 'Tode'), '0 Tode');
  assert.equal(plural(1, 'Tod', 'Tode'), '1 Tod');
  assert.equal(plural(2, 'Tod', 'Tode'), '2 Tode');
});
