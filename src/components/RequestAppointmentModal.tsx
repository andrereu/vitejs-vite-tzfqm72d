import React, { useState } from 'react';
import { Calendar, Clock, AlertCircle, X, Send } from 'lucide-react';
import type { AgendaConsulta } from '../types/prenatal';

interface RequestAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequest: (novaSolicitacao: AgendaConsulta) => Promise<void> | void;
  enderecoPadrao: string;
}

export const RequestAppointmentModal: React.FC<RequestAppointmentModalProps> = ({
  isOpen,
  onClose,
  onRequest,
  enderecoPadrao
}) => {
  const [data, setData] = useState('');
  const [turno, setTurno] = useState('Manhã (08:30 - 11:30)');
  const [tipo, setTipo] = useState('Consulta Pré-Natal de Rotina');
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) {
      alert('Selecione uma data de preferência.');
      return;
    }

    setIsSubmitting(true);
    const solicitacao: AgendaConsulta = {
      id: `req-${Date.now()}`,
      data,
      horario: turno.split(' ')[0], // Sugestão inicial
      tipo,
      local: enderecoPadrao || 'Consultório Médico',
      observacoes: `[Preferência de Turno: ${turno}] ${observacoes}`.trim(),
      status: 'solicitada',
      solicitadoPor: 'paciente',
      solicitadoEm: new Date().toISOString()
    };

    await onRequest(solicitacao);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-gray-800">
        
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Solicitar Consulta</h3>
              <p className="text-[11px] text-gray-500">A recepção confirmará seu horário</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Data de Preferência *</label>
            <input
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border rounded-xl"
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Turno de Preferência *</label>
            <select
              value={turno}
              onChange={(e) => setTurno(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border rounded-xl"
            >
              <option value="Manhã (08:30 - 11:30)">Manhã (08:30 às 11:30)</option>
              <option value="Tarde (13:30 - 17:30)">Tarde (13:30 às 17:30)</option>
              <option value="Final do Dia (17:30 - 19:00)">Final do Dia (17:30 às 19:00)</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Tipo de Atendimento</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border rounded-xl"
            >
              <option value="Consulta Pré-Natal de Rotina">Consulta Pré-Natal de Rotina</option>
              <option value="Avaliação de Exames / Retorno">Avaliação de Exames / Retorno</option>
              <option value="Avaliação de Queixa / Sintomas">Avaliação de Queixa / Sintomas</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Observações ou Sintomas para a Recepção</label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Levar resultado da USG Morfológica..."
              className="w-full p-2.5 bg-gray-50 border rounded-xl"
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-2 text-[11px] text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Após enviar, a solicitação ficará como <strong>Pendente</strong>. A secretária entrará em contato via WhatsApp e e-mail com a confirmação do horário exato.</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#2E482A] hover:bg-[#233820] text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <Send className="w-4 h-4" /> {isSubmitting ? 'Enviando Pedido...' : 'Enviar Solicitação de Consulta'}
          </button>
        </form>
      </div>
    </div>
  );
};
