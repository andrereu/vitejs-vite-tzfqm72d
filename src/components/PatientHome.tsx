import React from 'react';
import { ShieldAlert } from 'lucide-react';
import type { Patient, AgendaConsulta, ConsultaEvolucao, UserRole } from '../types/prenatal';
import type { DoctorTenant } from '../types/saas';
import type { GrupoExamesPorData } from '../utils/examesOrganizacao';
import { PregnancyHero } from './home/PregnancyHero';
import { NextAppointment } from './home/NextAppointment';
import { PregnancyStats } from './home/PregnancyStats';
import { RecentExams } from './home/RecentExams';
import { QuickActions } from './home/QuickActions';
import { hasPermission } from '../utils/rbac';

interface PatientHomeProps {
  currentPatient: Patient;
  doctorProfile?: DoctorTenant;
  currentGest: { weeks: number; days: number };
  userRole: UserRole | null;
  isStaff: boolean;
  nextAppointment: AgendaConsulta | null;
  examAlerts: { titulo: string; desc: string }[];
  ultimaConsulta?: ConsultaEvolucao;
  ultimoGrupoLaboratorial?: GrupoExamesPorData;
  ultimaEcografia?: { nome: string; tipo: string; dataUpload: string };
  onViewAgenda: () => void;
  onRequestAppointment: () => void;
  onAddAgenda: () => void;
  onViewEvolucao: () => void;
  onViewExamesLaboratoriais: () => void;
  onViewCentralLaudos: () => void;
  onRegistrarAtendimento: () => void;
  onNovaSolicitacao: () => void;
}

// Home da gestante (UX-06) — reformulada de "quanto dado cabe na tela" pra
// "o que preciso saber sobre esta paciente agora": Hero (onde estou) →
// Próxima consulta (o que vem agora) → Último atendimento (o que aconteceu)
// na coluna principal; Exames recentes → Pendências (só quando existirem de
// verdade) → Ações rápidas (só staff) na coluna secundária. O AdBanner saiu
// daqui por decisão explícita da Dra. — o MaternaIA é ferramenta clínica, sem
// espaço de anúncio/promoção no prontuário; continua existindo só na landing
// pública (LandingPage.tsx), que é monetização de marketing, não parte do
// prontuário da paciente.
//
// "Pendências" mostra só o que o modelo já registra explicitamente — hoje,
// isso é a solicitação de exclusão LGPD. "Solicitação de exame sem
// resultado" não entra: o modelo não tem um campo de status pra isso, e
// inventar essa checagem seria criar uma heurística clínica nova (fora do
// escopo desta fase).
export const PatientHome: React.FC<PatientHomeProps> = ({
  currentPatient,
  doctorProfile,
  currentGest,
  userRole,
  isStaff,
  nextAppointment,
  examAlerts,
  ultimaConsulta,
  ultimoGrupoLaboratorial,
  ultimaEcografia,
  onViewAgenda,
  onRequestAppointment,
  onAddAgenda,
  onViewEvolucao,
  onViewExamesLaboratoriais,
  onViewCentralLaudos,
  onRegistrarAtendimento,
  onNovaSolicitacao
}) => {
  const hasGestationalData = !!currentPatient.dum;
  const canViewIndicadores = hasPermission(userRole, 'canViewClinicalHistory');
  const exclusaoPendente = Boolean(currentPatient.solicitacaoExclusao && !currentPatient.solicitacaoExclusao.atendida);

  return (
    <div className="space-y-5 print:hidden">
      {userRole === 'paciente' && (
        <p className="text-xl font-bold text-gray-900">
          Olá, {currentPatient.nome.split(' ')[0]} 👋
        </p>
      )}

      <div className="lg:grid lg:grid-cols-5 lg:gap-6 xl:gap-8 space-y-5 lg:space-y-0">
        <div className="lg:col-span-3 space-y-5 lg:space-y-6">
          <PregnancyHero
            weeks={currentGest.weeks}
            days={currentGest.days}
            dpp={currentPatient.dpp}
            hasGestationalData={hasGestationalData}
          />

          <NextAppointment
            nextAppointment={nextAppointment}
            currentPatient={currentPatient}
            doctorProfile={doctorProfile}
            isStaff={isStaff}
            userRole={userRole}
            examAlerts={examAlerts}
            onViewAgenda={onViewAgenda}
            onRequestAppointment={onRequestAppointment}
            onAddAgenda={onAddAgenda}
          />

          {canViewIndicadores && (
            <PregnancyStats ultimaConsulta={ultimaConsulta} pesoInicial={currentPatient.pesoInicial} onViewEvolucao={onViewEvolucao} />
          )}
        </div>

        <div className="lg:col-span-2 space-y-5 lg:space-y-6">
          {canViewIndicadores && (
            <RecentExams
              ultimoGrupoLaboratorial={ultimoGrupoLaboratorial}
              ultimaEcografia={ultimaEcografia}
              onViewExamesLaboratoriais={onViewExamesLaboratoriais}
              onViewCentralLaudos={onViewCentralLaudos}
            />
          )}

          {exclusaoPendente && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {userRole === 'paciente'
                  ? 'Sua solicitação de exclusão de dados está em análise pela clínica.'
                  : 'Esta paciente solicitou a exclusão dos dados dela — pendente de análise.'}
              </span>
            </div>
          )}

          {isStaff && (
            <QuickActions
              onRegistrarAtendimento={onRegistrarAtendimento}
              onViewExamesLaboratoriais={onViewExamesLaboratoriais}
              onViewCentralLaudos={onViewCentralLaudos}
              onNovaSolicitacao={onNovaSolicitacao}
            />
          )}
        </div>
      </div>
    </div>
  );
};
