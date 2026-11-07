export const SECTIONS = ['diary', 'gallery', 'deaths', 'levels', 'dungeons', 'gold', 'crafts', 'companions', 'iconic', 'journey', 'fun'];

export function parseHash(hash) {
  const parts = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] !== 'c' || !parts[1]) return { view: 'register' };
  const id = decodeURIComponent(parts[1]);
  const [, , section, pageStr] = parts;
  if (section === undefined) return { view: 'chapter', id };
  const page = /^\d+$/.test(pageStr ?? '') ? Number(pageStr) : 0;
  if (!SECTIONS.includes(section) || page < 1) return { view: 'chapter', id };
  return { view: 'section', id, section, page };
}

export function toHash(route) {
  if (route.view === 'chapter') return `#/c/${encodeURIComponent(route.id)}`;
  if (route.view === 'section') return `#/c/${encodeURIComponent(route.id)}/${route.section}/${route.page}`;
  return '#/';
}
