const CLASSES = {
  WARRIOR: ['Krieger', '#C69B6D'], PALADIN: ['Paladin', '#F48CBA'], HUNTER: ['Jäger', '#AAD372'],
  ROGUE: ['Schurke', '#FFF468'], PRIEST: ['Priester', '#FFFFFF'], SHAMAN: ['Schamane', '#0070DD'],
  MAGE: ['Magier', '#3FC7EB'], WARLOCK: ['Hexenmeister', '#8788EE'], DRUID: ['Druide', '#FF7C0A'],
};
const RACES = {
  Human: 'Mensch', Dwarf: 'Zwerg', NightElf: 'Nachtelf', Gnome: 'Gnom',
  Orc: 'Orc', Scourge: 'Untoter', Undead: 'Untoter', Tauren: 'Tauren', Troll: 'Troll',
};
const QUALITY = ['#9d9d9d', '#ffffff', '#1eff00', '#0070dd', '#a335ee', '#ff8000'];
const REASONS = {
  LEVEL_UP: 'Levelaufstieg', FIRST_DEATH: 'Erster Tod', DUNGEON_COMPLETE: 'Verlies abgeschlossen',
  PORTRAIT: 'Porträt', GAME: 'Schnappschuss', PERIODIC: 'Unterwegs', ACHIEVEMENT: 'Erfolg',
  GUILD_JOIN: 'Gildenbeitritt', GUILD_LEFT: 'Gildenaustritt', COMEBACK: 'Rückkehr',
  CHRONICLE_START: 'Beginn der Chronik',
};

export const className = (file) => (Object.hasOwn(CLASSES, file) ? CLASSES[file][0] : file);
export const raceName = (file) => Object.hasOwn(RACES, file) ? RACES[file] : file;
export const classColor = (file) => (Object.hasOwn(CLASSES, file) ? CLASSES[file][1] : '#ffffff');
export const qualityColor = (q) => QUALITY[q] ?? QUALITY[1];
export function reasonLabel(reason) {
  if (Object.hasOwn(REASONS, reason)) return REASONS[reason];
  if (reason.startsWith('ICONIC_')) return 'Ikonischer Moment';
  if (reason.startsWith('EQUIP_QUALITY_')) return 'Neue Ausrüstung';
  return reason;
}
