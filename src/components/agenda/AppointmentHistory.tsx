import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, Send } from 'lucide-react';
import type { AgendaConsulta, Patient } from '../../types/prenatal';
import { formatDateBR } from '../../utils/formatters';
import { generateAppointmentReminderLink } from '../../utils/whatsapp';

interface AppointmentHistoryProps {
  /**
   * Consultas realizadas ou canceladas, já filtradas e ordenadas
   * (compararAgendamentos) pelo ClinicScheduleManager — nenhuma
   * reordenação nem filtragem adicional acontece aqui.
   */
  itens: (AgendaConsulta & { patient: Patient })[];
  onGerenciar: (app: AgendaConsulta, patient: Patient) => void;
}

// Só apresentação — mesmo padrão de PendingRequests/TodayAgenda/
// UpcomingDays/CalendarView: recebe os itens já prontos, dispara
// onGerenciar (mesmo AppointmentConfirmModal de sempre) e não lê
// Firestore nem decide nenhuma regra clínica. Recolhido por padrão, com
// contador + chevron e linhas compactas — mesmo tratamento visual
// "secundário" já usado no Histórico de GestationTimeline.tsx, pra não
// competir visualmente com a agenda ativa acima.
export const AppointmentHistory: React.FC<AppointmentHistoryProps> = ({ itens, onGerenciar }) => {
  const [aberto, setAberto] = useState(false);

  if (itens.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-4">
        <span className="text-xs text-gray-400">Histórico — nenhuma consulta realizada ou cancelada ainda.</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-4">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls="historico-agenda-corpo"
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-gray-400" />
          Histórico ({itens.length})
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div id="historico-agenda-corpo" className="mt-2 lg:grid lg:grid-cols-2 lg:gap-x-8">
          {itens.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 py-2.5 border-b border-gray-50 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-gray-700 tabular-nums">
                    {formatDateBR(item.data)}{item.horario ? ` · ${item.horario}` : ''}
                  </span>
                  <span className={`text-[10px] font-bold uppercase ${item.status === 'cancelada' ? 'text-gray-400' : 'text-emerald-600'}`}>
                    {item.status === 'cancelada' ? 'Cancelada' : 'Realizada'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 truncate mt-0.5">{item.patient.nome}</div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onGerenciar(item, item.patient)}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-bold cursor-pointer"
                >
                  Gerenciar
                </button>
                <a
                  href={generateAppointmentReminderLink(item.patient, item)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg text-[11px] font-bold flex items-center gap-1"
                >
                  <Send className="w-3 h-3" /> Zap
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
