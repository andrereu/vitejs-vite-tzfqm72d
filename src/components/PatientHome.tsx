import React from 'react';
import type { Patient, AgendaConsulta, ConsultaEvolucao, UserRole } from '../types/prenatal';
import type { DoctorTenant } from '../types/saas';
import { AdBanner } from './AdBanner';
import { PregnancyHero } from './home/PregnancyHero';
import { NextAppointment } from './home/NextAppointment';
import { PregnancyStats } from './home/PregnancyStats';
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
  onViewAgenda: () => void;
  onRequestAppointment: () => void;
  onAddAgenda: () => void;
}

// Nova Home da gestante (Fase 2A): hierarquia fixa — saudação, hero de idade
// gestacional, próxima consulta, indicadores compactos e "Dicas & Cuidados"
// (AdBanner, que só aparece aqui, não em todas as abas). Layout empilhado no
// celular; no desktop, hero+consulta ficam numa coluna maior e
// indicadores+dicas numa coluna menor ao lado.
export const PatientHome: React.FC<PatientHomeProps> = ({
  currentPatient,
  doctorProfile,
  currentGest,
  userRole,
  isStaff,
  nextAppointment,
  examAlerts,
  ultimaConsulta,
  onViewAgenda,
  onRequestAppointment,
  onAddAgenda
}) => {
  const hasGestationalData = !!currentPatient.dum;
  const canViewIndicadores = hasPermission(userRole, 'canViewClinicalHistory');

  return (
    <div className="space-y-5 print:hidden">
      {userRole === 'paciente' && (
        <p className="text-xl font-bold text-gray-900">
          Olá, {currentPatient.nome.split(' ')[0]} 👋
        </p>
      )}

      <div className="lg:grid lg:grid-cols-3 lg:gap-5 space-y-5 lg:space-y-0">
        <div className="lg:col-span-2 space-y-5">
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
        </div>

        <div className="space-y-5">
          {canViewIndicadores && (
            <PregnancyStats ultimaConsulta={ultimaConsulta} pesoInicial={currentPatient.pesoInicial} />
          )}

          <AdBanner
            placeholderTitle="Dicas & Cuidados"
            placeholderSubtitle="Enxoval, amamentação e cuidados no pós-parto"
          />
        </div>
      </div>
    </div>
  );
};
