export const clamp = (min: number, max: number, value: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const rgb2yuv = (
  r: number,
  g: number,
  b: number
): [number, number, number] => {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const u = 0.492 * (b - y);
  const v = 0.877 * (r - y);
  return [y, u, v];
};

export const yuv2rgb = (
  y: number,
  u: number,
  v: number
): [number, number, number] => {
  const r = y + 1.14 * v;
  const g = y - 0.395 * u - 0.581 * v;
  const b = y + 2.033 * u;
  return [r, g, b];
};

export const rgbDistance = (
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number => {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

export const gammaIn = (value: number): number => {
  return Math.pow(value / 255, 2.2) * 255;
};

export const gammaOut = (value: number): number => {
  return Math.pow(value / 255, 1 / 2.2) * 255;
};
