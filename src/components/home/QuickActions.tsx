import React from 'react';
import { Plus, FlaskConical, FolderOpen, Pill, ClipboardList } from 'lucide-react';

interface QuickActionsProps {
  onRegistrarAtendimento: () => void;
  onViewExamesLaboratoriais: () => void;
  onViewCentralLaudos: () => void;
  onNovaSolicitacao: () => void;
}

// Home (UX-06, refinado na UX-06.1) — atalhos de staff pras ações mais
// frequentes. Nenhum fluxo novo: os 5 destinos são os mesmos de sempre,
// só a hierarquia visual mudou — os 5 botões com peso igual (UX-06)
// pareciam uma segunda toolbar administrativa no mobile. Agora só
// "Registrar atendimento" tem tratamento primário (botão preenchido,
// largura cheia); as outras 4 viram uma bandeja secundária compacta — um
// único container com fundo/borda, sem cada item virar seu próprio cartão
// com borda, pra não voltar a parecer um menu de 5 itens independentes.
// "Nova prescrição" e "Solicitar exame" continuam abrindo o mesmo modal
// "Nova Solicitação" (PrescricaoExamesEditor) — as duas seções já vivem
// juntas nele em todo o resto do app.
export const QuickActions: React.FC<QuickActionsProps> = ({
  onRegistrarAtendimento,
  onViewExamesLaboratoriais,
  onViewCentralLaudos,
  onNovaSolicitacao
}) => {
  const acoesSecundarias = [
    { label: 'Exames laboratoriais', icon: FlaskConical, onClick: onViewExamesLaboratoriais },
    { label: 'Laudos e imagens', icon: FolderOpen, onClick: onViewCentralLaudos },
    { label: 'Nova prescrição', icon: Pill, onClick: onNovaSolicitacao },
    { label: 'Solicitar exame', icon: ClipboardList, onClick: onNovaSolicitacao }
  ];

  return (
    <div className="space-y-2">
      <h4 className="font-bold text-gray-900 text-sm lg:text-base px-1">Ações rápidas</h4>

      <button
        type="button"
        onClick={onRegistrarAtendimento}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white rounded-2xl text-sm font-bold shadow-xs transition-all cursor-pointer"
      >
        <Plus className="w-4 h-4" /> Registrar atendimento
      </button>

      <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 bg-gray-50 rounded-2xl border border-gray-100 p-1">
        {acoesSecundarias.map((acao) => {
          const Icon = acao.icon;
          return (
            <button
              key={acao.label}
              type="button"
              onClick={acao.onClick}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-semibold text-gray-600 hover:bg-white hover:text-[var(--brand-primary)] transition-all cursor-pointer text-left"
            >
              <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />
              <span className="truncate">{acao.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
