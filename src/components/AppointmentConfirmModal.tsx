import React, { useState } from 'react';
import { Check, X, Calendar, Clock, AlertTriangle, MessageCircle, Send } from 'lucide-react';
import { AgendaConsulta, Patient } from '../types/prenatal';
import { formatDateBR } from '../utils/formatters';

interface AppointmentConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AgendaConsulta | null;
  patient: Patient;
  onSave: (updatedAppointment: AgendaConsulta, notifyWhatsApp: boolean) => Promise<void> | void;
}

export const AppointmentConfirmModal: React.FC<AppointmentConfirmModalProps> = ({
  isOpen,
  onClose,
  appointment,
  patient,
  onSave,
}) => {
  if (!isOpen || !appointment) return null;

  const [data, setData] = useState(appointment.data);
  const [horario, setHorario] = useState(appointment.horario || '14:00');
  const [status, setStatus] = useState<AgendaConsulta['status']>(appointment.status === 'solicitada' ? 'confirmada' : appointment.status);
  const [notaSecretaria, setNotaSecretaria] = useState(appointment.notaSecretaria || '');
  const [isEmergency, setIsEmergency] = useState(appointment.status === 'encaixe_urgente');
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const updated: AgendaConsulta = {
      ...appointment,
      data,
      horario,
      status: isEmergency ? 'encaixe_urgente' : status,
      notaSecretaria,
    };

    await onSave(updated, notifyWhatsApp);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-gray-800">
        
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Confirmar / Gerenciar Consulta</h3>
            <p className="text-[11px] text-gray-500">Paciente: <strong>{patient.nome}</strong></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          
          {/* Alerta de Solicitação Pendente */}
          {appointment.status === 'solicitada' && (
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900">
              <strong className="block text-[11px] font-bold">Solicitação da Paciente:</strong>
              <p className="text-[11px] mt-0.5">{appointment.observacoes || 'Sem observações adicionais.'}</p>
            </div>
          )}

          {/* Encaixe de Urgência */}
          <label className="flex items-center gap-2 p-3 bg-rose-50 rounded-2xl border border-rose-200 cursor-pointer">
            <input
              type="checkbox"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
            />
            <div>
              <span className="font-bold text-rose-900 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Encaixe de Emergência / Urgência
              </span>
              <span className="text-[10px] text-rose-700 block">Marca o atendimento como prioritário no painel</span>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Data *</label>
              <input
                type="date"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Horário Confirmado *</label>
              <input
                type="time"
                required
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Status da Consulta</label>
            <select
              value={status}
              disabled={isEmergency}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full p-2.5 bg-gray-50 border rounded-xl"
            >
              <option value="confirmada">Confirmada</option>
              <option value="solicitada">Pendente (Aguardando)</option>
              <option value="realizada">Realizada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Nota Interna da Recepção</label>
            <input
              type="text"
              placeholder="Ex: Confirmado via telefone com a gestante..."
              value={notaSecretaria}
              onChange={(e) => setNotaSecretaria(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border rounded-xl"
            />
          </div>

          {/* Notificação WhatsApp */}
          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyWhatsApp}
              onChange={(e) => setNotifyWhatsApp(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> Gerar mensagem de confirmação no WhatsApp
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-[#2E482A] hover:bg-[#233820] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md"
            >
              <Check className="w-4 h-4" /> {isSaving ? 'Salvando...' : 'Confirmar Horário'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
