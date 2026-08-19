import { describe, it, expect } from 'vitest';
import { hexToHsl, hslToHex, getHarmonyColors, isValidHex } from './colorMath';

describe('isValidHex', () => {
  it('aceita hex de 6 dígitos com #, rejeita o resto', () => {
    expect(isValidHex('#2E482A')).toBe(true);
    expect(isValidHex('#fff')).toBe(false);
    expect(isValidHex('2E482A')).toBe(false);
    expect(isValidHex('')).toBe(false);
  });
});

describe('hexToHsl / hslToHex', () => {
  it('ida e volta preserva a cor (dentro de arredondamento)', () => {
    const hsl = hexToHsl('#2E482A')!;
    expect(hsl).not.toBeNull();
    const back = hslToHex(hsl.h, hsl.s, hsl.l);
    expect(back.toLowerCase()).toBe('#2e482a');
  });

  it('vermelho puro tem matiz 0 e verde puro tem matiz 120', () => {
    expect(Math.round(hexToHsl('#ff0000')!.h)).toBe(0);
    expect(Math.round(hexToHsl('#00ff00')!.h)).toBe(120);
  });
});

describe('getHarmonyColors', () => {
  it('complementar gira 180° e devolve 2 cores', () => {
    const colors = getHarmonyColors('#ff0000', 'complementar');
    expect(colors).toHaveLength(2);
    expect(colors[0].toLowerCase()).toBe('#ff0000');
    // vermelho + 180° = ciano
    const secondHue = hexToHsl(colors[1])!.h;
    expect(Math.round(secondHue)).toBe(180);
  });

  it('tetrádica devolve 4 cores', () => {
    expect(getHarmonyColors('#2E482A', 'tetradica')).toHaveLength(4);
  });

  it('hex inválido não quebra, devolve lista vazia', () => {
    expect(getHarmonyColors('não é cor', 'triadica')).toEqual([]);
  });
});
