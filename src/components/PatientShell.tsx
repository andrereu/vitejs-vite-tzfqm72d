import React from 'react';
import { Download, LogOut } from 'lucide-react';
import type { DoctorTenant } from '../types/saas';
import { MaternaLogo } from './MaternaLogo';

interface PatientShellProps {
  doctorProfile?: DoctorTenant;
  onInstallPWA: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

// Moldura da experiência da gestante (fase 1 da reforma App-First): header
// compacto e neutro, sem a faixa cheia de --brand-primary que o header
// global antigo usava — a cor da médica aqui é só accent (hover dos
// ícones), nunca preenchimento. Instalar App e Sair são as únicas ações
// realmente globais que sobram fora do "Mais" (que já vive dentro de
// PatientAppScreen e não é tocado nesta fase). Sem menu de perfil ainda.
//
// UX-06.3 — mais compacto ainda no mobile: era o maior contribuinte real de
// altura fixa acima do conteúdo. Nome/especialidade e as duas ações
// continuam todas presentes, só com padding/ícones um degrau menor.
export const PatientShell: React.FC<PatientShellProps> = ({ doctorProfile, onInstallPWA, onLogout, children }) => {
  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            {doctorProfile?.logoUrl ? (
              <img
                src={doctorProfile.logoUrl}
                alt={`Logo de ${doctorProfile.nome}`}
                className="w-7 h-7 rounded-lg object-contain shrink-0"
              />
            ) : (
              <MaternaLogo variant="icon" theme="dark" size="sm" />
            )}
            <div className="min-w-0">
              <div className="text-xs font-bold text-gray-900 truncate leading-tight">
                {doctorProfile?.nome || 'MaternaIA'}
              </div>
              {doctorProfile?.especialidade && (
                <div className="text-[10px] text-gray-400 truncate leading-tight">{doctorProfile.especialidade}</div>
              )}
            </div>
          </div>

          {/* Ícones reconhecíveis o bastante pra funcionar sem depender de
              tooltip (que não existe no toque) — aria-label garante leitor
              de tela, title serve de reforço só no desktop. */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={onInstallPWA}
              aria-label="Instalar aplicativo"
              title="Instalar aplicativo"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:text-[var(--brand-primary)] hover:bg-gray-50 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Sair"
              title="Sair"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {children}
    </>
  );
};
