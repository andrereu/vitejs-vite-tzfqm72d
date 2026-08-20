import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle, List, ChevronLeft, ChevronRight, User, Send, Ban } from 'lucide-react';
import type { Patient, AgendaConsulta, HorarioBloqueado } from '../types/prenatal';
import { formatDateBR, getLocalDateString } from '../utils/formatters';
import { generateAppointmentReminderLink } from '../utils/whatsapp';
import { compararAgendamentos, consultasEmConflitoComBloqueio } from '../utils/agendaScheduling';
import { AppointmentStatusBadge } from './agenda/AppointmentStatusBadge';
import { PendingRequests } from './agenda/PendingRequests';
import { TodayAgenda } from './agenda/TodayAgenda';

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
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [newBlockDate, setNewBlockDate] = useState(getLocalDateString());
  const [newBlockReason, setNewBlockReason] = useState('');
  const [newBlockTipo, setNewBlockTipo] = useState<'dia_inteiro' | 'periodo'>('dia_inteiro');
  const [newBlockHoraInicio, setNewBlockHoraInicio] = useState('');
  const [newBlockHoraFim, setNewBlockHoraFim] = useState('');

  const resetBlockForm = () => {
    setNewBlockReason('');
    setNewBlockTipo('dia_inteiro');
    setNewBlockHoraInicio('');
    setNewBlockHoraFim('');
  };

  // Todas as consultas consolidadas — ordenação determinística (nunca monta
  // Date a partir de horario vazio, que quebraria em solicitações ainda sem
  // horário confirmado).
  const allAppointments = patients.flatMap((p) =>
    (p.agendaConsultas || []).map((app) => ({
      ...app,
      patient: p,
    }))
  ).sort(compararAgendamentos);

  // Métricas rápidas
  const pendingCount = allAppointments.filter((a) => a.status === 'solicitada').length;
  const emergencyCount = allAppointments.filter((a) => a.status === 'encaixe_urgente').length;

  // Pendências ganham seção própria (abaixo) e saem da fila geral — sem
  // duplicar a mesma solicitação nos dois lugares. A ordem já vem de
  // allAppointments (compararAgendamentos), então não precisa ordenar de
  // novo aqui.
  const pendencias = allAppointments.filter((a) => a.status === 'solicitada');
  const agendaSemPendencias = allAppointments.filter((a) => a.status !== 'solicitada');

  // "Hoje": data local (não toISOString — mesmo utilitário já usado em todo
  // o resto da agenda) e sem cancelada/solicitada (solicitada já vive em
  // Pendências). Urgente primeiro, resto cronológico — como
  // agendaSemPendencias já está ordenado por compararAgendamentos, filtrar
  // preserva essa ordem em cada grupo; não precisa ordenar de novo.
  const hojeStr = getLocalDateString();
  const consultasHoje = agendaSemPendencias.filter((a) => a.data === hojeStr && a.status !== 'cancelada');
  const hojeUrgentes = consultasHoje.filter((a) => a.status === 'encaixe_urgente');
  const hojeResto = consultasHoje.filter((a) => a.status !== 'encaixe_urgente');
  const hojeOrdenado = [...hojeUrgentes, ...hojeResto];

  // Lógica do Calendário Mensal
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => setCurrentMonthDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonthDate(new Date(year, month + 1, 1));

  // Filtragem da Lista — a partir daqui já sem pendências, que têm sua
  // própria seção.
  const filteredAppointments = agendaSemPendencias.filter((item) => {
    const matchesDate = !selectedDateFilter || item.data === selectedDateFilter;
    const matchesStatus = filterStatus === 'todos' || item.status === filterStatus;
    return matchesDate && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* INDICADORES */}
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

      {/* SELETOR DE MODO DE VISUALIZAÇÃO */}
      <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-gray-100 rounded-2xl">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'calendar' ? 'bg-[var(--brand-primary)] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> Visão Calendário
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-[var(--brand-primary)] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Fila / Lista
            </button>
          </div>

          {selectedDateFilter && (
            <span className="text-xs bg-emerald-50 text-[var(--brand-primary)] font-bold px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-2">
              📅 Filtrado: {formatDateBR(selectedDateFilter)}
              <button onClick={() => setSelectedDateFilter('')} className="hover:text-red-600 text-xs">✕</button>
            </span>
          )}
        </div>

        <button
          onClick={() => setShowBlockModal(true)}
          className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border cursor-pointer"
        >
          <Ban className="w-3.5 h-3.5 text-rose-600" /> Bloquear Data / Folga
        </button>
      </div>

      {/* 1. VISUALIZAÇÃO EM CALENDÁRIO */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
          
          {/* Navegação do Mês */}
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-900 text-base">
              {monthNames[month]} de {year}
            </h3>
            <div className="flex items-center gap-1">
              <button onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-100 rounded-xl border">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentMonthDate(new Date())} className="px-3 py-1 text-xs font-bold hover:bg-gray-100 rounded-xl border">
                Hoje
              </button>
              <button onClick={handleNextMonth} className="p-1.5 hover:bg-gray-100 rounded-xl border">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grade dos Dias */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
              <div key={d} className="text-[11px] font-bold text-gray-400 uppercase py-1">
                {d}
              </div>
            ))}

            {/* Dias vazios antes do 1º dia */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[85px] bg-gray-50/50 rounded-xl border border-transparent" />
            ))}

            {/* Dias do mês */}
            {Array.from({ length: totalDaysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              
              const dayAppointments = allAppointments.filter((a) => a.data === dateStr);
              const isBlocked = blockedSlots.some((b) => b.data === dateStr);
              const isSelected = selectedDateFilter === dateStr;

              return (
                <div
                  key={dayNum}
                  onClick={() => setSelectedDateFilter(isSelected ? '' : dateStr)}
                  className={`min-h-[85px] p-1.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected ? 'ring-2 ring-[var(--brand-primary)] bg-emerald-50/40' : 'bg-white hover:bg-gray-50'
                  } ${isBlocked ? 'bg-rose-50/60 border-rose-200' : 'border-gray-200'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold ${isBlocked ? 'text-rose-700' : 'text-gray-800'}`}>
                      {dayNum}
                    </span>
                    {dayAppointments.length > 0 && (
                      <span className="text-[9px] bg-gray-100 text-gray-700 px-1.5 py-0.2 rounded-full font-bold">
                        {dayAppointments.length}
                      </span>
                    )}
                  </div>

                  {/* Tags das Consultas no Dia */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {isBlocked && (
                      <div className="text-[9px] font-bold text-rose-700 bg-rose-100/80 px-1 py-0.5 rounded truncate">
                        ⛔ Bloqueado
                      </div>
                    )}
                    {dayAppointments.slice(0, 2).map((app) => (
                      <div
                        key={app.id}
                        className={`text-[9px] px-1 py-0.5 rounded font-medium truncate ${
                          app.status === 'solicitada'
                            ? 'bg-amber-100 text-amber-900 font-bold'
                            : app.status === 'encaixe_urgente'
                            ? 'bg-rose-100 text-rose-900 font-bold'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {app.horario} • {app.patient.nome.split(' ')[0]}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-[8px] text-gray-400 font-bold text-center">
                        +{dayAppointments.length - 2} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <PendingRequests
        pendencias={pendencias}
        onAprovar={(patientId, appointmentId) => onQuickStatusChange(patientId, appointmentId, 'confirmada')}
        onRevisar={onOpenConfirmModal}
      />

      <TodayAgenda data={hojeStr} consultas={hojeOrdenado} onGerenciar={onOpenConfirmModal} />

      {/* 2. FILA DE CONSULTAS DETALHADA */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <List className="w-4 h-4 text-[var(--brand-primary)]" /> Consultas Selecionadas
          </h3>
          <span className="text-xs text-gray-500">{filteredAppointments.length} agendamento(s)</span>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-xs">
            Nenhuma consulta encontrada para a data/filtro selecionado.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredAppointments.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs bg-[var(--brand-primary)] text-white px-2.5 py-0.5 rounded-full">
                      {formatDateBR(item.data)} às {item.horario}
                    </span>
                    <AppointmentStatusBadge status={item.status} contexto="equipe" />
                  </div>

                  <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    {item.patient.nome}
                    <span className="text-[11px] font-normal text-gray-500">• Bebê: {item.patient.nomeBebe}</span>
                  </h4>
                  <p className="text-xs text-gray-600">{item.tipo}</p>
                </div>

                <div className="flex items-center gap-1.5 self-end md:self-center">
                  {/* "Aprovar" pra solicitada saiu daqui — vive só na seção
                      Pendências agora, sem essa linha nunca mais aparecer
                      pra um item que já não pode ter esse status aqui. */}
                  <button
                    onClick={() => onOpenConfirmModal(item, item.patient)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Gerenciar
                  </button>
                  <a
                    href={generateAppointmentReminderLink(item.patient, item)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" /> Zap
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL BLOQUEIO */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold text-sm text-gray-900">Bloquear Data / Folga</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (newBlockTipo === 'periodo') {
                if (!newBlockHoraInicio || !newBlockHoraFim) {
                  alert('Informe o horário inicial e o horário final do bloqueio.');
                  return;
                }
                if (newBlockHoraInicio >= newBlockHoraFim) {
                  alert('O horário inicial precisa ser antes do horário final.');
                  return;
                }
              }

              const novoBloqueio: HorarioBloqueado = newBlockTipo === 'periodo'
                ? { id: `blk-${Date.now()}`, data: newBlockDate, diaInteiro: false, horarioInicio: newBlockHoraInicio, horarioFim: newBlockHoraFim, motivo: newBlockReason }
                : { id: `blk-${Date.now()}`, data: newBlockDate, diaInteiro: true, motivo: newBlockReason };

              // Não deixa criar o bloqueio por cima de consulta já
              // confirmada/encaixe urgente — a médica precisa cancelar ou
              // reagendar essas consultas antes, o bloqueio não faz isso
              // sozinho.
              const conflitos = consultasEmConflitoComBloqueio(allAppointments, novoBloqueio);
              if (conflitos.length > 0) {
                alert(
                  `Não é possível criar este bloqueio: há ${conflitos.length} consulta${conflitos.length > 1 ? 's' : ''} confirmada(s) ou encaixe(s) urgente(s) nesse período. Cancele ou reagende antes de bloquear.`
                );
                return;
              }

              await onAddBlockedSlot(novoBloqueio);
              resetBlockForm();
              setShowBlockModal(false);
            }} className="space-y-3 text-xs">
              <input type="date" required value={newBlockDate} onChange={(e) => setNewBlockDate(e.target.value)} className="w-full p-2.5 border rounded-xl" />

              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-700">
                  <input
                    type="radio"
                    name="tipoBloqueio"
                    checked={newBlockTipo === 'dia_inteiro'}
                    onChange={() => setNewBlockTipo('dia_inteiro')}
                  />
                  Dia inteiro
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-gray-700">
                  <input
                    type="radio"
                    name="tipoBloqueio"
                    checked={newBlockTipo === 'periodo'}
                    onChange={() => setNewBlockTipo('periodo')}
                  />
                  Período
                </label>
              </div>

              {newBlockTipo === 'periodo' && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    required
                    value={newBlockHoraInicio}
                    onChange={(e) => setNewBlockHoraInicio(e.target.value)}
                    className="w-full p-2.5 border rounded-xl"
                  />
                  <input
                    type="time"
                    required
                    value={newBlockHoraFim}
                    onChange={(e) => setNewBlockHoraFim(e.target.value)}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              )}

              <input type="text" required placeholder="Motivo (ex: Congresso, Folga)" value={newBlockReason} onChange={(e) => setNewBlockReason(e.target.value)} className="w-full p-2.5 border rounded-xl" />
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => { resetBlockForm(); setShowBlockModal(false); }} className="px-3 py-1.5 bg-gray-100 rounded-xl font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 bg-rose-600 text-white rounded-xl font-bold">Confirmar</button>
              </div>
            </form>

            {blockedSlots.length > 0 && (
              <div className="space-y-1.5 border-t pt-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Bloqueios ativos</span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {[...blockedSlots].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0)).map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
                      <span className="text-[11px] text-gray-700 truncate">
                        {formatDateBR(b.data)} {b.diaInteiro ? '(dia inteiro)' : `(${b.horarioInicio}–${b.horarioFim})`} — {b.motivo}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveBlockedSlot(b.id)}
                        className="text-rose-600 hover:text-rose-700 text-[11px] font-bold shrink-0 cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
