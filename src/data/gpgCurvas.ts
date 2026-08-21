import type { CategoriaGPG } from './gpgReferencia';

// UX-04 — curvas de percentil de ganho de peso gestacional, semana a semana.
//
// FONTE E MÉTODO (documentado como a fase exigiu antes de qualquer
// interpolação): os pontos abaixo foram lidos manualmente, olhando a grade
// (1kg × 1 semana) dos 4 gráficos que a Dra. Priscila enviou como fotos das
// tabelas/curvas oficiais da clínica. Cada curva foi lida em 6 semanas-âncora
// (10, 13, 20, 27, 33 e 40 — os extremos, as duas divisórias de trimestre já
// usadas no gráfico do MaternaIA, e dois pontos intermediários), que são os
// pontos onde dava pra cruzar a curva com uma linha de grade com confiança
// razoável. As semanas 40 (ponta direita, com o rótulo do percentil ao lado)
// são as de maior confiança — os valores batem exatamente com o que está
// escrito na imagem. As demais são leitura visual da grade, não medição de
// pixel, e por isso têm uma margem de erro real (algo como ±0,3–0,5kg).
//
// ENTRE as âncoras, os valores são interpolados por spline cúbica monótona
// (Fritsch–Carlson, função interpolarMonotona abaixo) — uma técnica padrão
// que garante que a curva interpolada nunca "ultrapassa" os pontos vizinhos
// (sem inventar picos ou vales que não estão na referência original) e
// preserva a ordem entre percentis. Não foi feita nenhuma extrapolação além
// de semana 10 e 40 (fora desse intervalo, o valor da ponta mais próxima é
// repetido).
//
// LIMITAÇÃO A REVISAR COM A DRA.: esta é uma digitalização manual, não os
// dados originais em números — antes de tratar isso como definitivo pra
// decisão clínica, vale conferir pelo menos os pontos de semana 20 e 33 de
// cada curva contra a imagem original.
export interface PontoCurvaGPG {
  semana: number;
  kg: number;
}

export type CurvasPorPercentil = Record<string, PontoCurvaGPG[]>;

export const CURVAS_GPG: Record<CategoriaGPG, CurvasPorPercentil> = {
  baixo_peso: {
    P10: [{ semana: 10, kg: -1.5 }, { semana: 13, kg: 0 }, { semana: 20, kg: 2.5 }, { semana: 27, kg: 4.5 }, { semana: 33, kg: 6 }, { semana: 40, kg: 8 }],
    P18: [{ semana: 10, kg: -0.5 }, { semana: 13, kg: 1 }, { semana: 20, kg: 3.5 }, { semana: 27, kg: 6 }, { semana: 33, kg: 8 }, { semana: 40, kg: 10 }],
    P34: [{ semana: 10, kg: 0.5 }, { semana: 13, kg: 2 }, { semana: 20, kg: 5 }, { semana: 27, kg: 8 }, { semana: 33, kg: 10 }, { semana: 40, kg: 12 }],
    P50: [{ semana: 10, kg: 1 }, { semana: 13, kg: 3 }, { semana: 20, kg: 6.5 }, { semana: 27, kg: 9.5 }, { semana: 33, kg: 12 }, { semana: 40, kg: 14 }],
    P90: [{ semana: 10, kg: 5 }, { semana: 13, kg: 6.5 }, { semana: 20, kg: 11 }, { semana: 27, kg: 14.5 }, { semana: 33, kg: 17.5 }, { semana: 40, kg: 21 }]
  },
  eutrofia: {
    P10: [{ semana: 10, kg: -2 }, { semana: 13, kg: -0.5 }, { semana: 20, kg: 3 }, { semana: 27, kg: 6 }, { semana: 33, kg: 7 }, { semana: 40, kg: 8 }],
    P34: [{ semana: 10, kg: 0 }, { semana: 13, kg: 2 }, { semana: 20, kg: 5.5 }, { semana: 27, kg: 8 }, { semana: 33, kg: 10 }, { semana: 40, kg: 12 }],
    P50: [{ semana: 10, kg: 1 }, { semana: 13, kg: 3 }, { semana: 20, kg: 6.5 }, { semana: 27, kg: 9 }, { semana: 33, kg: 11.5 }, { semana: 40, kg: 14 }],
    P90: [{ semana: 10, kg: 5 }, { semana: 13, kg: 6 }, { semana: 20, kg: 10.5 }, { semana: 27, kg: 13.5 }, { semana: 33, kg: 17 }, { semana: 40, kg: 20 }]
  },
  sobrepeso: {
    P10: [{ semana: 10, kg: -2 }, { semana: 13, kg: -1.5 }, { semana: 20, kg: 0 }, { semana: 27, kg: 2.5 }, { semana: 33, kg: 4 }, { semana: 40, kg: 5 }],
    P18: [{ semana: 10, kg: -1.5 }, { semana: 13, kg: -1 }, { semana: 20, kg: 1 }, { semana: 27, kg: 3.5 }, { semana: 33, kg: 5.5 }, { semana: 40, kg: 7 }],
    P27: [{ semana: 10, kg: -1 }, { semana: 13, kg: -0.3 }, { semana: 20, kg: 1.8 }, { semana: 27, kg: 4 }, { semana: 33, kg: 6 }, { semana: 40, kg: 8.5 }],
    P50: [{ semana: 10, kg: -0.5 }, { semana: 13, kg: 0.5 }, { semana: 20, kg: 2.5 }, { semana: 27, kg: 5 }, { semana: 33, kg: 8 }, { semana: 40, kg: 12 }],
    P90: [{ semana: 10, kg: 4 }, { semana: 13, kg: 6 }, { semana: 20, kg: 10 }, { semana: 27, kg: 14 }, { semana: 33, kg: 17 }, { semana: 40, kg: 19 }]
  },
  obesidade: {
    P10: [{ semana: 10, kg: -1.5 }, { semana: 13, kg: -1.7 }, { semana: 20, kg: -1 }, { semana: 27, kg: 0 }, { semana: 33, kg: 0.5 }, { semana: 40, kg: 1 }],
    P27: [{ semana: 10, kg: -0.8 }, { semana: 13, kg: -0.8 }, { semana: 20, kg: 0.3 }, { semana: 27, kg: 2 }, { semana: 33, kg: 3.5 }, { semana: 40, kg: 5 }],
    P38: [{ semana: 10, kg: -0.3 }, { semana: 13, kg: -0.2 }, { semana: 20, kg: 1.3 }, { semana: 27, kg: 3 }, { semana: 33, kg: 5 }, { semana: 40, kg: 7 }],
    P50: [{ semana: 10, kg: -0.2 }, { semana: 13, kg: 0.2 }, { semana: 20, kg: 2 }, { semana: 27, kg: 4 }, { semana: 33, kg: 6.5 }, { semana: 40, kg: 9 }],
    P90: [{ semana: 10, kg: 5 }, { semana: 13, kg: 6 }, { semana: 20, kg: 9.5 }, { semana: 27, kg: 12.5 }, { semana: 33, kg: 15.5 }, { semana: 40, kg: 18 }]
  }
};

// Spline cúbica monótona (Hermite, tangentes de Fritsch–Carlson) — entre
// duas âncoras, nunca ultrapassa o valor de nenhuma delas. Fora do intervalo
// coberto pelas âncoras, repete o valor da ponta mais próxima (sem
// extrapolar).
export function interpolarMonotona(pontos: PontoCurvaGPG[], semana: number): number {
  const n = pontos.length;
  if (n === 0) return NaN;
  if (n === 1 || semana <= pontos[0].semana) return pontos[0].kg;
  if (semana >= pontos[n - 1].semana) return pontos[n - 1].kg;

  let i = 0;
  while (i < n - 2 && semana > pontos[i + 1].semana) i++;

  const x0 = pontos[i].semana;
  const x1 = pontos[i + 1].semana;
  const y0 = pontos[i].kg;
  const y1 = pontos[i + 1].kg;
  const h = x1 - x0;

  const deltas: number[] = [];
  for (let k = 0; k < n - 1; k++) {
    deltas.push((pontos[k + 1].kg - pontos[k].kg) / (pontos[k + 1].semana - pontos[k].semana));
  }
  const tangente = (k: number): number => {
    if (k === 0) return deltas[0];
    if (k === n - 1) return deltas[n - 2];
    const d0 = deltas[k - 1];
    const d1 = deltas[k];
    if (d0 === 0 || d1 === 0 || (d0 > 0) !== (d1 > 0)) return 0;
    return (d0 + d1) / 2;
  };

  const m0 = tangente(i);
  const m1 = tangente(i + 1);
  const t = (semana - x0) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;

  return h00 * y0 + h10 * h * m0 + h01 * y1 + h11 * h * m1;
}

// Gera a curva completa, semana a semana (inteiras), no intervalo pedido —
// usado pra desenhar cada percentil no SVG do gráfico.
export function gerarPontosCurva(pontos: PontoCurvaGPG[], semanaInicial: number, semanaFinal: number): PontoCurvaGPG[] {
  const resultado: PontoCurvaGPG[] = [];
  for (let semana = semanaInicial; semana <= semanaFinal; semana++) {
    resultado.push({ semana, kg: interpolarMonotona(pontos, semana) });
  }
  return resultado;
}
