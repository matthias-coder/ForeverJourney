const num = (n) => String(Math.round(n * 100) / 100);

// [x, y][] -> SVG path "d" scaled into width x height (y grows upward); '' for no points.
export function linePath(points, width, height, pad = 8) {
  if (!points.length) return '';
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const w = width - 2 * pad, h = height - 2 * pad;
  const sx = (x) => (x1 === x0 ? pad + w / 2 : pad + ((x - x0) / (x1 - x0)) * w);
  const sy = (y) => (y1 === y0 ? pad + h / 2 : pad + h - ((y - y0) / (y1 - y0)) * h);
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${num(sx(x))},${num(sy(y))}`).join(' ');
}
