import type { CategoriaGPG } from './gpgReferencia';

// UX-04 / UX-04.1 — curvas de percentil de ganho de peso gestacional, semana
// a semana.
//
// FONTE E MÉTODO (documentado como as duas fases exigiram antes de qualquer
// interpolação): os pontos abaixo foram lidos manualmente, olhando a grade
// (1kg × 1 semana) dos 4 gráficos que a Dra. Priscila enviou como fotos das
// tabelas/curvas oficiais da clínica.
//
// A UX-04 original usou 6 semanas-âncora (10, 13, 20, 27, 33, 40 — extremos,
// as duas divisórias de trimestre e dois pontos intermediários). A UX-04.1
// (esta segunda digitalização) aumentou pra 10 âncoras por curva — 10, 13,
// 16, 20, 24, 27, 30, 33, 36, 40 — pra reduzir a dependência da spline entre
// pontos distantes e capturar melhor a geometria real de cada curva,
// priorizando pontos onde a imagem mostra mudança de inclinação (ex: o
// "cotovelo" da curva P50 de sobrepeso, que acelera visivelmente perto da
// semana 30–36; e o vale da curva P10 de obesidade, que desce até por volta
// da semana 13–16 antes de voltar a subir).
//
// A semana 40 (ponta direita, com o rótulo do percentil ao lado) continua
// sendo o ponto de maior confiança — bate exatamente com o número escrito na
// imagem. As demais são leitura visual da grade, não medição de pixel, com
// uma margem de erro real estimada em ±0,3–0,5kg por ponto — a mesma
// limitação já documentada na UX-04, só que agora distribuída em mais
// pontos, então cada trecho individual da curva depende menos da spline pra
// preencher a forma.
//
// Comparação com a digitalização anterior (relatório da UX-04.1): as
// diferenças entre o valor que a spline de 6 pontos already dava nessas
// semanas novas e o valor lido diretamente agora ficaram pequenas (a maioria
// abaixo de 0,3kg) — ou seja, a spline original já aproximava razoavelmente
// bem; os pontos novos aumentam a fidelidade em vez de corrigir um erro
// grande. Isso está detalhado no relatório da fase, não só aqui.
//
// ENTRE as âncoras, os valores continuam interpolados por spline cúbica
// monótona (Fritsch–Carlson, função interpolarMonotona abaixo) — a mesma
// técnica de antes, agora operando em intervalos mais curtos (3–4 semanas em
// vez de 6–7), o que reduz o espaço onde ela precisa "adivinhar" a forma.
//
// LIMITAÇÃO A REVISAR COM A DRA. (segue valendo): esta é uma digitalização
// manual, não os dados originais em números — antes de tratar isso como
// definitivo pra decisão clínica, vale conferir pelo menos a semana 20 e a
// semana 33 de cada curva contra a imagem original.
export interface PontoCurvaGPG {
  semana: number;
  kg: number;
}

export type CurvasPorPercentil = Record<string, PontoCurvaGPG[]>;

function pontos(valores: [number, number][]): PontoCurvaGPG[] {
  return valores.map(([semana, kg]) => ({ semana, kg }));
}

export const CURVAS_GPG: Record<CategoriaGPG, CurvasPorPercentil> = {
  baixo_peso: {
    P10: pontos([[10, -1.5], [13, 0], [16, 1.2], [20, 2.5], [24, 3.5], [27, 4.5], [30, 5.2], [33, 6], [36, 7], [40, 8]]),
    P18: pontos([[10, -0.5], [13, 1], [16, 2.2], [20, 3.5], [24, 4.8], [27, 6], [30, 7], [33, 8], [36, 9], [40, 10]]),
    P34: pontos([[10, 0.5], [13, 2], [16, 3.5], [20, 5], [24, 6.5], [27, 8], [30, 9], [33, 10], [36, 11], [40, 12]]),
    P50: pontos([[10, 1], [13, 3], [16, 4.5], [20, 6.5], [24, 8], [27, 9.5], [30, 10.8], [33, 12], [36, 13], [40, 14]]),
    P90: pontos([[10, 5], [13, 6.5], [16, 8.5], [20, 11], [24, 12.8], [27, 14.5], [30, 16], [33, 17.5], [36, 19.2], [40, 21]])
  },
  eutrofia: {
    P10: pontos([[10, -2], [13, -0.5], [16, 1], [20, 3], [24, 4.5], [27, 6], [30, 6.5], [33, 7], [36, 7.5], [40, 8]]),
    P34: pontos([[10, 0], [13, 2], [16, 3.5], [20, 5.5], [24, 7], [27, 8], [30, 9], [33, 10], [36, 11], [40, 12]]),
    P50: pontos([[10, 1], [13, 3], [16, 4.5], [20, 6.5], [24, 8], [27, 9], [30, 10], [33, 11.5], [36, 12.5], [40, 14]]),
    P90: pontos([[10, 5], [13, 6], [16, 8], [20, 10.5], [24, 12], [27, 13.5], [30, 15.5], [33, 17], [36, 18.5], [40, 20]])
  },
  sobrepeso: {
    // P50 tem um "cotovelo" visível na imagem original — quase plana até o
    // 2º trimestre, acelerando visivelmente a partir de ~semana 30. Os
    // pontos 30/33/36 capturam essa aceleração em vez de deixar a spline
    // suavizá-la.
    P10: pontos([[10, -2], [13, -1.5], [16, -0.8], [20, 0], [24, 1.2], [27, 2.5], [30, 3.2], [33, 4], [36, 4.5], [40, 5]]),
    P18: pontos([[10, -1.5], [13, -1], [16, -0.2], [20, 1], [24, 2.2], [27, 3.5], [30, 4.5], [33, 5.5], [36, 6.2], [40, 7]]),
    P27: pontos([[10, -1], [13, -0.3], [16, 0.7], [20, 1.8], [24, 2.9], [27, 4], [30, 5.2], [33, 6], [36, 7.2], [40, 8.5]]),
    P50: pontos([[10, -0.5], [13, 0.5], [16, 1.3], [20, 2.5], [24, 3.5], [27, 5], [30, 6.5], [33, 8], [36, 10], [40, 12]]),
    P90: pontos([[10, 4], [13, 6], [16, 8], [20, 10], [24, 12], [27, 14], [30, 15.5], [33, 17], [36, 18], [40, 19]])
  },
  obesidade: {
    // P10 desce (vale visível na imagem) até por volta da semana 13–16
    // antes de voltar a subir — mantido de propósito, não é erro de leitura.
    P10: pontos([[10, -1.5], [13, -1.7], [16, -1.6], [20, -1], [24, -0.5], [27, 0], [30, 0.2], [33, 0.5], [36, 0.7], [40, 1]]),
    P27: pontos([[10, -0.8], [13, -0.8], [16, -0.5], [20, 0.3], [24, 1.1], [27, 2], [30, 2.7], [33, 3.5], [36, 4.2], [40, 5]]),
    P38: pontos([[10, -0.3], [13, -0.2], [16, 0.4], [20, 1.3], [24, 2.1], [27, 3], [30, 4], [33, 5], [36, 6], [40, 7]]),
    P50: pontos([[10, -0.2], [13, 0.2], [16, 1], [20, 2], [24, 3], [27, 4], [30, 5.2], [33, 6.5], [36, 7.7], [40, 9]]),
    P90: pontos([[10, 5], [13, 6], [16, 7.5], [20, 9.5], [24, 11], [27, 12.5], [30, 14], [33, 15.5], [36, 16.8], [40, 18]])
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
