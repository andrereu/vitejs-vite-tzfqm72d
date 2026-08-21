import React, { useState } from 'react';
import { ChevronDown, Edit3, Send } from 'lucide-react';
import type { ConsultaEvolucao, SolicitacaoClinica } from '../types/prenatal';
import { formatarDiagnostico } from '../utils/diagnostico';
import { formatDateBR } from '../utils/formatters';

interface ConsultaEvolucaoCardProps {
  consulta: ConsultaEvolucao;
  /** Já resolvida pelo chamador (PatientAppScreen busca por consultaEvolucaoId) — o card não consulta Firestore. */
  solicitacao?: SolicitacaoClinica;
  /** Omitido quando quem está vendo não pode editar (mesma regra userRole === 'medica' já usada na tabela). */
  onEditar?: () => void;
  /** Link já pronto (generateConsultationSummaryLink) — o card só renderiza a âncora. */
  whatsappHref?: string;
}

// Card expansível da Evolução/Atendimento no mobile (UX-03) — a tabela densa
// do desktop (PatientAppScreen.tsx) continua intacta e é a mesma fonte de
// dados; este componente só apresenta a mesma ConsultaEvolucao de outro
// jeito. Presentacional: não acessa Firestore, não salva nada, não conhece
// Agenda — Editar e WhatsApp são só os callbacks/links que a tabela já usava.
//
// Estado aberto/fechado é local (useState) porque é só preferência de
// leitura da tela, não dado clínico — por isso vários cards podem ficar
// abertos ao mesmo tempo, sem fechar uns aos outros (pra comparar consultas
// diferentes lado a lado, como a spec pediu).
export const ConsultaEvolucaoCard: React.FC<ConsultaEvolucaoCardProps> = ({
  consulta,
  solicitacao,
  onEditar,
  whatsappHref
}) => {
  const [aberto, setAberto] = useState(false);
  const diagnostico = formatarDiagnostico(consulta.diagnostico);
  const temPrescricao = Boolean(solicitacao && solicitacao.prescricoes.length > 0);
  const temExames = Boolean(solicitacao && solicitacao.exames.length > 0);
  const temAcoes = Boolean(onEditar || whatsappHref);
  const detalhesId = `evolucao-${consulta.id}-detalhes`;

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
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-sm">{formatDateBR(consulta.data)}</span>
            <span className="text-xs text-gray-500">{consulta.igSem} sem</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-600">
            <span>PA {consulta.pa}</span>
            <span>{consulta.peso}kg</span>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {aberto && (
        <div id={detalhesId} className="px-3.5 pb-3.5 pt-3 border-t border-gray-100 space-y-3">
          {consulta.queixas && (
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Queixa</span>
              <p className="text-xs text-gray-700">{consulta.queixas}</p>
            </div>
          )}

          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Exame Físico</span>
            <div className="text-xs text-gray-700 space-y-0.5">
              <div>AU: {consulta.au || '—'}</div>
              <div>BCF/MF: {consulta.bcfMf || '—'}</div>
              <div>Edema: {consulta.edema || '—'}</div>
            </div>
          </div>

          {diagnostico && (
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Diagnóstico</span>
              <p className="text-xs text-gray-700">{diagnostico}</p>
            </div>
          )}

          {consulta.conduta && (
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Conduta</span>
              <p className="text-xs text-gray-700">{consulta.conduta}</p>
            </div>
          )}

          {temPrescricao && (
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Prescrição</span>
              <ul className="text-xs text-gray-700 space-y-0.5">
                {solicitacao!.prescricoes.map((p) => (
                  <li key={p.id}>{p.medicamento}{p.posologia ? ` — ${p.posologia}` : ''}</li>
                ))}
              </ul>
            </div>
          )}

          {temExames && (
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">Exames Solicitados</span>
              <ul className="text-xs text-gray-700 space-y-0.5">
                {solicitacao!.exames.map((ex) => (
                  <li key={ex.id}>{ex.nome}</li>
                ))}
              </ul>
            </div>
          )}

          {temAcoes && (
            <div className="flex items-center gap-1.5 pt-1">
              {onEditar && (
                <button
                  type="button"
                  onClick={onEditar}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-bold cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
              )}
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold"
                >
                  <Send className="w-3.5 h-3.5" /> Zap
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
