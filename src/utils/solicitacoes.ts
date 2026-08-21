import type { SolicitacaoClinica } from '../types/prenatal';

// Único ponto que resolve "qual SolicitacaoClinica pertence a este
// atendimento" (por consultaEvolucaoId) — UX-03.1. Antes disso, App.tsx
// (solicitacaoExistenteDoAtendimento, pro modal de edição) e
// PatientAppScreen.tsx (card mobile de Evolução) tinham cada um seu próprio
// .find() equivalente; consolidados aqui pra desktop e mobile sempre lerem
// a solicitação vinculada do mesmo jeito, sem duas implementações que
// possam divergir no futuro.
export function encontrarSolicitacaoDoAtendimento(
  solicitacoes: SolicitacaoClinica[] | undefined,
  consultaEvolucaoId: string | null | undefined
): SolicitacaoClinica | undefined {
  if (!consultaEvolucaoId) return undefined;
  return (solicitacoes || []).find((s) => s.consultaEvolucaoId === consultaEvolucaoId);
}
