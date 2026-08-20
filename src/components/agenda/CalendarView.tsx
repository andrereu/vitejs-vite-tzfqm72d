import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Ban } from 'lucide-react';

const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export interface DiaCalendario {
  dia: number;
  /** YYYY-MM-DD */
  data: string;
  /** Só confirmada/encaixe_urgente — mesma regra já usada em UpcomingDays. */
  totalConsultas: number;
  temUrgencia: boolean;
  /** true quando há alguma solicitada nesse dia. */
  temPendencia: boolean;
  bloqueio: 'nenhum' | 'dia_inteiro' | 'parcial';
}

interface CalendarViewProps {
  mesLabel: string;
  diasVaziosAntes: number;
  dias: DiaCalendario[];
  hoje: string;
  diaSelecionado: string;
  onSelecionarDia: (data: string) => void;
  onMesAnterior: () => void;
  onMesSeguinte: () => void;
  onIrParaHoje: () => void;
}

// Ferramenta de navegação/consulta, não protagonista: recolhido por padrão
// no mobile (a médica vê Pendências/Hoje/Próximos Dias primeiro), sempre
// visível — mas compacto — a partir do tablet. Só apresentação: recebe os
// dias do mês já resumidos (contagem, urgência, pendência, tipo de
// bloqueio) do ClinicScheduleManager e dispara os callbacks de navegação
// que já existiam antes desta extração. Nenhuma leitura de Firestore,
// nenhuma regra clínica, nenhum cálculo de conflito aqui.
export const CalendarView: React.FC<CalendarViewProps> = ({
  mesLabel,
  diasVaziosAntes,
  dias,
  hoje,
  diaSelecionado,
  onSelecionarDia,
  onMesAnterior,
  onMesSeguinte,
  onIrParaHoje
}) => {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
      {/* Toggle — só existe/importa abaixo do breakpoint md; a partir daí o
          corpo do calendário fica sempre visível independente do estado. */}
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls="calendario-corpo"
        className="md:hidden w-full flex items-center justify-between gap-2 p-4 text-left cursor-pointer"
      >
        <span className="text-sm font-bold text-gray-900">📅 {aberto ? 'Calendário' : 'Ver calendário'}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      <div id="calendario-corpo" className={`${aberto ? 'block' : 'hidden md:block'} p-4 md:p-6 space-y-4`}>
        {/* Navegação do Mês */}
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-bold text-gray-900 text-base">{mesLabel}</h3>
          <div className="flex items-center gap-1">
            <button onClick={onMesAnterior} aria-label="Mês anterior" className="p-1.5 hover:bg-gray-100 rounded-xl border cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={onIrParaHoje} className="px-3 py-1 text-xs font-bold hover:bg-gray-100 rounded-xl border cursor-pointer">
              Hoje
            </button>
            <button onClick={onMesSeguinte} aria-label="Próximo mês" className="p-1.5 hover:bg-gray-100 rounded-xl border cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Grade dos Dias */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {DIAS_SEMANA_ABREV.map((d) => (
            <div key={d} className="text-[10px] font-bold text-gray-400 uppercase py-1">
              {d}
            </div>
          ))}

          {Array.from({ length: diasVaziosAntes }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[52px] bg-gray-50/50 rounded-xl border border-transparent" />
          ))}

          {dias.map((dia) => {
            const isHoje = dia.data === hoje;
            const isSelecionado = dia.data === diaSelecionado;
            const temBloqueio = dia.bloqueio !== 'nenhum';

            return (
              <button
                key={dia.dia}
                type="button"
                onClick={() => onSelecionarDia(dia.data)}
                aria-label={`${dia.dia}${isHoje ? ', hoje' : ''}${isSelecionado ? ', selecionado' : ''}${
                  dia.totalConsultas > 0 ? `, ${dia.totalConsultas} consulta(s)` : ''
                }${temBloqueio ? ', com bloqueio de agenda' : ''}`}
                className={`min-h-[52px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  isSelecionado
                    ? 'ring-2 ring-[var(--brand-primary)] bg-emerald-50/40'
                    : temBloqueio
                      ? 'bg-gray-100 border-gray-200 hover:bg-gray-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                } ${isHoje && !isSelecionado ? 'border-2 border-[var(--brand-primary)]' : ''}`}
              >
                <div className="flex justify-between items-start gap-1">
                  <span className="flex items-center gap-1 min-w-0">
                    <span className="text-xs font-bold text-gray-800">{dia.dia}</span>
                    {isHoje && <span className="text-[7px] font-bold text-[var(--brand-primary)] uppercase shrink-0">Hoje</span>}
                  </span>
                  {dia.totalConsultas > 0 && (
                    <span className={`text-[9px] font-bold shrink-0 ${dia.temUrgencia ? 'text-rose-500' : 'text-gray-400'}`}>
                      ● {dia.totalConsultas}
                    </span>
                  )}
                </div>

                {(temBloqueio || dia.temPendencia) && (
                  <div className="flex items-center gap-1 mt-1">
                    {temBloqueio && (
                      <Ban
                        className="w-3 h-3 text-gray-400 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    {dia.temPendencia && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
