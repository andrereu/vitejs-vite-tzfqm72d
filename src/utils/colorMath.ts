// Conversões de cor genéricas (hex ↔ rgb ↔ hsl) e combinações harmônicas,
// usadas pelo picker em roda de cores do tema por médica (ColorWheelPicker).
// Ficam separadas de theme.ts porque theme.ts é sobre DERIVAR as variáveis
// de marca do app a partir de UMA cor — isto aqui é matemática de cor pura,
// sem nada específico do MaternaIA.

export const HEX_RE = /^#([0-9a-f]{6})$/i;

export function isValidHex(hex: string): boolean {
  return HEX_RE.test(hex);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = HEX_RE.exec(hex);
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function componentToHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

export interface Hsl {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export function rgbToHsl(r: number, g: number, b: number): Hsl {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = 60 * (((g - b) / d) % 6);
        break;
      case g:
        h = 60 * ((b - r) / d + 2);
        break;
      default:
        h = 60 * ((r - g) / d + 4);
    }
  }
  if (h < 0) h += 360;
  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function hexToHsl(hex: string): Hsl | null {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;
}

export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

export type HarmonyType = 'complementar' | 'analoga' | 'triadica' | 'tetradica';

const HARMONY_OFFSETS: Record<HarmonyType, number[]> = {
  complementar: [0, 180],
  analoga: [0, -30, 30],
  triadica: [0, 120, 240],
  tetradica: [0, 90, 180, 270],
};

// Gira o matiz (hue) da cor base pelos ângulos da combinação escolhida,
// mantendo saturação e luminosidade — a mesma lógica de "roda de cores"
// de qualquer picker, adaptada pra nomenclatura em português.
export function getHarmonyColors(hex: string, type: HarmonyType): string[] {
  const hsl = hexToHsl(hex);
  if (!hsl) return [];
  return HARMONY_OFFSETS[type].map((offset) => hslToHex(hsl.h + offset, hsl.s, hsl.l));
}
