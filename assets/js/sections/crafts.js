import { el } from '../dom.js';
import { spreadsFrom, tableBlocks } from './spreads.js';

const GATHER = {
  mining: 'Bergbau', herbalism: 'Kräuterkunde', skinning: 'Kürschnerei', fishing: 'Angeln',
  disenchant: 'Entzaubern', prospecting: 'Sondieren', milling: 'Mahlen',
};

// One row per current profession; byLevel maps level -> { skill, maxSkill }.
export function professionRows(record) {
  const p = record.state?.professions ?? {};
  const levels = Object.entries(p.byLevel ?? {});
  return Object.entries(p.current ?? {}).map(([key, cur]) => {
    const byLevel = {};
    for (const [lvl, profs] of levels) {
      const e = profs?.[key];
      if (e) byLevel[lvl] = { skill: e.skill, maxSkill: e.maxSkill };
    }
    return { name: cur?.name ?? key, skill: cur?.skill, maxSkill: cur?.maxSkill, byLevel };
  });
}

// state.gathering is optional; accepts { kinds: {kind: n | {count}} } or the map directly.
export function gatheringRows(record) {
  const g = record.state?.gathering;
  const kinds = g?.kinds ?? g;
  if (!kinds || typeof kinds !== 'object') return [];
  return Object.entries(kinds)
    .map(([kind, v]) => ({
      kind, label: Object.hasOwn(GATHER, kind) ? GATHER[kind] : kind,
      count: typeof v === 'object' ? v?.count : v,
    }))
    .filter((r) => Number.isFinite(r.count));
}

export function buildCraftsPages(record, ctx) {
  const profs = professionRows(record), gather = gatheringRows(record);
  if (!profs.length && !gather.length) return [];
  const blocks = [];
  if (profs.length) {
    blocks.push({ el: el('h3', null, 'Berufe'), kind: 'sub' });
    blocks.push(...tableBlocks(['Beruf', 'Fertigkeit', 'Nach Stufe'], profs.map((r) => [
      r.name, `${r.skill ?? '–'} / ${r.maxSkill ?? '–'}`,
      Object.entries(r.byLevel).sort((a, b) => a[0] - b[0]).map(([l, v]) => `${l}: ${v.skill}`).join(' · ') || '–',
    ]), 'profs'));
  }
  if (gather.length) {
    blocks.push({ el: el('h3', null, 'Sammeln'), kind: 'sub' });
    blocks.push(...tableBlocks(['Tätigkeit', 'Anzahl'], gather.map((r) => [r.label, r.count]), 'gather'));
  }
  return spreadsFrom(blocks, 'Handwerk', ctx);
}
