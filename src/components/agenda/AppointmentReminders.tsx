import React from 'react';
import { Send, CheckCircle2, BellRing } from 'lucide-react';
import { generateAppointmentReminderLink } from '../../utils/whatsapp';
import type { ConsultaParaLembrete } from '../../utils/agendaReminders';

interface AppointmentRemindersProps {
  /** Data dos itens, YYYY-MM-DD (hoje sempre "amanhã", mas o componente não assume isso). */
  data: string;
  /** Já filtrados e ordenados por selecionarConsultasParaLembrete — nenhum recálculo aqui. */
  itens: ConsultaParaLembrete[];
  /** Disparado ao clicar no link do WhatsApp, antes de abrir — marca lembreteEnviadoEm. */
  onEnviar: (patientId: string, agendaId: string) => void;
}

// Só apresentação — mesmo padrão de PendingRequests/TodayAgenda/
// UpcomingDays/CalendarView/AppointmentHistory. Renderiza a mesma lista de
// "quem precisa de lembrete" tanto na aba 🔔 Lembretes do Dia
// (DoctorRemindersTab, que só define o contexto "amanhã") quanto no estado
// "Amanhã" da Agenda (ClinicScheduleManager, ao selecionar o dia em
// Próximos Dias) — duas entradas, uma única lista/regra.
export const AppointmentReminders: React.FC<AppointmentRemindersProps> = ({ data, itens, onEnviar }) => {
  const dataLabel = new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  });

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5 border-b pb-3">
        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
          <BellRing className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-base">Lembretes de Amanhã</h3>
          <p className="text-xs text-gray-500 capitalize">{dataLabel} • {itens.length} consulta(s) confirmada(s)</p>
        </div>
      </div>

      {itens.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-xs bg-gray-50 rounded-2xl border border-dashed">
          Nenhuma consulta confirmada para amanhã.
        </div>
      ) : (
        <div className="space-y-2.5">
          {itens.map((item) => {
            const jaEnviado = !!item.lembreteEnviadoEm;
            const semWhatsapp = !item.patient.telefone;

            return (
              <div
                key={item.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border ${
                  jaEnviado ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tabular-nums">{item.horario}</span>
                  <strong className="text-sm text-gray-900 block">{item.patient.nome}</strong>
                  <span className="text-xs text-gray-500">{item.tipo} • {item.local}</span>
                  {jaEnviado && (
                    <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Lembrete enviado às {new Date(item.lembreteEnviadoEm!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                {semWhatsapp ? (
                  <span className="text-[11px] text-gray-400 italic shrink-0">Sem WhatsApp cadastrado</span>
                ) : (
                  <a
                    href={generateAppointmentReminderLink(item.patient, item)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => onEnviar(item.patient.id, item.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-all ${
                      jaEnviado ? 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)]'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" /> {jaEnviado ? 'Reenviar' : 'Enviar Lembrete'}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
