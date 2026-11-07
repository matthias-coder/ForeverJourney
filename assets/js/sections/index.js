import { SECTIONS } from '../router.js';
import { buildDiaryPages } from './diary.js';
import { buildGalleryPages } from './gallery.js';

const BUILDERS = { diary: buildDiaryPages, gallery: buildGalleryPages }; // Tasks 6-8 add their sections here

// Returns { section: Page[] } for every section; sections without data give [].
export function buildSections(record, entry, ctx) {
  const out = {};
  for (const s of SECTIONS) out[s] = BUILDERS[s] ? BUILDERS[s](record, ctx, entry) : [];
  return out;
}
