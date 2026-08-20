import React from 'react';
import type { AgendaConsulta, Patient } from '../../types/prenatal';
import { formatDateBR, formatarHorarioResumo } from '../../utils/formatters';

interface PendingRequestsProps {
  pendencias: (AgendaConsulta & { patient: Patient })[];
  onAprovar: (patientId: string, appointmentId: string) => void;
  onRevisar: (app: AgendaConsulta, patient: Patient) => void;
}

// Só apresentação: recebe as solicitações já filtradas/ordenadas pelo
// ClinicScheduleManager e dispara os dois callbacks que ele já usava antes
// desta extração — "Aprovar" chama o mesmo fluxo de onQuickStatusChange
// (com a checagem de conflito de bloqueio da Fase 2D-D1 preservada, porque
// é a mesma função); "Revisar" abre o mesmo AppointmentConfirmModal de
// sempre (onOpenConfirmModal). Nada de Firestore, nada de regra de bloqueio
// aqui — isso continua inteiramente onde já estava.
export const PendingRequests: React.FC<PendingRequestsProps> = ({ pendencias, onAprovar, onRevisar }) => {
  if (pendencias.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl border border-amber-200 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-amber-100 bg-amber-50/60">
        <h3 className="font-bold text-gray-900 text-sm">
          Pendências <span className="text-amber-700">({pendencias.length})</span>
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">Solicitações aguardando sua decisão</p>
      </div>

      <div className="divide-y divide-gray-100">
        {pendencias.map((item) => (
          <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-sm text-gray-900 truncate">{item.patient.nome}</h4>
              <p className="text-xs text-gray-500">
                {formatDateBR(item.data)}{formatarHorarioResumo(item.horario, item.periodoPreferido)}
              </p>
              {item.observacoes && (
                <p className="text-[11px] text-gray-500 mt-1 truncate">{item.observacoes}</p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => onAprovar(item.patient.id, item.id)}
                className="px-3.5 py-1.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
              >
                Aprovar
              </button>
              <button
                type="button"
                onClick={() => onRevisar(item, item.patient)}
                className="text-xs font-bold text-gray-600 hover:text-gray-900 underline cursor-pointer shrink-0"
              >
                Revisar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
