import React from 'react';
import { FlaskConical, FileImage } from 'lucide-react';
import type { GrupoExamesPorData } from '../../utils/examesOrganizacao';
import { pareceNomeDeArquivo } from '../../utils/examesOrganizacao';
import { formatarDataAgrupador } from '../../utils/formatters';

interface DocumentoRecente {
  nome: string;
  tipo: string;
  dataUpload: string;
}

interface RecentExamsProps {
  ultimoGrupoLaboratorial?: GrupoExamesPorData;
  ultimaEcografia?: DocumentoRecente;
  onViewExamesLaboratoriais: () => void;
  onViewCentralLaudos: () => void;
}

const MAX_ITENS_RESUMO = 3;

// Home (UX-06) — responde só "há algo recente pra abrir?": nome/resumo
// mínimo + data + 1 ação, uma linha por tipo. Nenhum valor de resultado,
// nenhuma prévia de documento, nenhum resumo de IA — isso já existe nas
// telas próprias (Exames Laboratoriais / Central de Laudos e Imagens); este
// bloco só aponta pra lá. Some por completo quando não há nada recente de
// nenhum dos dois tipos.
export const RecentExams: React.FC<RecentExamsProps> = ({
  ultimoGrupoLaboratorial,
  ultimaEcografia,
  onViewExamesLaboratoriais,
  onViewCentralLaudos
}) => {
  if (!ultimoGrupoLaboratorial && !ultimaEcografia) return null;

  const resumoLab = ultimoGrupoLaboratorial
    ? ultimoGrupoLaboratorial.itens.slice(0, MAX_ITENS_RESUMO).map((item) => item.label).join(' · ')
    : '';

  // Mesma heurística já usada em DocumentoExameCard (UX-05.1): quando o nome
  // salvo é o nome bruto do arquivo (upload sem título), mostra um rótulo
  // neutro em vez de inventar qual exame é.
  const nomeEcografia = ultimaEcografia
    ? pareceNomeDeArquivo(ultimaEcografia.nome)
      ? (ultimaEcografia.tipo === 'Ecografia' ? 'Ecografia' : 'Documento')
      : ultimaEcografia.nome
    : '';

  return (
    <div className="space-y-2">
      <h4 className="font-bold text-gray-900 text-sm lg:text-base px-1">Exames recentes</h4>
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs divide-y divide-gray-100">
        {ultimoGrupoLaboratorial && (
          <button
            type="button"
            onClick={onViewExamesLaboratoriais}
            className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-gray-50"
          >
            <span className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <FlaskConical className="w-4.5 h-4.5" />
            </span>
            <div className="flex-1 min-w-0">
              <strong className="text-sm text-gray-900 block">Último laboratório</strong>
              <p className="text-xs text-gray-500 truncate">
                {formatarDataAgrupador(ultimoGrupoLaboratorial.data)} · {resumoLab}
              </p>
            </div>
            <span className="text-xs font-bold text-[var(--brand-primary)] shrink-0">Ver exames</span>
          </button>
        )}

        {ultimaEcografia && (
          <button
            type="button"
            onClick={onViewCentralLaudos}
            className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-gray-50"
          >
            <span className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
              <FileImage className="w-4.5 h-4.5" />
            </span>
            <div className="flex-1 min-w-0">
              <strong className="text-sm text-gray-900 block truncate">{nomeEcografia}</strong>
              <p className="text-xs text-gray-500">{formatarDataAgrupador(ultimaEcografia.dataUpload)}</p>
            </div>
            <span className="text-xs font-bold text-[var(--brand-primary)] shrink-0">Ver laudos</span>
          </button>
        )}
      </div>
    </div>
  );
};
