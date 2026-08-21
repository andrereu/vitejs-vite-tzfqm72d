// D2-CID-3C — transições de valor do campo Diagnóstico (CidAutocomplete) e
// compatibilidade com registros antigos, isoladas em funções puras pra
// serem testáveis sem precisar renderizar React (o projeto não tem
// infraestrutura de teste de componente — ver diagnostico.test.ts).
import type { DiagnosticoRegistrado } from '../types/prenatal';

// Texto digitado livremente (sem selecionar nenhuma sugestão) — nunca tem
// código. Cobre tanto "escrever um diagnóstico novo" quanto "editar a
// descrição depois de já ter selecionado uma sugestão": o código antigo
// nunca fica silenciosamente associado a um texto diferente, porque digitar
// SEMPRE produz um valor sem código — só selecionar uma sugestão (
// valorParaSelecao) associa um código, de novo.
export function valorParaTextoLivre(texto: string): DiagnosticoRegistrado | undefined {
  return texto.trim() ? { descricao: texto } : undefined;
}

// Selecionar uma sugestão é a ÚNICA ação que associa um código — sempre
// explícita (clique ou Enter num item da lista), nunca automática.
export function valorParaSelecao(codigo: string, descricao: string): DiagnosticoRegistrado {
  return { codigo, descricao };
}

// Exibição em texto do diagnóstico já registrado — mesmo formato em toda
// leitura (card mobile da Evolução, UX-03): "CÓDIGO — descrição" quando veio
// de uma seleção do CID, só a descrição quando é texto livre ou registro
// antigo. Nunca expõe score/origem/distância — esses dados nem chegam a
// existir aqui, DiagnosticoRegistrado só guarda codigo/descricao.
export function formatarDiagnostico(d: DiagnosticoRegistrado | undefined): string {
  if (!d) return '';
  return d.codigo ? `${d.codigo} — ${d.descricao}` : d.descricao;
}

// Normaliza o valor de diagnostico vindo do Firestore: registros salvos
// antes da D2-CID-3C guardavam uma string solta ("Cefaleia"); registros
// novos guardam { codigo?, descricao }. Convertido na leitura (mesmo padrão
// de normalizarExamesTabela em usePatients.ts) — nenhuma migração, nenhuma
// regravação em massa.
export function normalizarDiagnostico(raw: unknown): DiagnosticoRegistrado | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'string') return raw.trim() ? { descricao: raw } : undefined;
  if (typeof raw === 'object' && 'descricao' in (raw as Record<string, unknown>)) {
    const obj = raw as { codigo?: unknown; descricao?: unknown };
    const descricao = typeof obj.descricao === 'string' ? obj.descricao : '';
    if (!descricao.trim()) return undefined;
    return typeof obj.codigo === 'string' && obj.codigo
      ? { codigo: obj.codigo, descricao }
      : { descricao };
  }
  return undefined;
}
