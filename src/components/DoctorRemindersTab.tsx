import React from 'react';
import type { Patient } from '../types/prenatal';
import { selecionarConsultasParaLembrete, marcarLembreteComoEnviado, amanhaLocal } from '../utils/agendaReminders';
import { AppointmentReminders } from './agenda/AppointmentReminders';

interface DoctorRemindersTabProps {
  patients: Patient[];
  saveToFirestore: (updatedList: Patient[]) => Promise<void>;
}

// Atalho pra mesmo estado que a Agenda mostra ao selecionar "Amanhã" em
// Próximos Dias (ClinicScheduleManager) — mesma fonte de dados
// (selecionarConsultasParaLembrete) e mesmo componente de apresentação
// (AppointmentReminders), só um caminho de entrada diferente, pra não
// quebrar o hábito de quem já usa esta aba. Esta aba não tem mais nenhuma
// lógica própria de filtro/ordenação/data — só define que o contexto é
// "amanhã" e escreve o resultado de marcarLembreteComoEnviado.
export const DoctorRemindersTab: React.FC<DoctorRemindersTabProps> = ({ patients, saveToFirestore }) => {
  const amanha = amanhaLocal();
  const itens = selecionarConsultasParaLembrete(patients, amanha);

  const handleEnviar = (patientId: string, agendaId: string) => {
    saveToFirestore(marcarLembreteComoEnviado(patients, patientId, agendaId));
  };

  return <AppointmentReminders data={amanha} itens={itens} onEnviar={handleEnviar} />;
};
