import React from 'react';
import { CalendarClock, Send, ChevronRight } from 'lucide-react';
import type { Patient, AgendaConsulta, UserRole } from '../../types/prenatal';
import type { DoctorTenant } from '../../types/saas';
import { formatDateBR } from '../../utils/formatters';
import { generateAppointmentReminderLink } from '../../utils/whatsapp';

interface NextAppointmentProps {
  nextAppointment: AgendaConsulta | null;
  currentPatient: Patient;
  doctorProfile?: DoctorTenant;
  isStaff: boolean;
  userRole: UserRole | null;
  examAlerts: { titulo: string; desc: string }[];
  onViewAgenda: () => void;
  onRequestAppointment: () => void;
  onAddAgenda: () => void;
}

// Card de "próxima consulta" da Home — mesmo conteúdo que já existia no
// Resumo antigo, só isolado em componente próprio. O rótulo do estado vazio
// é "+ Agendar" tanto pra paciente (solicita) quanto pra equipe (agenda
// direto), unificado por pedido explícito da Fase 2A.
export const NextAppointment: React.FC<NextAppointmentProps> = ({
  nextAppointment,
  currentPatient,
  doctorProfile,
  isStaff,
  userRole,
  examAlerts,
  onViewAgenda,
  onRequestAppointment,
  onAddAgenda
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h4 className="font-bold text-gray-900 text-sm">Próxima consulta</h4>
        <button onClick={onViewAgenda} className="text-xs text-[var(--brand-primary)] font-bold cursor-pointer">
          Ver agenda
        </button>
      </div>

      {nextAppointment ? (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-4 flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center shrink-0">
            <CalendarClock className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <strong className="text-sm text-gray-900 block truncate">{nextAppointment.tipo}</strong>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatDateBR(nextAppointment.data)} às {nextAppointment.horario}
              {doctorProfile?.nome ? ` • ${doctorProfile.nome}` : ''}
            </p>
          </div>
          {isStaff ? (
            <a
              href={generateAppointmentReminderLink(currentPatient, nextAppointment)}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <Send className="w-3.5 h-3.5" /> Zap
            </a>
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
          )}
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-3xl flex justify-between items-center text-xs text-gray-500">
          <span>Nenhuma consulta agendada no momento.</span>
          {userRole === 'paciente' && (
            <button onClick={onRequestAppointment} className="text-[var(--brand-primary)] font-bold underline cursor-pointer shrink-0">
              + Agendar
            </button>
          )}
          {isStaff && (
            <button onClick={onAddAgenda} className="text-[var(--brand-primary)] font-bold underline cursor-pointer shrink-0">
              + Agendar
            </button>
          )}
        </div>
      )}

      {examAlerts.length > 0 && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3 text-xs text-rose-800 font-medium">
          Lembrete: {examAlerts[0].titulo}
          {examAlerts.length > 1 ? ` e mais ${examAlerts.length - 1} exame(s) recomendado(s) para esta fase.` : '.'}
        </div>
      )}
    </div>
  );
};
