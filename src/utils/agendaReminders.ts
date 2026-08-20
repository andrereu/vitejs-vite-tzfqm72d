import type { AgendaConsulta, Patient } from '../types/prenatal';
import { compararAgendamentos } from './agendaScheduling';
import { getLocalDateString } from './formatters';

export interface ConsultaParaLembrete extends AgendaConsulta {
  patient: Patient;
}

// "Precisa de lembrete" = mesmo critério já usado em
// selecionarProximaConsulta/consultasEmConflitoComBloqueio pra "compromisso
// real": confirmada ou encaixe_urgente. Solicitada, cancelada e realizada
// nunca aparecem aqui — comportamento herdado do DoctorRemindersTab
// original, não uma regra nova desta etapa. Única fonte usada tanto pela
// aba Lembretes quanto pelo estado "Amanhã" da Agenda, pra não ter duas
// implementações do mesmo filtro/ordenação.
export function selecionarConsultasParaLembrete(patients: Patient[], data: string): ConsultaParaLembrete[] {
  const itens: ConsultaParaLembrete[] = [];
  for (const p of patients) {
    for (const ag of p.agendaConsultas || []) {
      if (ag.data === data && (ag.status === 'confirmada' || ag.status === 'encaixe_urgente')) {
        itens.push({ ...ag, patient: p });
      }
    }
  }
  return itens.sort(compararAgendamentos);
}

// "Amanhã" em data local (nunca toISOString) — mesmo cálculo que já existia
// solto dentro do DoctorRemindersTab, agora num só lugar reutilizável.
export function amanhaLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return getLocalDateString(d);
}

// Marca o lembrete como enviado — mesma escrita que já existia
// (lembreteEnviadoEm, campo já existente no modelo, sem mudança de
// schema), só centralizada pra não ter a mesma transformação escrita duas
// vezes (na aba Lembretes e no estado "Amanhã" da Agenda). Retorna a lista
// atualizada; quem chama decide como persistir (saveToFirestore).
export function marcarLembreteComoEnviado(patients: Patient[], patientId: string, agendaId: string): Patient[] {
  return patients.map((p) => {
    if (p.id !== patientId) return p;
    return {
      ...p,
      agendaConsultas: (p.agendaConsultas || []).map((ag) =>
        ag.id === agendaId ? { ...ag, lembreteEnviadoEm: new Date().toISOString() } : ag
      )
    };
  });
}
