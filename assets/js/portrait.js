import { classColor } from './names.js';
import { el } from './dom.js';

// The URL pattern of the render image on the Blizzard armory profile page is not known yet.
// Until it is determined this returns null (never the profile URL itself, which is an HTML page),
// so the chain falls through to the screenshot / placeholder.
export function armoryRenderUrl(armoryUrl) {
  void armoryUrl;
  return null;
}

export function portraitSources(entry) {
  const p = entry?.portrait ?? {};
  const sources = [];
  const render = armoryRenderUrl(p.url ?? entry?.armoryUrl);
  if (render) sources.push(render);
  if (p.file) sources.push(p.file);
  return sources;
}

function showPlaceholder(box, entry) {
  box.textContent = '';
  box.classList.add('placeholder');
  box.style.background = classColor(entry.class);
  box.textContent = (entry.name ?? entry.displayName ?? '?').trim().charAt(0).toUpperCase();
}

// Returns a round `.portrait` box. It holds an <img> that walks through portraitSources via onerror;
// when all sources fail (or none exist) the box turns into the class-coloured placeholder.
export function renderPortrait(entry) {
  const box = el('div', 'portrait');
  const sources = portraitSources(entry);
  if (!sources.length) { showPlaceholder(box, entry); return box; }
  const img = el('img');
  img.alt = entry.displayName ?? entry.name ?? '';
  const crop = entry.portrait?.crop;
  if (crop) {
    img.style.objectPosition = `${crop.x ?? 50}% ${crop.y ?? 50}%`;
    img.style.transformOrigin = `${crop.x ?? 50}% ${crop.y ?? 50}%`;
    img.style.transform = `scale(${crop.zoom ?? 1})`;
  }
  let i = 0;
  img.onerror = () => {
    i += 1;
    if (i < sources.length) img.src = sources[i];
    else showPlaceholder(box, entry);
  };
  img.src = sources[0];
  box.appendChild(img);
  return box;
}
