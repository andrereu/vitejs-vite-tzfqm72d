import type { ConsultaEvolucao } from '../types/prenatal';

export interface LinhaTabelaGPG {
  id: string;
  data: string;
  igSem: number;
  peso: number;
  /** null quando o peso pré-gestacional não pôde ser determinado — nunca usa o fallback de 60kg pra "inventar" um ganho. */
  ganho: number | null;
}

// Linhas da visão "Tabela" do Gráfico GPG (UX-04, seção 13/14) — mesmos
// dados já usados pelo gráfico, sem calcular nada novo além da subtração
// simples peso atual - peso inicial (e só quando o peso inicial é um valor
// real, não o fallback de 60kg que bmiInfo usava).
export function construirTabelaGPG(consultas: ConsultaEvolucao[], pesoInicial: string | undefined): LinhaTabelaGPG[] {
  const p0 = parseFloat(pesoInicial || '');
  const pesoInicialValido = Number.isFinite(p0) && p0 > 0 ? p0 : null;
  return consultas.map((c) => ({
    id: c.id,
    data: c.data,
    igSem: c.igSem,
    peso: c.peso,
    ganho: pesoInicialValido === null ? null : Number((c.peso - pesoInicialValido).toFixed(1))
  }));
}
