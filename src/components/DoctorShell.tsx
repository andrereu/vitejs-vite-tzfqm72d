import React from 'react';
import { Settings, Smartphone, LogOut, Users } from 'lucide-react';
import type { DoctorTenant } from '../types/saas';
import type { UserRole } from '../types/prenatal';
import { hasPermission } from '../utils/rbac';

interface DoctorShellProps {
  doctorProfile: DoctorTenant;
  userRole: UserRole | null;
  onInstallPWA: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  onGoToPatientList: () => void;
  children: React.ReactNode;
}

function getInitials(nome: string): string {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
}

// Moldura da experiência profissional (fase 1 da reforma App-First): header
// "SaaS" compacto e neutro (sem faixa cheia de --brand-primary — a cor da
// médica entra só como accent no hover). Mobile/tablet não ganham um menu
// hambúrguer/sidebar novo: as mesmas ações do desktop simplesmente quebram
// linha via flex-wrap e perdem o rótulo de texto, mantendo tudo alcançável
// sem esconder nada atrás de mais um componente novo.
export const DoctorShell: React.FC<DoctorShellProps> = ({
  doctorProfile,
  userRole,
  onInstallPWA,
  onLogout,
  onOpenSettings,
  onGoToPatientList,
  children
}) => {
  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-y-2 gap-x-4">
          <div className="flex items-center gap-3 min-w-0">
            {doctorProfile.logoUrl ? (
              <img
                src={doctorProfile.logoUrl}
                alt={`Logo de ${doctorProfile.nome}`}
                className="w-10 h-10 rounded-xl object-contain border border-gray-100 shrink-0"
              />
            ) : (
              <span className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center text-sm font-bold shrink-0">
                {getInitials(doctorProfile.nome)}
              </span>
            )}
            <div className="min-w-0">
              <div className="text-sm font-bold text-gray-900 truncate">{doctorProfile.clinicaNome || doctorProfile.nome}</div>
              <div className="text-[11px] text-gray-400 truncate">{doctorProfile.especialidade || 'Obstetrícia'} • CRM {doctorProfile.crm}</div>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={onGoToPatientList}
              aria-label="Lista de Pacientes"
              title="Lista de Pacientes"
              className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-[var(--brand-primary)] hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Users className="w-4 h-4" /> <span className="hidden sm:inline">Pacientes</span>
            </button>

            {hasPermission(userRole, 'canManageSchedule') && (
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label="Configurações"
                title="Configurações"
                className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-[var(--brand-primary)] hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Settings className="w-4 h-4" /> <span className="hidden sm:inline">Configurações</span>
              </button>
            )}

            <button
              type="button"
              onClick={onInstallPWA}
              aria-label="Instalar aplicativo"
              title="Instalar aplicativo"
              className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-[var(--brand-primary)] hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Smartphone className="w-4 h-4" /> <span className="hidden sm:inline">Instalar</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              aria-label="Sair"
              title="Sair"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-all shrink-0"
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
