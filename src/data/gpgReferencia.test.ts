// UX-04 — testes da classificação por IMC e da referência de GPG. Cobre os
// itens 1-9 e 13 da bateria pedida na fase (10-12 são de tabela/alternância/
// render, cobertos por funções puras equivalentes em gpgTabela.test.ts e por
// leitura de código, já que o projeto não tem infra de teste de componente).
import { describe, expect, it } from 'vitest';
import { FAIXAS_GPG, calcularIMCInicial, classificarPorIMC, obterReferenciaGPG } from './gpgReferencia';

describe('classificarPorIMC — limites exatamente como fornecidos pela Dra.', () => {
  it('1. IMC < 18,5 → baixo peso', () => {
    expect(classificarPorIMC(18.4).categoria).toBe('baixo_peso');
  });
  it('2. IMC = 18,5 → eutrofia (limite inferior inclusivo)', () => {
    expect(classificarPorIMC(18.5).categoria).toBe('eutrofia');
  });
  it('3. IMC = 24,9 → eutrofia', () => {
    expect(classificarPorIMC(24.9).categoria).toBe('eutrofia');
  });
  it('4. IMC = 25,0 → sobrepeso (limite inferior inclusivo)', () => {
    expect(classificarPorIMC(25.0).categoria).toBe('sobrepeso');
  });
  it('5. IMC = 29,9 → sobrepeso', () => {
    expect(classificarPorIMC(29.9).categoria).toBe('sobrepeso');
  });
  it('6. IMC = 30,0 → obesidade (limite inferior inclusivo, sem teto)', () => {
    expect(classificarPorIMC(30.0).categoria).toBe('obesidade');
  });
});

describe('calcularIMCInicial — sem o fallback de 60kg/1,65m (seção 6 da fase)', () => {
  it('7. peso e altura válidos → IMC correto', () => {
    expect(calcularIMCInicial('60', '1.65')).toBeCloseTo(60 / (1.65 * 1.65), 5);
  });
  it('8. sem peso inicial → null (nunca assume 60kg)', () => {
    expect(calcularIMCInicial('', '1.65')).toBeNull();
    expect(calcularIMCInicial(undefined, '1.65')).toBeNull();
  });
  it('9. sem altura → null (nunca assume 1,65m)', () => {
    expect(calcularIMCInicial('60', '')).toBeNull();
    expect(calcularIMCInicial('60', undefined)).toBeNull();
  });
  it('valores inválidos (não numéricos, zero, negativos) → null, não quebra', () => {
    expect(calcularIMCInicial('abc', '1.65')).toBeNull();
    expect(calcularIMCInicial('60', '0')).toBeNull();
    expect(calcularIMCInicial('-10', '1.65')).toBeNull();
  });
});

describe('obterReferenciaGPG', () => {
  it('7. dados completos → faixa correta (ex: IMC 22,4 → eutrofia)', () => {
    // 61 / 1.65^2 ≈ 22,4
    const ref = obterReferenciaGPG('61', '1.65');
    expect(ref.imcInicial).toBeCloseTo(22.4, 1);
    expect(ref.faixa?.categoria).toBe('eutrofia');
  });

  it('8/9. peso ou altura ausentes → sem faixa (nunca uma faixa aproximada)', () => {
    expect(obterReferenciaGPG(undefined, '1.65')).toEqual({ imcInicial: null, faixa: null });
    expect(obterReferenciaGPG('60', undefined)).toEqual({ imcInicial: null, faixa: null });
  });
});

describe('FAIXAS_GPG — estrutura fornecida pela Dra., sem uniformizar percentis', () => {
  it('13. cada categoria tem exatamente os percentis fornecidos (quantidades diferentes de propósito)', () => {
    const porCategoria = Object.fromEntries(FAIXAS_GPG.map((f) => [f.categoria, f.percentis]));
    expect(porCategoria.baixo_peso).toEqual(['P10', 'P18', 'P34', 'P50', 'P90']);
    expect(porCategoria.eutrofia).toEqual(['P10', 'P34', 'P50', 'P90']);
    expect(porCategoria.sobrepeso).toEqual(['P10', 'P18', 'P27', 'P50', 'P90']);
    expect(porCategoria.obesidade).toEqual(['P10', 'P27', 'P38', 'P50', 'P90']);
  });

  it('ganho total até 40 semanas bate exatamente com os valores fornecidos', () => {
    expect(FAIXAS_GPG.find((f) => f.categoria === 'baixo_peso')?.ganhoTotal).toEqual({ min: 9.7, max: 12.2 });
    expect(FAIXAS_GPG.find((f) => f.categoria === 'eutrofia')?.ganhoTotal).toEqual({ min: 8, max: 12 });
    expect(FAIXAS_GPG.find((f) => f.categoria === 'sobrepeso')?.ganhoTotal).toEqual({ min: 7, max: 9 });
    expect(FAIXAS_GPG.find((f) => f.categoria === 'obesidade')?.ganhoTotal).toEqual({ min: 5, max: 7.2 });
  });

  it('UX-04.4 — percentisFaixaCentral bate com a relação validada contra as imagens na UX-04.2', () => {
    const porCategoria = Object.fromEntries(FAIXAS_GPG.map((f) => [f.categoria, f.percentisFaixaCentral]));
    expect(porCategoria.baixo_peso).toEqual(['P18', 'P34']);
    expect(porCategoria.eutrofia).toEqual(['P10', 'P34']);
    expect(porCategoria.sobrepeso).toEqual(['P18', 'P27']);
    expect(porCategoria.obesidade).toEqual(['P27', 'P38']);
  });

  it('UX-04.4 — os dois percentis da faixa central sempre existem em percentis (nunca um rótulo inventado)', () => {
    for (const faixa of FAIXAS_GPG) {
      expect(faixa.percentis).toContain(faixa.percentisFaixaCentral[0]);
      expect(faixa.percentis).toContain(faixa.percentisFaixaCentral[1]);
    }
  });

  it('nenhuma categoria usa cor de status já reservada (success/warning/danger) para a categoria de IMC', () => {
    const coresReservadas = ['bg-emerald', 'bg-amber', 'bg-rose', 'bg-red', 'bg-green'];
    for (const faixa of FAIXAS_GPG) {
      expect(coresReservadas.some((c) => faixa.corBadge.startsWith(c))).toBe(false);
    }
  });
});
