import { describe, it, expect } from 'vitest';
import { buildBrandTheme } from './theme';

describe('buildBrandTheme', () => {
  it('sem cor customizada (undefined ou vazia), não sobrescreve nada', () => {
    expect(buildBrandTheme(undefined)).toBeNull();
    expect(buildBrandTheme('')).toBeNull();
  });

  it('hex inválido é ignorado (não trava o app com uma cor quebrada)', () => {
    expect(buildBrandTheme('verde')).toBeNull();
    expect(buildBrandTheme('#fff')).toBeNull(); // só aceita hex de 6 dígitos
    expect(buildBrandTheme('2E482A')).toBeNull(); // sem '#'
  });

  it('cor escura vira --brand-primary e ganha texto/borda claros', () => {
    const theme = buildBrandTheme('#2E482A');
    expect(theme).not.toBeNull();
    expect(theme!['--brand-primary']).toBe('#2E482A');
    // on-primary e on-primary-muted precisam ser bem mais claros que o fundo
    // escuro, senão o texto do cabeçalho fica ilegível.
    expect(theme!['--brand-on-primary'].toLowerCase()).not.toBe('#2e482a');
    expect(theme!['--brand-on-primary-muted'].toLowerCase()).not.toBe('#2e482a');
  });

  it('cor clara (ex: uma médica escolhe um rosa pastel) usa texto escuro em cima, não claro', () => {
    const theme = buildBrandTheme('#F5D7E3'); // rosa bem claro
    expect(theme).not.toBeNull();
    // Misturado em direção ao preto, não ao branco — senão o texto do
    // cabeçalho quase desaparece sobre um fundo já claro.
    const onPrimary = theme!['--brand-on-primary'];
    const r = parseInt(onPrimary.slice(1, 3), 16);
    const g = parseInt(onPrimary.slice(3, 5), 16);
    const b = parseInt(onPrimary.slice(5, 7), 16);
    const primaryR = parseInt('F5', 16);
    expect(r).toBeLessThan(primaryR);
    expect(g).toBeLessThan(primaryR);
    expect(b).toBeLessThan(primaryR);
  });
});
