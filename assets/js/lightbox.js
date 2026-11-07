import { el } from './dom.js';
import { fmtDateShort } from './format.js';
import { reasonLabel } from './names.js';

export function shotCaption(shot, utcOffset) {
  return [
    shot.time != null ? fmtDateShort(shot.time, utcOffset) : null,
    shot.reason ? reasonLabel(shot.reason) : null,
    shot.zone,
    shot.level != null ? `Stufe ${shot.level}` : null,
  ].filter(Boolean).join(' · ');
}

let active = null;

export function openLightbox(shots, index, utcOffset) {
  if (active || !shots.length) return;
  const opener = document.activeElement;
  let i = Math.min(Math.max(index, 0), shots.length - 1);

  const box = el('div', 'lightbox');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Bildansicht');
  const img = el('img', 'lb-img');
  const cap = el('div', 'lb-cap');
  const mkBtn = (cls, text, label) => {
    const b = el('button', `lb-btn ${cls}`, text);
    b.type = 'button';
    b.setAttribute('aria-label', label);
    return b;
  };
  const close = mkBtn('lb-close', '×', 'Schließen');
  const prev = mkBtn('lb-prev', '‹', 'Vorheriges Foto');
  const next = mkBtn('lb-next', '›', 'Nächstes Foto');
  box.append(img, cap, close, prev, next);

  const show = (n) => {
    i = (n + shots.length) % shots.length;
    const text = shotCaption(shots[i], utcOffset);
    img.src = shots[i].file;
    img.alt = text;
    cap.textContent = text;
    prev.hidden = next.hidden = shots.length < 2;
  };
  const shut = () => {
    document.removeEventListener('keydown', onKey, true);
    box.remove();
    active = null;
    if (opener && opener.focus) opener.focus();
  };
  function onKey(e) {
    if (e.key === 'Escape') shut();
    else if (e.key === 'ArrowLeft') show(i - 1);
    else if (e.key === 'ArrowRight') show(i + 1);
    else if (e.key === 'Tab') close.focus();
    else return;
    e.preventDefault();
    e.stopPropagation();
  }
  box.addEventListener('click', (e) => { if (e.target === box) shut(); });
  close.addEventListener('click', shut);
  prev.addEventListener('click', () => show(i - 1));
  next.addEventListener('click', () => show(i + 1));
  document.addEventListener('keydown', onKey, true);

  show(i);
  document.body.appendChild(box);
  active = box;
  close.focus();
}
