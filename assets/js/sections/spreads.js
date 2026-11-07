import { el } from '../dom.js';
import { paginate } from '../paginate.js';

// Paginates blocks (title heading first) and pairs the single pages into spreads.
// An odd page count puts an ornament on the empty right page.
export function spreadsFrom(blocks, title, ctx) {
  if (!blocks.length) return [];
  const all = [{ el: el('h2', null, title), kind: 'title' }, ...blocks];
  const singles = paginate(all, ctx.pageHeight, ctx.measure).map((page) => {
    const node = el('div');
    for (const b of page) node.appendChild(b.el);
    return node;
  });
  const spreads = [];
  for (let i = 0; i < singles.length; i += 2) {
    spreads.push({ title, left: singles[i], right: singles[i + 1] ?? el('div', 'orn', '✦ ✦ ✦') });
  }
  return spreads;
}

// Item link "|cff1eff00|Hitem:..|h[Name]|h|r" or "[Name]" -> { name, color }.
export function parseItemLink(link, fallbackColor) {
  const s = String(link ?? '');
  const name = /\[([^\]]+)\]/.exec(s)?.[1] ?? (s || '?');
  const hex = /\|cff([0-9a-fA-F]{6})/.exec(s)?.[1];
  return { name, color: hex ? `#${hex.toLowerCase()}` : fallbackColor };
}
