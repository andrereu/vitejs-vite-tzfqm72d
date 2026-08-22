import React from 'react';
import { Activity, FlaskConical, FolderOpen, Pill, ClipboardList } from 'lucide-react';

interface QuickActionsProps {
  onRegistrarAtendimento: () => void;
  onViewExamesLaboratoriais: () => void;
  onViewCentralLaudos: () => void;
  onNovaSolicitacao: () => void;
}

// Home (UX-06) — atalhos de staff pras ações mais frequentes. Nenhum fluxo
// novo: os 5 botões só apontam pros mesmos fluxos que já existem noutro
// lugar do app. "Nova prescrição" e "Solicitar exame" abrem o mesmo modal
// "Nova Solicitação" (PrescricaoExamesEditor) — as duas seções (medicamentos
// e exames) já vivem juntas nesse modal em todo o resto do app; não criamos
// um fluxo separado só pra diferenciá-los aqui.
export const QuickActions: React.FC<QuickActionsProps> = ({
  onRegistrarAtendimento,
  onViewExamesLaboratoriais,
  onViewCentralLaudos,
  onNovaSolicitacao
}) => {
  const acoes = [
    { label: 'Registrar atendimento', icon: Activity, onClick: onRegistrarAtendimento },
    { label: 'Exames laboratoriais', icon: FlaskConical, onClick: onViewExamesLaboratoriais },
    { label: 'Laudos e imagens', icon: FolderOpen, onClick: onViewCentralLaudos },
    { label: 'Nova prescrição', icon: Pill, onClick: onNovaSolicitacao },
    { label: 'Solicitar exame', icon: ClipboardList, onClick: onNovaSolicitacao }
  ];

  return (
    <div className="space-y-2">
      <h4 className="font-bold text-gray-900 text-sm lg:text-base px-1">Ações rápidas</h4>
      <div className="grid grid-cols-2 gap-2">
        {acoes.map((acao) => {
          const Icon = acao.icon;
          return (
            <button
              key={acao.label}
              type="button"
              onClick={acao.onClick}
              className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-[var(--brand-primary)]/30 transition-all cursor-pointer text-left"
            >
              <Icon className="w-4 h-4 text-[var(--brand-primary)] shrink-0" />
              <span className="truncate">{acao.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
