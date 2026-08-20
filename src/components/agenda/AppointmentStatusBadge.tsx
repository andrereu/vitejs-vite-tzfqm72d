import React from 'react';
import type { AppointmentStatus } from '../../types/prenatal';

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
  /** Quem está lendo o badge — muda só o texto/caixa, nunca a cor. */
  contexto?: 'equipe' | 'paciente';
}

// Rótulo muda por contexto (a equipe já sabe "quem"/"quando", falta "o que
// fazer"; a paciente lê em 2ª pessoa) — diferença que já existia antes desta
// extração (ClinicScheduleManager vs. PatientAppScreen), preservada aqui em
// vez de forçada pra um texto único.
const LABEL_POR_CONTEXTO: Record<'equipe' | 'paciente', Partial<Record<AppointmentStatus, string>>> = {
  equipe: {
    solicitada: '⏳ Solicitação Pendente',
    encaixe_urgente: '🚨 Encaixe Urgente',
    confirmada: '✅ Confirmada'
  },
  paciente: {
    solicitada: '⏳ Aguardando Confirmação',
    encaixe_urgente: '🚨 Encaixe Prioritário',
    confirmada: '✅ Confirmada'
  }
};

const COR_POR_STATUS: Partial<Record<AppointmentStatus, string>> = {
  solicitada: 'bg-amber-100 text-amber-800',
  encaixe_urgente: 'bg-rose-100 text-rose-800',
  confirmada: 'bg-emerald-100 text-emerald-800'
};

// Só apresentação — a lógica que decide o status de uma consulta continua
// inteiramente em AgendaConsulta.status, calculada onde já era calculada
// (ClinicScheduleManager, App.tsx, etc.). "realizada"/"cancelada" não têm
// badge hoje em nenhuma das duas superfícies — comportamento preservado
// aqui (retorna null), não uma lacuna desta extração.
export const AppointmentStatusBadge: React.FC<AppointmentStatusBadgeProps> = ({ status, contexto = 'equipe' }) => {
  const label = LABEL_POR_CONTEXTO[contexto][status];
  const cor = COR_POR_STATUS[status];
  if (!label || !cor) return null;

  const className = [cor, 'text-[10px] font-bold px-2 py-0.5 rounded-full', contexto === 'paciente' ? 'uppercase' : '']
    .filter(Boolean)
    .join(' ');

  return <span className={className}>{label}</span>;
};
