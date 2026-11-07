import { SECTIONS } from '../router.js';
import { buildDiaryPages } from './diary.js';
import { buildGalleryPages } from './gallery.js';
import { buildDeathsPages } from './deaths.js';
import { buildLevelPages } from './levels.js';
import { buildDungeonPages } from './dungeons.js';

const BUILDERS = {
  diary: buildDiaryPages, gallery: buildGalleryPages, deaths: buildDeathsPages,
  levels: buildLevelPages, dungeons: buildDungeonPages,
}; // Tasks 7-8 add their sections here

const TITLES = {
  diary: 'Tagebuch', gallery: 'Fotogalerie', deaths: 'Tode', levels: 'Levelaufstiege', dungeons: 'Verliese',
  gold: 'Schatzkammer', crafts: 'Handwerk', companions: 'Gefährten', iconic: 'Ikonische Momente',
  journey: 'Reiseroute', fun: 'Unnütze Statistiken',
};
export const sectionTitle = (section) => TITLES[section] ?? section;

// Returns { section: Page[] } for every section; sections without data give [].
export function buildSections(record, entry, ctx) {
  const out = {};
  for (const s of SECTIONS) out[s] = BUILDERS[s] ? BUILDERS[s](record, ctx, entry) : [];
  return out;
}
