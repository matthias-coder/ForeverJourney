import { el, credits } from './dom.js';
import { SECTIONS, parseHash, toHash } from './router.js';
import { DataError, playerTime } from './data.js';
import { renderRegister } from './sections/register.js';
import { buildSections } from './sections/index.js';
import { measureInDom } from './paginate.js';
import { renderChapter, firstPageNumbers, SECTION_TITLES } from './sections/chapter.js';

const sameRoute = (a, b) => a.view === b.view && a.id === b.id && a.section === b.section && a.page === b.page;

// 'lid': id change or register <-> chapter; 'fade': same id, other page; 'none': identical.
export function transitionKind(from, to) {
  if (sameRoute(from, to)) return 'none';
  if (from.view === 'register' || to.view === 'register') return 'lid';
  return from.id !== to.id ? 'lid' : 'fade';
}

// Unknown id -> register; section without pages -> chapter; page beyond the end -> last page.
export function resolveRoute(route, index, pageCounts) {
  if (route.view === 'register') return route;
  if (!(index.characters ?? []).some((c) => c.id === route.id)) return { view: 'register' };
  if (route.view === 'chapter') return route;
  const count = pageCounts[route.section] ?? 0;
  if (count <= 0) return { view: 'chapter', id: route.id };
  return { ...route, page: Math.min(route.page, count) };
}

// Previous / next stop in reading order: register, chapter, then all section pages in SECTIONS order.
export function neighbours(route, pageCounts) {
  const stops = [{ view: 'register' }];
  if (route.view !== 'register') {
    stops.push({ view: 'chapter', id: route.id });
    for (const s of SECTIONS) {
      for (let p = 1; p <= (pageCounts[s] ?? 0); p += 1) stops.push({ view: 'section', id: route.id, section: s, page: p });
    }
  }
  const i = stops.findIndex((s) => sameRoute(s, route));
  return { prev: i > 0 ? stops[i - 1] : null, next: i >= 0 && i < stops.length - 1 ? stops[i + 1] : null };
}

// Resets transient state after a failed navigation so a later hashchange to the old route redraws.
export function recoverState(book) {
  book.route = null;
  book.nav = null;
  book.book?.classList?.remove('closed');
  book.book?.querySelectorAll?.('.lid').forEach((l) => l.remove());
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const NARROW = '(max-width: 820px)';

export class Book {
  constructor(root, { loadIndex, loadCharacter }) {
    this.root = root;
    this.loadIndex = loadIndex;
    this.loadCharacter = loadCharacter;
    this.index = null;
    // sections: Record<string, Page[]> from buildSections; a Page is { title, left: Node, right: Node }.
    this.current = null;
    this.route = null;
    this.busy = false;
    this.queued = null;
  }

  async start() {
    this.build();
    try {
      this.index = await this.loadIndex();
    } catch (e) {
      this.showError(e);
      return;
    }
    window.addEventListener('hashchange', () => this.goto(parseHash(location.hash)));
    let timer;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => this.repaginate(), 250);
    });
    await this.goto(parseHash(location.hash));
  }

  navigate(route) {
    location.hash = toHash(route);
  }

  build() {
    this.root.textContent = '';
    const scene = el('div', 'scene');
    this.book = el('div', 'book');
    this.spread = el('div', 'spread');
    this.book.appendChild(this.spread);
    this.book.appendChild(el('div', 'spine'));
    this.cornerL = el('button', 'corner l');
    this.cornerR = el('button', 'corner r');
    this.cornerL.type = this.cornerR.type = 'button';
    this.cornerL.setAttribute('aria-label', 'Zurückblättern');
    this.cornerR.setAttribute('aria-label', 'Weiterblättern');
    this.cornerL.onclick = () => this.nav?.prev && this.navigate(this.nav.prev);
    this.cornerR.onclick = () => this.nav?.next && this.navigate(this.nav.next);
    this.book.append(this.cornerL, this.cornerR);
    scene.appendChild(this.book);
    scene.appendChild(credits());
    this.root.appendChild(scene);
  }

  showError(e) {
    const msg = e instanceof DataError ? e.message : 'Das Buch konnte nicht geöffnet werden.';
    const left = el('div');
    left.appendChild(el('h2', null, 'Das Buch bleibt verschlossen'));
    left.appendChild(el('p', null, msg));
    this.renderSpread(left, el('div'), ['', '']);
    this.cornerL.hidden = this.cornerR.hidden = true;
  }

  pageCounts() {
    const out = {};
    for (const [k, pages] of Object.entries(this.current?.sections ?? {})) out[k] = pages.length;
    return out;
  }

  async goto(target) {
    if (this.busy) { this.queued = target; return; }
    this.busy = true;
    try {
      await this.run(target);
    } catch (e) {
      recoverState(this);
      this.showError(e);
    } finally {
      this.busy = false;
    }
    if (this.queued) {
      const next = this.queued;
      this.queued = null;
      await this.goto(next);
    }
  }

  async run(target) {
    if (target.view !== 'register' && this.current?.id !== target.id) {
      const entry = (this.index.characters ?? []).find((c) => c.id === target.id);
      if (entry) {
        const record = await this.loadCharacter(entry);
        this.current = { id: entry.id, entry, record, sections: await this.buildSectionsFor(record, entry) };
      }
    }
    const route = resolveRoute(target, this.index, this.pageCounts());
    if (toHash(route) !== toHash(target)) history.replaceState(null, '', toHash(route));
    const kind = this.route ? transitionKind(this.route, route) : 'none';
    if (kind === 'none' && this.route) return;
    const draw = () => this.draw(route);
    const useKind = kind === 'lid' && window.matchMedia?.(NARROW).matches ? 'fade' : kind;
    await this.transition(useKind, this.embossing(route), draw);
    this.route = route;
  }

  // Builds all section spreads, measuring in a hidden probe spread that matches the real page size.
  async buildSectionsFor(record, entry) {
    await document.fonts?.ready;
    const probe = el('div', 'spread probe');
    probe.setAttribute('aria-hidden', 'true');
    const page = el('div', 'page left');
    const inner = el('div');
    page.appendChild(inner);
    probe.append(page, el('div', 'page right'));
    this.book.appendChild(probe);
    try {
      const cs = getComputedStyle(page);
      const pageHeight = page.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      return buildSections(record, entry, { utcOffset: playerTime(record), pageHeight, measure: measureInDom(inner) });
    } finally {
      probe.remove();
    }
  }

  // Rebuilds the section spreads for the new page size and redraws the current route without transition.
  async repaginate() {
    if (this.busy) { this.again = true; return; }
    if (!this.current || !this.route || this.route.view === 'register') return;
    this.busy = true;
    try {
      const { record, entry } = this.current;
      this.current.sections = await this.buildSectionsFor(record, entry);
      const route = resolveRoute(this.route, this.index, this.pageCounts());
      if (toHash(route) !== toHash(this.route)) history.replaceState(null, '', toHash(route));
      this.draw(route);
      this.route = route;
    } catch (e) {
      recoverState(this);
      this.showError(e);
    } finally {
      this.busy = false;
    }
    if (this.again) { this.again = false; await this.repaginate(); }
  }

  entryName() {
    return this.current.entry.displayName ?? this.current.entry.name;
  }

  embossing(route) {
    if (route.view === 'register') return { title: 'Chronik der Ewigen', sub: 'Heldenregister' };
    const title = this.entryName();
    return { title, sub: route.view === 'chapter' ? 'Inhalt' : SECTION_TITLES[route.section] };
  }

  draw(route) {
    const counts = this.pageCounts();
    let pages;
    let pn;
    if (route.view === 'register') {
      pages = renderRegister(this.index);
      pn = ['', ''];
      document.title = 'Chronik der Ewigen';
    } else if (route.view === 'chapter') {
      pages = renderChapter(this.current.record, this.current.entry, counts);
      pn = ['1', '2'];
      document.title = `${this.entryName()} – Chronik der Ewigen`;
    } else {
      // Section spreads come from buildSections.
      pages = this.current.sections[route.section][route.page - 1];
      const first = firstPageNumbers(counts)[route.section] + (route.page - 1) * 2;
      pn = [String(first), String(first + 1)];
      document.title = `${SECTION_TITLES[route.section]} – ${this.entryName()}`;
    }
    this.renderSpread(pages.left, pages.right, pn);
    this.nav = neighbours(route, counts);
    this.cornerL.hidden = !this.nav.prev;
    this.cornerR.hidden = !this.nav.next;
  }

  renderSpread(left, right, pageNumbers) {
    const mk = (side, content, pn) => {
      const page = el('div', `page ${side}`);
      if (pn) page.dataset.pn = pn;
      page.appendChild(content);
      return page;
    };
    this.spread.replaceChildren(mk('left', left, pageNumbers[0]), mk('right', right, pageNumbers[1]));
  }

  // Runs `swap` (which draws the new spread) in the middle of the transition.
  async transition(kind, embossing, swap = () => {}) {
    if (kind === 'lid') {
      const lid = el('div', 'lid closing');
      lid.appendChild(el('div', 'face in'));
      const out = el('div', 'face out');
      out.appendChild(el('div', 'emb', embossing?.title ?? ''));
      out.appendChild(el('div', 'orn', '✦ ✦ ✦'));
      out.appendChild(el('div', 'sub', embossing?.sub ?? ''));
      lid.appendChild(out);
      this.book.appendChild(lid);
      await wait(this.spread.childNodes.length ? 900 : 0);
      this.book.classList.add('closed');
      swap();
      await wait(650);
      this.book.classList.remove('closed');
      lid.classList.replace('closing', 'opening');
      await wait(950);
      lid.remove();
    } else if (kind === 'fade' && this.spread.childNodes.length) {
      this.spread.className = 'spread fade out';
      await wait(250);
      swap();
      this.spread.className = 'spread fade';
      await wait(350);
      this.spread.className = 'spread';
    } else {
      swap();
    }
  }
}
