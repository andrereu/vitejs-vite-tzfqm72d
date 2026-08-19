import type { AgendaConsulta, HorarioBloqueado } from '../types/prenatal';

// Ordem de exibição pra desempatar solicitações que ainda não têm horário
// definido (nenhum horario == '') — só entre elas, nunca como critério
// principal.
const ORDEM_PERIODO: Record<string, number> = { manha: 0, tarde: 1, final_do_dia: 2 };

// Ordenação determinística da agenda: data mais próxima primeiro; dentro da
// mesma data, quem já tem horário confirmado vem antes de quem ainda não
// tem (solicitações pendentes) e é ordenado por horário; entre solicitações
// sem horário, o período preferido (se houver) desempata. Nunca monta um
// Date a partir de horario vazio — não existe Invalid Date possível aqui.
export function compararAgendamentos(
  a: Pick<AgendaConsulta, 'data' | 'horario' | 'periodoPreferido'>,
  b: Pick<AgendaConsulta, 'data' | 'horario' | 'periodoPreferido'>
): number {
  if (a.data !== b.data) return a.data < b.data ? -1 : 1;

  const aTemHorario = !!a.horario;
  const bTemHorario = !!b.horario;

  if (aTemHorario && bTemHorario) {
    return a.horario < b.horario ? -1 : a.horario > b.horario ? 1 : 0;
  }
  if (aTemHorario !== bTemHorario) return aTemHorario ? -1 : 1;

  const pa = a.periodoPreferido ? (ORDEM_PERIODO[a.periodoPreferido] ?? 99) : 99;
  const pb = b.periodoPreferido ? (ORDEM_PERIODO[b.periodoPreferido] ?? 99) : 99;
  return pa - pb;
}

// Responde só "esse horário, nessa data, está dentro desse bloqueio?" — sem
// nenhuma automação em cima (ainda não é chamada por nenhum fluxo de
// aprovação/agendamento, só existe como base pra uma próxima etapa).
// Bloqueio de dia inteiro cobre o dia todo, independente de horário; período
// parcial usa início inclusivo e fim exclusivo (14:00 bloqueia, 18:00 já
// está livre), igual a como intervalos de agenda costumam ser lidos.
export function horarioEstaBloqueado(data: string, horario: string, bloqueio: HorarioBloqueado): boolean {
  if (bloqueio.data !== data) return false;
  if (bloqueio.diaInteiro) return true;
  if (!horario || !bloqueio.horarioInicio || !bloqueio.horarioFim) return false;
  return horario >= bloqueio.horarioInicio && horario < bloqueio.horarioFim;
}

// Mesma checagem, contra a lista inteira de bloqueios da médica.
export function algumBloqueioAtivo(data: string, horario: string, bloqueios: HorarioBloqueado[]): boolean {
  return bloqueios.some((b) => horarioEstaBloqueado(data, horario, b));
}
