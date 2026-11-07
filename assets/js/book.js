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

// Decides how the first / next draw starts. Fresh load (route null): a cover shut by beginLoading
// must be opened ('open-lid'); otherwise draw straight away. Narrow screens never use the lid.
export function startKind(from, to, { hasShutLid = false, narrow = false } = {}) {
  if (!from) return hasShutLid && !narrow ? 'open-lid' : 'none';
  const kind = transitionKind(from, to);
  return kind === 'lid' && narrow ? 'fade' : kind;
}

// Re-paginate only when the page size really changed. Narrow: width only (mobile URL bar
// changes the height constantly); wide: width or height by more than 1 px.
export function shouldRepaginate(prev, next, narrow) {
  if (!prev) return true;
  if (narrow) return Math.abs(next.width - prev.width) > 0;
  return Math.abs(next.width - prev.width) > 1 || Math.abs(next.height - prev.height) > 1;
}

// The URL hash needs rewriting when it differs from the canonical one.
export const needsCanonicalHash = (route, currentHash) => toHash(route) !== currentHash;

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

// After busy is released: a queued navigation runs first, then a pending re-pagination.
export function drain(book) {
  if (book.queued) {
    const target = book.queued;
    book.queued = null;
    return book.goto(target);
  }
  if (book.again) {
    book.again = false;
    return book.repaginate();
  }
  return undefined;
}

// Maps a key press to a navigation target (or null). Ignored while the lightbox is open,
// while typing in a form field, or with modifier keys held.
export function keyTarget(e, nav, { lightbox = false, typing = false } = {}) {
  if (lightbox || typing || !nav || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return null;
  if (e.key === 'ArrowLeft') return nav.prev ?? null;
  if (e.key === 'ArrowRight') return nav.next ?? null;
  return null;
}

const isTyping = (t) => !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable === true);

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
    document.addEventListener('keydown', (e) => {
      const target = keyTarget(e, this.nav, { lightbox: !!document.querySelector('.lightbox'), typing: isTyping(e.target) });
      if (target) { e.preventDefault(); this.navigate(target); }
    });
    let timer;
    let size = { width: window.innerWidth, height: window.innerHeight };
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const next = { width: window.innerWidth, height: window.innerHeight };
        if (!shouldRepaginate(size, next, !!window.matchMedia?.(NARROW).matches)) return;
        size = next;
        this.repaginate();
      }, 250);
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
    if (this.index) {
      const a = el('a', 'lnk', 'Zum Heldenregister');
      a.href = toHash({ view: 'register' });
      left.appendChild(el('p', null)).appendChild(a);
    }
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
    await drain(this);
  }

  async run(target) {
    if (target.view !== 'register' && this.current?.id !== target.id) {
      const entry = (this.index.characters ?? []).find((c) => c.id === target.id);
      if (entry) {
        const loading = this.beginLoading(entry);
        let record;
        try {
          [record] = await Promise.all([this.loadCharacter(entry), loading]);
        } finally {
          this.book.classList.remove('loading');
        }
        this.current = { id: entry.id, entry, record, sections: await this.buildSectionsFor(record, entry) };
      }
    }
    const route = resolveRoute(target, this.index, this.pageCounts());
    if (needsCanonicalHash(route, location.hash)) history.replaceState(null, '', toHash(route));
    const narrow = !!window.matchMedia?.(NARROW).matches;
    const hasShutLid = !!this.book.querySelector('.lid.shut');
    const kind = startKind(this.route, route, { hasShutLid, narrow });
    if (kind === 'none' && this.route) return;
    const draw = () => this.draw(route);
    await this.transition(kind === 'open-lid' ? 'lid' : kind, this.embossing(route), draw);
    this.route = route;
  }

  // While a character loads: the cover closes and stays shut ("... wird aufgeschlagen").
  // On narrow screens (fade instead of lid) the spread is only dimmed. Resolves when the cover is shut.
  beginLoading(entry) {
    if (window.matchMedia?.(NARROW).matches) {
      this.book.classList.add('loading');
      return Promise.resolve();
    }
    const lid = this.makeLid({ title: entry.displayName ?? entry.name, sub: '… wird aufgeschlagen' });
    this.book.appendChild(lid);
    return wait(this.spread.childNodes.length ? 900 : 0).then(() => {
      if (!lid.isConnected) return; // loading failed meanwhile and recoverState removed the lid
      this.book.classList.add('closed');
      lid.classList.replace('closing', 'shut');
    });
  }

  makeLid(embossing) {
    const lid = el('div', 'lid closing');
    lid.appendChild(el('div', 'face in'));
    const out = el('div', 'face out');
    out.appendChild(el('div', 'emb', embossing?.title ?? ''));
    out.appendChild(el('div', 'orn', '✦ ✦ ✦'));
    out.appendChild(el('div', 'sub', embossing?.sub ?? ''));
    lid.appendChild(out);
    return lid;
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
    await drain(this);
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
      let lid = this.book.querySelector('.lid.shut');
      if (lid) {
        // Cover already shut by beginLoading: put the final embossing on it and open it.
        lid.querySelector('.emb').textContent = embossing?.title ?? '';
        lid.querySelector('.sub').textContent = embossing?.sub ?? '';
        swap();
      } else {
        lid = this.makeLid(embossing);
        this.book.appendChild(lid);
        await wait(this.spread.childNodes.length ? 900 : 0);
        this.book.classList.add('closed');
        swap();
      }
      await wait(650);
      this.book.classList.remove('closed');
      lid.classList.remove('closing', 'shut');
      lid.classList.add('opening');
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
