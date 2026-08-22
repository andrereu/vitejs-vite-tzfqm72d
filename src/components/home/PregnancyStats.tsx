import React from 'react';
import { Scale, Activity, HeartPulse, CalendarCheck } from 'lucide-react';
import type { ConsultaEvolucao } from '../../types/prenatal';
import { formatDateBR } from '../../utils/formatters';

interface PregnancyStatsProps {
  ultimaConsulta?: ConsultaEvolucao;
  pesoInicial?: string;
  onViewEvolucao: () => void;
}

// Indicadores compactos da Home: um card só, dividido em 4 células (em vez
// dos 4 cards separados que existiam antes) — ícone neutro/atenuado, porque
// aqui é "dado de referência", não alerta; cor de destaque fica reservada
// pros estados que realmente pedem atenção (ex.: lembrete de exame).
//
// UX-06 — ganhou título + "Ver evolução" (mesmo padrão de cabeçalho já usado
// em NextAppointment: título à esquerda, ação em texto à direita). Passou a
// morar na coluna principal (junto do Hero/Próxima consulta), não mais na
// coluna estreita secundária — por isso a grade volta a usar 4 colunas no
// desktop, com mais espaço disponível.
export const PregnancyStats: React.FC<PregnancyStatsProps> = ({ ultimaConsulta, pesoInicial, onViewEvolucao }) => {
  const peso = ultimaConsulta
    ? `${ultimaConsulta.peso.toFixed(1).replace('.', ',')} kg`
    : pesoInicial
      ? `${parseFloat(pesoInicial).toFixed(1).replace('.', ',')} kg`
      : 'Sem registro';

  const itens = [
    { label: 'Peso', valor: peso, icon: Scale },
    { label: 'Pressão', valor: ultimaConsulta?.pa || 'Sem registro', icon: Activity },
    { label: 'Batimentos', valor: ultimaConsulta?.bcfMf || 'Sem registro', icon: HeartPulse },
    { label: 'Última consulta', valor: ultimaConsulta ? formatDateBR(ultimaConsulta.data) : '—', icon: CalendarCheck },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h4 className="font-bold text-gray-900 text-sm lg:text-base">Último atendimento</h4>
        <button type="button" onClick={onViewEvolucao} className="text-xs lg:text-sm text-[var(--brand-primary)] font-bold cursor-pointer">
          Ver evolução
        </button>
      </div>
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100">
          {itens.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="p-4 lg:p-5">
                <Icon className="w-4 h-4 lg:w-5 lg:h-5 text-[var(--brand-primary)]/50 mb-2 lg:mb-3" />
                <div className="text-[10px] lg:text-[11px] text-gray-400 font-bold uppercase">{item.label}</div>
                <div className="text-sm lg:text-base font-bold text-gray-900 mt-0.5 lg:mt-1 truncate">{item.valor}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
