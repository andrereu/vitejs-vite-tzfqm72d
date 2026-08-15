import React, { useState } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle, XCircle, User, MapPin, Send, Plus, Ban } from 'lucide-react';
import { Patient, AgendaConsulta, HorarioBloqueado } from '../types/prenatal';
import { formatDateBR } from '../utils/formatters';
import { generateAppointmentReminderLink } from '../utils/whatsapp';

interface ClinicScheduleManagerProps {
  patients: Patient[];
  onOpenConfirmModal: (app: AgendaConsulta, pat: Patient) => void;
  onQuickStatusChange: (patientId: string, appointmentId: string, newStatus: AgendaConsulta['status']) => Promise<void>;
  blockedSlots: HorarioBloqueado[];
  onAddBlockedSlot: (slot: HorarioBloqueado) => Promise<void>;
  onRemoveBlockedSlot: (id: string) => Promise<void>;
}

export const ClinicScheduleManager: React.FC<ClinicScheduleManagerProps> = ({
  patients,
  onOpenConfirmModal,
  onQuickStatusChange,
  blockedSlots,
  onAddBlockedSlot,
  onRemoveBlockedSlot,
}) => {
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [newBlockDate, setNewBlockDate] = useState(new Date().toISOString().split('T')[0]);
  const [newBlockReason, setNewBlockReason] = useState('');

  // Extrair todas as consultas de todas as pacientes
  const allAppointments = patients.flatMap((p) =>
    (p.agendaConsultas || []).map((app) => ({
      ...app,
      patient: p,
    }))
  ).sort((a, b) => new Date(`${a.data}T${a.horario}`).getTime() - new Date(`${b.data}T${b.horario}`).getTime());

  // Filtros combinados
  const filteredAppointments = allAppointments.filter((item) => {
    const matchesDate = !filterDate || item.data === filterDate;
    const matchesStatus = filterStatus === 'todos' || item.status === filterStatus;
    return matchesDate && matchesStatus;
  });

  const pendingCount = allAppointments.filter((a) => a.status === 'solicitada').length;
  const emergencyCount = allAppointments.filter((a) => a.status === 'encaixe_urgente').length;

  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockReason) return;
    await onAddBlockedSlot({
      id: `blk-${Date.now()}`,
      data: newBlockDate,
      diaInteiro: true,
      motivo: newBlockReason,
    });
    setNewBlockReason('');
    setShowBlockModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* BARRA DE INDICADORES RÁPIDOS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">Solicitações Pendentes</span>
            <div className="text-2xl font-bold text-amber-950 mt-0.5">{pendingCount}</div>
          </div>
          <Clock className="w-8 h-8 text-amber-500 opacity-60" />
        </div>

        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-rose-800 tracking-wider">Encaixes de Urgência</span>
            <div className="text-2xl font-bold text-rose-950 mt-0.5">{emergencyCount}</div>
          </div>
          <AlertTriangle className="w-8 h-8 text-rose-500 opacity-60" />
        </div>

        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Total de Agendamentos</span>
            <div className="text-2xl font-bold text-emerald-950 mt-0.5">{allAppointments.length}</div>
          </div>
          <CheckCircle className="w-8 h-8 text-emerald-500 opacity-60" />
        </div>
      </div>

      {/* FILTROS & AÇÕES */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Filtrar por Data</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-xs p-2 border rounded-xl bg-gray-50"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-0.5">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs p-2 border rounded-xl bg-gray-50 font-medium"
            >
              <option value="todos">Todos os Status</option>
              <option value="solicitada">⏳ Pendentes (Solicitadas)</option>
              <option value="encaixe_urgente">🚨 Encaixes de Urgência</option>
              <option value="confirmada">✅ Confirmadas</option>
              <option value="cancelada">❌ Canceladas</option>
            </select>
          </div>

          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="text-xs text-gray-500 hover:text-gray-800 underline self-end pb-2 cursor-pointer"
            >
              Limpar Data
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 self-end">
          <button
            onClick={() => setShowBlockModal(true)}
            className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-gray-200 cursor-pointer"
          >
            <Ban className="w-3.5 h-3.5 text-rose-600" /> Bloquear Horário / Folga
          </button>
        </div>
      </div>

      {/* LISTA DE CONSULTAS */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#2E482A]" /> Fila Geral da Recepção
          </h3>
          <span className="text-xs text-gray-500">{filteredAppointments.length} agendamento(s)</span>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-xs">
            Nenhuma consulta encontrada com os filtros selecionados.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredAppointments.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50/80 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                
                {/* DADOS DA GESTANTE E HORÁRIO */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs bg-[#2E482A] text-white px-2.5 py-0.5 rounded-full">
                      {formatDateBR(item.data)} às {item.horario}
                    </span>

                    {item.status === 'solicitada' && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        ⏳ Solicitação Pendente
                      </span>
                    )}
                    {item.status === 'encaixe_urgente' && (
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        🚨 Encaixe Urgente
                      </span>
                    )}
                    {item.status === 'confirmada' && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        ✅ Confirmada
                      </span>
                    )}
                    {item.status === 'cancelada' && (
                      <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        ❌ Cancelada
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5 pt-0.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    {item.patient.nome}
                    <span className="text-[11px] font-normal text-gray-500">• Bebê: {item.patient.nomeBebe}</span>
                  </h4>

                  <p className="text-xs text-gray-600">
                    Tipo: <strong>{item.tipo}</strong> {item.observacoes ? `• Obs: ${item.observacoes}` : ''}
                  </p>
                  {item.notaSecretaria && (
                    <p className="text-[11px] text-blue-700 bg-blue-50/70 px-2 py-0.5 rounded-md inline-block">
                      📌 Recepção: {item.notaSecretaria}
                    </p>
                  )}
                </div>

                {/* BOTÕES DE AÇÃO RÁPIDA */}
                <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end md:self-center">
                  {item.status === 'solicitada' && (
                    <button
                      onClick={() => onQuickStatusChange(item.patient.id, item.id, 'confirmada')}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                    </button>
                  )}

                  <button
                    onClick={() => onOpenConfirmModal(item, item.patient)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Editar / Detalhes
                  </button>

                  <a
                    href={generateAppointmentReminderLink(item.patient, item)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Enviar confirmação e endereço via WhatsApp"
                  >
                    <Send className="w-3 h-3" /> Zap
                  </a>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* SEÇÃO DE DIAS / HORÁRIOS BLOQUEADOS */}
      {blockedSlots.length > 0 && (
        <div className="bg-white p-5 rounded-3xl border border-gray-200 space-y-3">
          <h4 className="font-bold text-xs text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            <Ban className="w-4 h-4 text-rose-600" /> Datas e Horários com Bloqueio de Atendimento
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {blockedSlots.map((b) => (
              <div key={b.id} className="p-3 bg-rose-50/60 rounded-2xl border border-rose-200 flex justify-between items-center text-xs">
                <div>
                  <strong className="text-rose-950 block">{formatDateBR(b.data)}</strong>
                  <span className="text-[11px] text-rose-700">{b.motivo}</span>
                </div>
                <button
                  onClick={() => onRemoveBlockedSlot(b.id)}
                  className="text-rose-600 hover:text-rose-800 text-[10px] font-bold underline cursor-pointer"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL DE NOVO BLOQUEIO */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm text-gray-900">Bloquear Data de Atendimento</h3>
              <button onClick={() => setShowBlockModal(false)} className="text-gray-400 hover:text-gray-700">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveBlock} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Data *</label>
                <input
                  type="date"
                  required
                  value={newBlockDate}
                  onChange={(e) => setNewBlockDate(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Motivo do Bloqueio *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Congresso Obstétrico, Férias, Feriado..."
                  value={newBlockReason}
                  onChange={(e) => setNewBlockReason(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="px-3 py-1.5 bg-gray-100 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold"
                >
                  Confirmar Bloqueio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
