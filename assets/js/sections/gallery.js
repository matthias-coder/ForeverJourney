import { el } from '../dom.js';
import { shotsSorted } from '../data.js';
import { openLightbox, shotCaption } from '../lightbox.js';

export function galleryRows(record, perPage = 12) {
  const shots = shotsSorted(record);
  const rows = [];
  for (let i = 0; i < shots.length; i += perPage) rows.push(shots.slice(i, i + perPage));
  return rows;
}

function gridPage(row, all, first, ctx) {
  const page = el('div');
  if (first) page.appendChild(el('h2', null, 'Fotogalerie'));
  const grid = el('div', 'gallery-grid');
  for (const shot of row) {
    const caption = shotCaption(shot, ctx.utcOffset);
    const btn = el('button', 'gallery-thumb');
    btn.type = 'button';
    btn.setAttribute('aria-label', caption || 'Foto vergrößern');
    const img = el('img');
    img.loading = 'lazy';
    img.alt = caption;
    img.src = shot.thumb ?? shot.file;
    btn.appendChild(img);
    btn.addEventListener('click', () => openLightbox(all, all.indexOf(shot), ctx.utcOffset));
    grid.appendChild(btn);
  }
  page.appendChild(grid);
  return page;
}

// One grid per printed page; pages are paired into spreads (odd count -> ornament on the right).
export function buildGalleryPages(record, ctx) {
  const rows = galleryRows(record);
  if (!rows.length) return [];
  const all = rows.flat();
  const singles = rows.map((row, i) => gridPage(row, all, i === 0, ctx));
  const spreads = [];
  for (let i = 0; i < singles.length; i += 2) {
    spreads.push({ title: 'Fotogalerie', left: singles[i], right: singles[i + 1] ?? el('div', 'orn', '✦ ✦ ✦') });
  }
  return spreads;
}
