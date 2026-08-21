import { describe, expect, it } from 'vitest';
import { CURVAS_GPG, gerarPontosCurva, interpolarMonotona } from './gpgCurvas';
import { FAIXAS_GPG } from './gpgReferencia';

describe('interpolarMonotona', () => {
  it('12. nas semanas-âncora, devolve exatamente o valor lido da imagem (não aproxima)', () => {
    const pontos = CURVAS_GPG.eutrofia.P50;
    for (const p of pontos) {
      expect(interpolarMonotona(pontos, p.semana)).toBeCloseTo(p.kg, 9);
    }
  });

  it('fora do intervalo coberto, repete a ponta mais próxima em vez de extrapolar', () => {
    const pontos = CURVAS_GPG.eutrofia.P50;
    expect(interpolarMonotona(pontos, 5)).toBe(pontos[0].kg);
    expect(interpolarMonotona(pontos, 45)).toBe(pontos[pontos.length - 1].kg);
  });

  it('entre âncoras, o valor interpolado nunca ultrapassa os dois pontos vizinhos (sem overshoot)', () => {
    const pontos = CURVAS_GPG.baixo_peso.P90;
    for (let semana = 10; semana <= 40; semana += 0.5) {
      // encontra o segmento em que 'semana' cai
      let i = 0;
      while (i < pontos.length - 2 && semana > pontos[i + 1].semana) i++;
      const vizinhoMin = Math.min(pontos[i].kg, pontos[i + 1].kg);
      const vizinhoMax = Math.max(pontos[i].kg, pontos[i + 1].kg);
      const valor = interpolarMonotona(pontos, semana);
      expect(valor).toBeGreaterThanOrEqual(vizinhoMin - 0.001);
      expect(valor).toBeLessThanOrEqual(vizinhoMax + 0.001);
    }
  });
});

describe('gerarPontosCurva', () => {
  it('gera um ponto por semana inteira no intervalo pedido, extremos batendo com as âncoras', () => {
    const pontos = gerarPontosCurva(CURVAS_GPG.sobrepeso.P50, 10, 40);
    expect(pontos).toHaveLength(31);
    expect(pontos[0]).toEqual({ semana: 10, kg: -0.5 });
    expect(pontos[pontos.length - 1]).toEqual({ semana: 40, kg: 12 });
  });
});

describe('13. CURVAS_GPG — mesma quantidade e rótulos de percentil que FAIXAS_GPG, sem uniformizar', () => {
  it('cada categoria tem curva pra cada percentil listado em FAIXAS_GPG, nem mais nem menos', () => {
    for (const faixa of FAIXAS_GPG) {
      const percentisComCurva = Object.keys(CURVAS_GPG[faixa.categoria]).sort();
      expect(percentisComCurva).toEqual([...faixa.percentis].sort());
    }
  });

  it('UX-04.1: cada curva tem exatamente as 10 semanas-âncora documentadas (10, 13, 16, 20, 24, 27, 30, 33, 36, 40)', () => {
    for (const categoria of Object.keys(CURVAS_GPG) as (keyof typeof CURVAS_GPG)[]) {
      for (const pontos of Object.values(CURVAS_GPG[categoria])) {
        expect(pontos.map((p) => p.semana)).toEqual([10, 13, 16, 20, 24, 27, 30, 33, 36, 40]);
      }
    }
  });
});

describe('ordem entre percentis preservada semana a semana (nenhuma curva cruza outra da mesma categoria)', () => {
  it.each(Object.keys(CURVAS_GPG) as (keyof typeof CURVAS_GPG)[])('%s: percentis em ordem ascendente em toda semana de 10 a 40', (categoria) => {
    const faixa = FAIXAS_GPG.find((f) => f.categoria === categoria)!;
    const curvasOrdenadas = faixa.percentis.map((p) => CURVAS_GPG[categoria][p]);
    for (let semana = 10; semana <= 40; semana++) {
      const valores = curvasOrdenadas.map((pontos) => interpolarMonotona(pontos, semana));
      for (let i = 1; i < valores.length; i++) {
        expect(valores[i]).toBeGreaterThanOrEqual(valores[i - 1] - 0.001);
      }
    }
  });
});
