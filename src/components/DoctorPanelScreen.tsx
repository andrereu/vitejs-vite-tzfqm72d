import React, { useMemo, useState } from 'react';
import { Settings, UserPlus } from 'lucide-react';
import type { Patient, HorarioBloqueado, AgendaConsulta, UserRole } from '../types/prenatal';
import type { DoctorTenant, SaasGlobalConfig } from '../types/saas';
import { SubscriptionPaywall } from './SubscriptionPaywall';
import { ClinicScheduleManager } from './ClinicScheduleManager';
import { DoctorMetricsTab } from './DoctorMetricsTab';
import { DoctorRemindersTab } from './DoctorRemindersTab';
import { hasPermission } from '../utils/rbac';
import { isDoctorBlocked } from '../utils/subscription';

interface DoctorPanelScreenProps {
  currentDoctorProfile: DoctorTenant;
  globalConfig: SaasGlobalConfig;
  doctorPanelTab: 'pacientes' | 'agenda_geral' | 'metricas' | 'lembretes';
  setDoctorPanelTab: (tab: 'pacientes' | 'agenda_geral' | 'metricas' | 'lembretes') => void;
  patients: Patient[];
  userRole: UserRole | null;
  onOpenDoctorSettings: () => void;
  onOpenNewPatientModal: () => void;
  onSelectPatient: (patientId: string) => void;
  blockedSlots: HorarioBloqueado[];
  setBlockedSlots: (slots: HorarioBloqueado[]) => void;
  onOpenConfirmModal: (app: AgendaConsulta, pat: Patient) => void;
  saveToFirestore: (updatedList: Patient[]) => Promise<void>;
}

// Painel principal da médica/secretária: lista de gestantes + central da agenda.
export const DoctorPanelScreen: React.FC<DoctorPanelScreenProps> = ({
  currentDoctorProfile,
  globalConfig,
  doctorPanelTab,
  setDoctorPanelTab,
  patients,
  userRole,
  onOpenDoctorSettings,
  onOpenNewPatientModal,
  onSelectPatient,
  blockedSlots,
  setBlockedSlots,
  onOpenConfirmModal,
  saveToFirestore
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPatients = useMemo(() => {
    if (!searchQuery) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter((p) => p.nome.toLowerCase().includes(q) || p.cpf.includes(q));
  }, [patients, searchQuery]);

  // Assinatura vencida/bloqueada: trava o painel de verdade — antes disso o
  // paywall era só um banner, e a lista de pacientes continuava acessível
  // embaixo dele mesmo sem pagar.
  if (isDoctorBlocked(currentDoctorProfile)) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <SubscriptionPaywall
          doctor={currentDoctorProfile}
          pixKey={globalConfig.pixKey || '020.255.429-50'}
          onRefreshStatus={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

      {/* BANNER DE DEGUSTAÇÃO (TRIAL ATIVO) */}
      {currentDoctorProfile.status === 'trial' && (
        <div className="bg-amber-500 text-white px-4 py-3 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">⏳</span>
            <span>
              Você está usando o <strong>Período de Degustação Gratuito</strong> até{' '}
              <strong>
                {currentDoctorProfile.trialEndsAt
                  ? new Date(currentDoctorProfile.trialEndsAt).toLocaleDateString('pt-BR')
                  : 'breve'}
              </strong>.
            </span>
          </div>
          <a
            href={`https://wa.me/5541998496940?text=${encodeURIComponent('Olá! Gostaria de ativar a assinatura do MaternaIA.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-amber-900 px-3 py-1.5 rounded-xl font-bold hover:bg-amber-50 transition-all whitespace-nowrap"
          >
            Garantir Assinatura Anual / Mensal
          </a>
        </div>
      )}

      {/* SELETOR DE ABAS DA CLÍNICA */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setDoctorPanelTab('metricas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            doctorPanelTab === 'metricas' ? 'bg-[#2E482A] text-white shadow-xs' : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          📊 Visão Geral
        </button>
        <button
          onClick={() => setDoctorPanelTab('pacientes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            doctorPanelTab === 'pacientes' ? 'bg-[#2E482A] text-white shadow-xs' : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          Gestantes Cadastradas ({patients.length})
        </button>
        <button
          onClick={() => setDoctorPanelTab('agenda_geral')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            doctorPanelTab === 'agenda_geral' ? 'bg-[#2E482A] text-white shadow-xs' : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          📅 Central da Agenda & Recepção
        </button>
        <button
          onClick={() => setDoctorPanelTab('lembretes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            doctorPanelTab === 'lembretes' ? 'bg-[#2E482A] text-white shadow-xs' : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          🔔 Lembretes do Dia
        </button>
      </div>

      {/* ABA: LEMBRETES DE AMANHÃ */}
      {doctorPanelTab === 'lembretes' && (
        <DoctorRemindersTab patients={patients} saveToFirestore={saveToFirestore} />
      )}

      {/* ABA 0: VISÃO GERAL (MÉTRICAS DO CONSULTÓRIO) */}
      {doctorPanelTab === 'metricas' && (
        <DoctorMetricsTab patients={patients} onSelectPatient={onSelectPatient} />
      )}

      {/* ABA 1: LISTA DE GESTANTES */}
      {doctorPanelTab === 'pacientes' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Gestantes Cadastradas</h2>
              <p className="text-xs text-gray-500">Acesse ou cadastre novas pacientes no banco de dados</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Buscar paciente por nome ou CPF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 text-xs p-2.5 border rounded-xl"
              />

              {hasPermission(userRole, 'canManageSchedule') && (
                <button
                  onClick={onOpenDoctorSettings}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border border-gray-200"
                  title="Configurar Logo, CRM e endereço do consultório"
                >
                  <Settings className="w-4 h-4 text-[#2E482A]" /> Configurar Consultório
                </button>
              )}

              {hasPermission(userRole, 'canManageBasicPatientData') && (
                <button
                  onClick={onOpenNewPatientModal}
                  className="bg-[#2E482A] hover:bg-[#233820] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" /> + Cadastrar Gestante
                </button>
              )}
            </div>
          </div>

          {filteredPatients.length === 0 && (
            <div className="bg-white p-8 rounded-3xl border border-dashed border-gray-300 text-center text-sm text-gray-500">
              Nenhuma gestante cadastrada ainda. Clique em "+ Cadastrar Gestante" para começar.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPatients.map((pat) => (
              <div key={pat.id} className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">CPF: {pat.cpf}</span>
                  <h3 className="font-bold text-gray-900 text-base">{pat.nome}</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Bebê: <strong>{pat.nomeBebe}</strong> •
                    <span className="inline-flex items-center ml-1">
                      DPP: {new Date(pat.dpp).toLocaleDateString('pt-BR')}
                    </span>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    G{pat.g} P{pat.p} C{pat.c} A{pat.a} • WhatsApp: {pat.telefone || 'Não informado'}
                  </p>
                </div>
                <button
                  onClick={() => onSelectPatient(pat.id)}
                  className="px-4 py-2.5 bg-[#2E482A] text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                >
                  Abrir Cartão
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 2: CENTRAL DA AGENDA & RECEPÇÃO */}
      {doctorPanelTab === 'agenda_geral' && (
        <ClinicScheduleManager
          patients={patients}
          blockedSlots={blockedSlots}
          onAddBlockedSlot={async (newSlot) => setBlockedSlots([...blockedSlots, newSlot])}
          onRemoveBlockedSlot={async (id) => setBlockedSlots(blockedSlots.filter((b) => b.id !== id))}
          onOpenConfirmModal={onOpenConfirmModal}
          onQuickStatusChange={async (patientId, appointmentId, newStatus) => {
            const targetPat = patients.find((p) => p.id === patientId);
            if (!targetPat) return;
            const updatedAgenda = (targetPat.agendaConsultas || []).map((a) =>
              a.id === appointmentId ? { ...a, status: newStatus } : a
            );
            const updated = { ...targetPat, agendaConsultas: updatedAgenda };
            await saveToFirestore(patients.map((p) => (p.id === updated.id ? updated : p)));
          }}
        />
      )}

    </div>
  );
};
