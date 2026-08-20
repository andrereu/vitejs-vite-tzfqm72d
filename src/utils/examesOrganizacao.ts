import type { Patient } from '../types/prenatal';

export interface ItemExameNaData {
  exameId: string;
  label: string;
  resultado: string;
}

export interface GrupoExamesPorData {
  data: string; // YYYY-MM-DD
  itens: ItemExameNaData[];
}

// D2.3 — agrupa a tabela de exames (hoje: um histórico de resultados por
// exame) numa lista de grupos por DATA, mais recente primeiro, do jeito
// que a Dra. pediu ("labs em tabela organizado por data"). Não decompõe
// `resultado` em valor/unidade/referência — esse campo é texto livre desde
// sempre (ex: "12.8 g/dL / 38%"), não existe estrutura pra separar isso sem
// inventar dado; cada item mostra exatamente o texto já salvo.
export function agruparExamesTabelaPorData(
  examesTabela: Patient['examesTabela'] | undefined,
  listaOficial: Array<{ id: string; label: string }>
): GrupoExamesPorData[] {
  const labelPorId = new Map(listaOficial.map((e) => [e.id, e.label]));
  const porData = new Map<string, ItemExameNaData[]>();

  for (const [exameId, historico] of Object.entries(examesTabela || {})) {
    for (const resultado of historico) {
      if (!resultado?.data) continue;
      const item: ItemExameNaData = {
        exameId,
        label: labelPorId.get(exameId) || exameId,
        resultado: resultado.resultado
      };
      const lista = porData.get(resultado.data) || [];
      lista.push(item);
      porData.set(resultado.data, lista);
    }
  }

  return Array.from(porData.entries())
    .map(([data, itens]) => ({ data, itens }))
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
}
