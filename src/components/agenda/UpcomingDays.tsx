import React from 'react';
import { Ban } from 'lucide-react';

export interface ResumoDia {
  /** YYYY-MM-DD */
  data: string;
  /** "Amanhã" ou "Qui 21" — já formatado pelo componente pai. */
  label: string;
  totalConsultas: number;
  temUrgencia: boolean;
  temBloqueio: boolean;
}

interface UpcomingDaysProps {
  dias: ResumoDia[];
  diaSelecionado?: string;
  onSelecionarDia: (data: string) => void;
}

// Só apresentação — recebe os 7 dias já calculados e resumidos pelo
// ClinicScheduleManager (data, label, contagem, se tem urgência, se tem
// bloqueio) e só desenha a lista + dispara onSelecionarDia. Nenhum cálculo
// de data, nenhuma leitura de Firestore, nenhuma regra clínica aqui.
export const UpcomingDays: React.FC<UpcomingDaysProps> = ({ dias, diaSelecionado, onSelecionarDia }) => {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 text-sm">Próximos dias</h3>
      </div>

      <div className="divide-y divide-gray-100">
        {dias.map((dia) => {
          const selecionado = diaSelecionado === dia.data;
          return (
            <button
              key={dia.data}
              type="button"
              onClick={() => onSelecionarDia(dia.data)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left cursor-pointer transition-all ${
                selecionado ? 'bg-emerald-50/40' : 'hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-bold text-gray-900 w-16 shrink-0">{dia.label}</span>
                {dia.temBloqueio && <Ban className="w-3 h-3 text-gray-300 shrink-0" aria-label="Tem bloqueio de agenda" />}
              </span>

              <span className="flex items-center gap-1.5 text-xs shrink-0">
                <span className={dia.totalConsultas === 0 ? 'text-gray-300' : dia.temUrgencia ? 'text-rose-500' : 'text-gray-400'}>
                  {dia.totalConsultas === 0 ? '—' : '●'}
                </span>
                <span className={dia.totalConsultas === 0 ? 'text-gray-400' : 'text-gray-700 font-semibold'}>
                  {dia.totalConsultas === 0 ? 'sem consultas' : `${dia.totalConsultas} consulta${dia.totalConsultas > 1 ? 's' : ''}`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
