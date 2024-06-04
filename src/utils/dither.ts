export class IndexedColor {
  private colors: [number, number, number][];

  constructor(colors: [number, number, number][]) {
    this.colors = colors;
  }

  encode(r: number, g: number, b: number): number {
    let minDistance = Infinity;
    let minIndex = 0;

    for (let i = 0; i < this.colors.length; i++) {
      const [cr, cg, cb] = this.colors[i];
      const distance = rgbDistance(r, g, b, cr, cg, cb);
      if (distance < minDistance) {
        minDistance = distance;
        minIndex = i;
      }
    }

    return minIndex;
  }

  decode(index: number): [number, number, number] {
    return this.colors[index];
  }
}

export class PackedYUV {
  private bits: number[];

  constructor(...bits: number[]) {
    this.bits = bits;
  }

  encode(r: number, g: number, b: number): number {
    const [y, u, v] = rgb2yuv(r, g, b);
    const yBits = Math.round((y / 255) * ((1 << this.bits[0]) - 1));
    const uBits = Math.round(((u + 0.5) / 255) * ((1 << this.bits[1]) - 1));
    const vBits = Math.round(((v + 0.5) / 255) * ((1 << this.bits[2]) - 1));
    return (
      (yBits << (this.bits[1] + this.bits[2])) | (uBits << this.bits[2]) | vBits
    );
  }

  decode(value: number): [number, number, number] {
    const yBits =
      (value >> (this.bits[1] + this.bits[2])) & ((1 << this.bits[0]) - 1);
    const uBits = (value >> this.bits[2]) & ((1 << this.bits[1]) - 1);
    const vBits = value & ((1 << this.bits[2]) - 1);
    const y = (yBits / ((1 << this.bits[0]) - 1)) * 255;
    const u = (uBits / ((1 << this.bits[1]) - 1)) * 255 - 0.5;
    const v = (vBits / ((1 << this.bits[2]) - 1)) * 255 - 0.5;
    return yuv2rgb(y, u, v);
  }
}

export const diffusions = {
  none: {
    errorDiffusion: [],
    errorScale: 1,
  },
  floydSteinberg: {
    errorDiffusion: [
      [1, 0, 7 / 16],
      [-1, 1, 3 / 16],
      [0, 1, 5 / 16],
      [1, 1, 1 / 16],
    ],
    errorScale: 1,
  },
  atkinson: {
    errorDiffusion: [
      [1, 0, 1 / 8],
      [2, 0, 1 / 8],
      [-1, 1, 1 / 8],
      [0, 1, 1 / 8],
      [1, 1, 1 / 8],
      [0, 2, 1 / 8],
    ],
    errorScale: 1,
  },
  // Add more diffusion algorithms here
};
