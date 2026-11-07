// Tiny DOM helpers. Data values always go through textContent (never innerHTML).
export function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

export const CREDITS_URL = 'https://www.curseforge.com/wow/addons/mycharforever-an-automatic-character-chronicle';
export const CREDITS_TEXT = 'Daten aufgezeichnet mit dem Addon MyCharForever von Devchris';

export function credits(tag = 'footer', cls = 'credits') {
  const p = el(tag, cls);
  const a = el('a', 'lnk', CREDITS_TEXT);
  a.href = CREDITS_URL;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  p.appendChild(a);
  return p;
}
