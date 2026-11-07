// Fills pages in order. A block taller than a page gets a page of its own (never cut, never loops).
export function paginate(blocks, pageHeight, measure) {
  const pages = [];
  let page = [];
  let used = 0;
  for (const block of blocks) {
    const h = measure(block);
    if (page.length && used + h > pageHeight) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(block);
    used += h;
  }
  if (page.length) pages.push(page);
  return pages;
}

// Measures a block by mounting block.el invisibly in `container` (a node inside a probe page).
export function measureInDom(container) {
  return (block) => {
    if (block.height != null) return block.height;
    const probe = document.createElement('div');
    probe.style.cssText = 'visibility:hidden;position:absolute;left:0;right:0;top:0;';
    probe.appendChild(block.el);
    container.appendChild(probe);
    const cs = getComputedStyle(block.el);
    const h = block.el.offsetHeight + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
    block.el.remove();
    probe.remove();
    return h;
  };
}
