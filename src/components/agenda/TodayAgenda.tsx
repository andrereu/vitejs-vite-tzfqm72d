import React from 'react';
import { CheckCircle, Send } from 'lucide-react';
import type { AgendaConsulta, Patient } from '../../types/prenatal';
import { generateAppointmentReminderLink } from '../../utils/whatsapp';
import { AppointmentStatusBadge } from './AppointmentStatusBadge';

interface TodayAgendaProps {
  /** Data de hoje, YYYY-MM-DD (mesma string usada pra filtrar as consultas). */
  data: string;
  /**
   * Consultas de hoje já filtradas (sem solicitada, sem cancelada) e já
   * ordenadas — encaixe_urgente primeiro, resto em ordem cronológica. Essa
   * ordenação é feita no ClinicScheduleManager reaproveitando
   * compararAgendamentos, não recalculada aqui.
   */
  consultas: (AgendaConsulta & { patient: Patient })[];
  onGerenciar: (app: AgendaConsulta, patient: Patient) => void;
  /** Mesmo callback da D1-A (abre o modal existente de registro clínico já vinculado à AgendaConsulta) — nenhuma lógica nova aqui. */
  onRegistrarAtendimento: (app: AgendaConsulta, patient: Patient) => void;
}

// Só apresentação — recebe a lista já pronta (filtrada e ordenada) e
// dispara onGerenciar, que o ClinicScheduleManager já conecta ao mesmo
// AppointmentConfirmModal de sempre. Nenhuma leitura de Firestore, nenhuma
// regra de bloqueio, nenhum cálculo de data aqui.
export const TodayAgenda: React.FC<TodayAgendaProps> = ({ data, consultas, onGerenciar, onRegistrarAtendimento }) => {
  // "19 de agosto" a partir de YYYY-MM-DD sem cair no problema de fuso do
  // toISOString/new Date direto — mesmo truque (meio-dia local) já usado em
  // DoctorRemindersTab.tsx pra formatar "amanhã" por extenso.
  const dataFormatada = new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long'
  });

  const urgentes = consultas.filter((c) => c.status === 'encaixe_urgente').length;

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 text-sm">Hoje · {dataFormatada}</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {consultas.length === 0
            ? 'Nenhuma consulta hoje.'
            : `${consultas.length} consulta${consultas.length > 1 ? 's' : ''}${
                urgentes > 0 ? ` · ${urgentes} encaixe${urgentes > 1 ? 's' : ''}` : ''
              }`}
        </p>
      </div>

      {consultas.length > 0 && (
        <div className="divide-y divide-gray-100">
          {consultas.map((item) => (
            <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="w-12 shrink-0 text-xs font-bold text-gray-500 tabular-nums">
                  {item.horario || '—'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-gray-900 truncate">{item.patient.nome}</div>
                  {item.tipo && <div className="text-xs text-gray-500 truncate">{item.tipo}</div>}
                </div>
                <div className="shrink-0">
                  {item.status === 'encaixe_urgente' && <AppointmentStatusBadge status={item.status} contexto="equipe" />}
                  {item.status === 'confirmada' && (
                    <CheckCircle className="w-4 h-4 text-emerald-600" aria-label="Confirmada" />
                  )}
                  {item.status === 'realizada' && (
                    <span className="text-[10px] text-gray-400 font-semibold uppercase">Realizada</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => onGerenciar(item, item.patient)}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-bold cursor-pointer"
                >
                  Gerenciar
                </button>
                {/* Só pra quem ainda pode ser atendida hoje — realizada já é
                    um atendimento encerrado, não mostra a ação de novo. */}
                {(item.status === 'confirmada' || item.status === 'encaixe_urgente') && (
                  <button
                    type="button"
                    onClick={() => onRegistrarAtendimento(item, item.patient)}
                    className="px-2.5 py-1 bg-white border border-[var(--brand-primary)] text-[var(--brand-primary)] rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    🩺 Registrar atendimento
                  </button>
                )}
                <a
                  href={generateAppointmentReminderLink(item.patient, item)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1"
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
