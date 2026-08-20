import type { AgendaConsulta } from '../types/prenatal';
import { compararAgendamentos } from './agendaScheduling';

// Só confirmada e encaixe_urgente contam como compromisso real e agendável
// — mesmo critério já usado em consultasEmConflitoComBloqueio
// (agendaScheduling.ts) pra decidir o que "ocupa" a agenda de verdade.
// cancelada e realizada nunca são "a próxima"; solicitada também não —
// mesmo com horário preenchido, ela ainda não foi confirmada pela equipe,
// e sem horário ela é só uma preferência de período, não um compromisso
// num horário desconhecido.
export function selecionarProximaConsulta(agendaConsultas: AgendaConsulta[] | undefined): AgendaConsulta | null {
  if (!agendaConsultas || agendaConsultas.length === 0) return null;
  const candidatos = agendaConsultas.filter((a) => a.status === 'confirmada' || a.status === 'encaixe_urgente');
  if (candidatos.length === 0) return null;
  return [...candidatos].sort(compararAgendamentos)[0];
}
