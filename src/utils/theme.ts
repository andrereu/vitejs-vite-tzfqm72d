// Tema por médica (prompt 5/8 da reforma visual): cada médica escolhe UMA cor
// principal pro consultório (DoctorTenant.corPrimaria) e as outras variáveis
// de marca (--brand-primary-border, --brand-on-primary, --brand-on-primary-muted)
// são derivadas dela aqui, em vez de pedir 4 hex diferentes — ninguém escolhe
// "cor do texto sobre o cabeçalho" sozinho, isso é detalhe de contraste.

const HEX_RE = /^#([0-9a-f]{6})$/i;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = HEX_RE.exec(hex);
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}

// Mistura `hex` em direção a `target` (também hex) por `amount` (0 a 1).
function mix(hex: string, target: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  if (!a || !b) return hex;
  const r = a.r + (b.r - a.r) * amount;
  const g = a.g + (b.g - a.g) * amount;
  const bl = a.b + (b.b - a.b) * amount;
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

// Luminância relativa (WCAG) — decide se a cor escolhida é "clara" (precisa
// de texto escuro em cima) ou "escura" (precisa de texto claro em cima).
function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const BRAND_THEME_VARS = [
  '--brand-primary',
  '--brand-primary-border',
  '--brand-on-primary',
  '--brand-on-primary-muted',
] as const;

export type BrandThemeVars = Record<(typeof BRAND_THEME_VARS)[number], string>;

// Retorna as 4 variáveis derivadas de `corPrimaria`, ou null se não for um hex
// válido (inclui undefined/'' — médica sem tema customizado, usa o padrão do
// index.css sem nenhuma sobrescrita).
export function buildBrandTheme(corPrimaria: string | undefined | null): BrandThemeVars | null {
  if (!corPrimaria || !HEX_RE.test(corPrimaria)) return null;

  const isLight = relativeLuminance(corPrimaria) > 0.55;
  const tintTarget = isLight ? '#000000' : '#ffffff';

  return {
    '--brand-primary': corPrimaria,
    '--brand-primary-border': mix(corPrimaria, tintTarget, 0.12),
    '--brand-on-primary': mix(corPrimaria, tintTarget, isLight ? 0.75 : 0.87),
    '--brand-on-primary-muted': mix(corPrimaria, tintTarget, isLight ? 0.45 : 0.55),
  };
}
