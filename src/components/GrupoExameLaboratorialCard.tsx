import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { GrupoExamesPorData } from '../utils/examesOrganizacao';
import { formatarDataAgrupador } from '../utils/formatters';

interface GrupoExameLaboratorialCardProps {
  grupo: GrupoExamesPorData;
}

const MAX_ITENS_RESUMO = 4;

// Card expansível de um grupo de exames laboratoriais na mesma data —
// substitui a lista fixa (sempre expandida, uma linha por exame) da UX-05,
// que virava planilha no mobile com muitos resultados. Fechado mostra só a
// data, a contagem e um resumo curto dos nomes; aberto mostra cada
// resultado em formato vertical (nome em cima, valor embaixo). Mesmo padrão
// de interação de ConsultaEvolucaoCard/DocumentoExameCard — useState local,
// aria-expanded/aria-controls.
//
// Duplicidades (o mesmo exame repetido na mesma data) NÃO são removidas
// aqui — `grupo.itens` já vem assim de agruparExamesTabelaPorData, porque
// duas medições diferentes são dado clínico real, não um erro de exibição.
export const GrupoExameLaboratorialCard: React.FC<GrupoExameLaboratorialCardProps> = ({ grupo }) => {
  const [aberto, setAberto] = useState(false);
  const detalhesId = `lab-${grupo.data}-detalhes`;
  const nomesResumo = grupo.itens.slice(0, MAX_ITENS_RESUMO).map((item) => item.label).join(' · ');
  const restantes = grupo.itens.length - MAX_ITENS_RESUMO;

  return (
    <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls={detalhesId}
        className="w-full flex items-center justify-between gap-3 p-3.5 text-left cursor-pointer hover:bg-gray-50"
      >
        <div className="min-w-0">
          <span className="text-[10px] font-bold text-gray-400 uppercase block">{formatarDataAgrupador(grupo.data)}</span>
          <strong className="text-sm font-bold text-gray-900 block">
            Exames laboratoriais · {grupo.itens.length} resultado{grupo.itens.length === 1 ? '' : 's'}
          </strong>
          {!aberto && (
            <span className="text-[11px] text-gray-500 block truncate">
              {nomesResumo}
              {restantes > 0 ? ` · +${restantes}` : ''}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {aberto && (
        <div id={detalhesId} className="px-3.5 pb-3 border-t border-gray-100 divide-y divide-gray-100">
          {grupo.itens.map((item, i) => (
            <div key={`${item.exameId}-${i}`} className="py-2.5">
              <span className="text-[11px] text-gray-500 block">{item.label}</span>
              <strong className="text-sm font-bold text-gray-900">{item.resultado || '—'}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
