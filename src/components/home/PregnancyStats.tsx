import React from 'react';
import { Scale, Activity, HeartPulse, CalendarCheck } from 'lucide-react';
import type { ConsultaEvolucao } from '../../types/prenatal';
import { formatDateBR } from '../../utils/formatters';

interface PregnancyStatsProps {
  ultimaConsulta?: ConsultaEvolucao;
  pesoInicial?: string;
}

// Indicadores compactos da Home: um card só, dividido em 4 células (em vez
// dos 4 cards separados que existiam antes) — ícone neutro/atenuado, porque
// aqui é "dado de referência", não alerta; cor de destaque fica reservada
// pros estados que realmente pedem atenção (ex.: lembrete de exame).
export const PregnancyStats: React.FC<PregnancyStatsProps> = ({ ultimaConsulta, pesoInicial }) => {
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
    <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100">
        {itens.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="p-4">
              <Icon className="w-4 h-4 text-[var(--brand-primary)]/50 mb-2" />
              <div className="text-[10px] text-gray-400 font-bold uppercase">{item.label}</div>
              <div className="text-sm font-bold text-gray-900 mt-0.5 truncate">{item.valor}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
