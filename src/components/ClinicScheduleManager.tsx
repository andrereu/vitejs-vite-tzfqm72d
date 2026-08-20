import React, { useState } from 'react';
import { Clock, AlertTriangle, CheckCircle, List, User, Send, Ban } from 'lucide-react';
import type { Patient, AgendaConsulta, HorarioBloqueado } from '../types/prenatal';
import { formatDateBR, getLocalDateString } from '../utils/formatters';
import { generateAppointmentReminderLink } from '../utils/whatsapp';
import { compararAgendamentos, consultasEmConflitoComBloqueio } from '../utils/agendaScheduling';
import { AppointmentStatusBadge } from './agenda/AppointmentStatusBadge';
import { PendingRequests } from './agenda/PendingRequests';
import { TodayAgenda } from './agenda/TodayAgenda';
import { UpcomingDays } from './agenda/UpcomingDays';
import { CalendarView, type DiaCalendario } from './agenda/CalendarView';
import { AppointmentHistory } from './agenda/AppointmentHistory';
import { AppointmentReminders } from './agenda/AppointmentReminders';
import { selecionarConsultasParaLembrete, marcarLembreteComoEnviado } from '../utils/agendaReminders';

const DIAS_SEMANA_ABREV = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Vínculo clínico real (D1-C): só conta como "tem evolução registrada" se
// existir uma ConsultaEvolucao cujo agendaConsultaId aponta exatamente pra
// essa AgendaConsulta — nunca por coincidência de data (pode haver várias
// consultas no mesmo dia). Evoluções antigas sem agendaConsultaId (fluxo
// legado, D1-A) nunca contam como vínculo de nenhuma AgendaConsulta.
function possuiEvolucaoVinculada(agendaConsultaId: string, patient: Patient): boolean {
  return (patient.consultasEvolucao || []).some((c) => c.agendaConsultaId === agendaConsultaId);
}

interface ClinicScheduleManagerProps {
  patients: Patient[];
  onOpenConfirmModal: (app: AgendaConsulta, pat: Patient) => void;
  onQuickStatusChange: (patientId: string, appointmentId: string, newStatus: AgendaConsulta['status']) => Promise<void>;
  blockedSlots: HorarioBloqueado[];
  onAddBlockedSlot: (slot: HorarioBloqueado) => Promise<void>;
  onRemoveBlockedSlot: (id: string) => Promise<void>;
  saveToFirestore: (updatedList: Patient[]) => Promise<void>;
  onRegistrarAtendimento: (app: AgendaConsulta, pat: Patient) => void;
}

export const ClinicScheduleManager: React.FC<ClinicScheduleManagerProps> = ({
  patients,
  onOpenConfirmModal,
  onQuickStatusChange,
  blockedSlots,
  onAddBlockedSlot,
  onRemoveBlockedSlot,
  saveToFirestore,
  onRegistrarAtendimento,
}) => {
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

  // "Próximos Dias": 7 dias a partir de amanhã (nunca hoje), calculados com
  // setDate/getLocalDateString — mesmo padrão já usado pra "amanhã" em
  // DoctorRemindersTab.tsx (não tocado aqui), sem toISOString e sem outra
  // função de data. Só confirmada/encaixe_urgente contam pra cada dia —
  // solicitada, cancelada e realizada nunca entram nessa contagem.
  const proximosDias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    const dataStr = getLocalDateString(d);
    const consultasDoDia = agendaSemPendencias.filter(
      (a) => a.data === dataStr && (a.status === 'confirmada' || a.status === 'encaixe_urgente')
    );
    return {
      data: dataStr,
      label: i === 0 ? 'Amanhã' : `${DIAS_SEMANA_ABREV[d.getDay()]} ${d.getDate()}`,
      totalConsultas: consultasDoDia.length,
      temUrgencia: consultasDoDia.some((a) => a.status === 'encaixe_urgente'),
      temBloqueio: blockedSlots.some((b) => b.data === dataStr)
    };
  });

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

  // Resumo por dia do mês exibido — mesma allowlist de status já usada em
  // "Hoje"/"Próximos Dias" pra contagem (confirmada/encaixe_urgente), mais
  // pendência (solicitada) e tipo de bloqueio (dia inteiro vs. parcial),
  // pra CalendarView representar cada situação sem repetir cálculo próprio.
  const diasDoMes: DiaCalendario[] = Array.from({ length: totalDaysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const dataStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const consultasDoDia = allAppointments.filter((a) => a.data === dataStr);
    const bloqueiosDoDia = blockedSlots.filter((b) => b.data === dataStr);
    const bloqueio: DiaCalendario['bloqueio'] = bloqueiosDoDia.some((b) => b.diaInteiro)
      ? 'dia_inteiro'
      : bloqueiosDoDia.length > 0
        ? 'parcial'
        : 'nenhum';

    return {
      dia: dayNum,
      data: dataStr,
      totalConsultas: consultasDoDia.filter((a) => a.status === 'confirmada' || a.status === 'encaixe_urgente').length,
      temUrgencia: consultasDoDia.some((a) => a.status === 'encaixe_urgente'),
      temPendencia: consultasDoDia.some((a) => a.status === 'solicitada'),
      bloqueio
    };
  });

  // AGENDA ATIVA — só confirmada/encaixe_urgente a partir daqui;
  // realizada/cancelada saem da fila e passam a viver só no Histórico
  // (abaixo). Com um dia selecionado (calendário ou Próximos Dias), o
  // mecanismo de sempre continua funcionando: mostra as consultas ativas
  // daquele dia, com as mesmas ações. Sem filtro, evita repetir o que
  // Hoje/Próximos Dias já cobrem — mostra só pendente de registro
  // (passado sem baixa) e futuro além dos próximos 7 dias.
  const agendaAtiva = allAppointments.filter((a) => a.status === 'confirmada' || a.status === 'encaixe_urgente');
  const diasProximosSet = new Set(proximosDias.map((d) => d.data));
  // "Pendente de registro" (D1-C): já passou E ainda não tem uma
  // ConsultaEvolucao vinculada (agendaConsultaId) — deixou de ser só "data <
  // hoje" (inferência temporal da C7) pra virar um fato verificável no
  // prontuário da própria paciente já carregado em memória (item.patient).
  const pendentesRegistro = agendaAtiva.filter((a) => a.data < hojeStr && !possuiEvolucaoVinculada(a.id, a.patient));
  const maisConsultasFuturas = agendaAtiva.filter((a) => a.data > hojeStr && !diasProximosSet.has(a.data));

  // filterStatus nunca muda (setFilterStatus não é chamado em lugar
  // nenhum — comportamento pré-existente, não introduzido por esta
  // etapa), então na prática este filtro é sempre 'todos'; mantido como
  // estava pra não alterar esse ponto do arquivo.
  const filteredAppointments = (
    selectedDateFilter ? agendaAtiva.filter((item) => item.data === selectedDateFilter) : [...pendentesRegistro, ...maisConsultasFuturas]
  ).filter((item) => filterStatus === 'todos' || item.status === filterStatus);

  // HISTÓRICO — realizada ou cancelada, qualquer data. A ordem já vem de
  // allAppointments (compararAgendamentos), não recalculada aqui.
  const historico = allAppointments.filter((a) => a.status === 'realizada' || a.status === 'cancelada');

  // ESTADO DE LEMBRETES — "Amanhã" já é proximosDias[0].data (nenhum
  // cálculo de data novo). selecionarConsultasParaLembrete é a mesma
  // função usada pela aba 🔔 Lembretes do Dia (DoctorRemindersTab): uma
  // única fonte/regra, dois caminhos de entrada (clicar em "Amanhã" aqui
  // ou abrir a aba). Selecionar esse dia entra no estado de lembretes em
  // vez de cair em "Outras Consultas", pra não mostrar a mesma consulta
  // duas vezes na tela.
  const amanha = proximosDias[0].data;
  const consultasParaLembreteAmanha = selecionarConsultasParaLembrete(patients, amanha);
  const estadoLembretes = selectedDateFilter === amanha;

  const handleEnviarLembrete = (patientId: string, agendaId: string) => {
    saveToFirestore(marcarLembreteComoEnviado(patients, patientId, agendaId));
  };

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

      {/* FILTRO ATIVO + BLOQUEIO */}
      <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-xs flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
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

      <PendingRequests
        pendencias={pendencias}
        onAprovar={(patientId, appointmentId) => onQuickStatusChange(patientId, appointmentId, 'confirmada')}
        onRevisar={onOpenConfirmModal}
      />

      <TodayAgenda
        data={hojeStr}
        consultas={hojeOrdenado}
        onGerenciar={onOpenConfirmModal}
        onRegistrarAtendimento={onRegistrarAtendimento}
      />

      <UpcomingDays
        dias={proximosDias}
        diaSelecionado={selectedDateFilter}
        onSelecionarDia={(data) => setSelectedDateFilter((atual) => (atual === data ? '' : data))}
      />

      {/* ESTADO DE LEMBRETES — só aparece quando "Amanhã" está selecionado
          em Próximos Dias (ou vindo da aba 🔔 Lembretes do Dia); mesma
          lista/regra da aba, não uma segunda implementação. */}
      {estadoLembretes && (
        <AppointmentReminders data={amanha} itens={consultasParaLembreteAmanha} onEnviar={handleEnviarLembrete} />
      )}

      {/* 1. CALENDÁRIO MENSAL */}
      <CalendarView
        mesLabel={`${monthNames[month]} de ${year}`}
        diasVaziosAntes={firstDayIndex}
        dias={diasDoMes}
        hoje={hojeStr}
        diaSelecionado={selectedDateFilter}
        onSelecionarDia={(data) => setSelectedDateFilter((atual) => (atual === data ? '' : data))}
        onMesAnterior={handlePrevMonth}
        onMesSeguinte={handleNextMonth}
        onIrParaHoje={() => setCurrentMonthDate(new Date())}
      />

      {/* 2. OUTRAS CONSULTAS — agenda ativa que não está adequadamente
          coberta por Hoje/Próximos Dias: pendente de registro (passado sem
          baixa) e futuro além dos próximos 7 dias. Selecionar um dia no
          calendário/Próximos Dias continua filtrando pra aquele dia
          especificamente, com as mesmas ações de sempre. Some quando o dia
          selecionado é "amanhã" — nesse caso o estado de lembretes acima já
          mostra essas mesmas consultas, com ações mais específicas
          (enviar/reenviar lembrete), sem precisar repetir a lista aqui. */}
      {!estadoLembretes && (
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center gap-3 flex-wrap">
          <div>
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <List className="w-4 h-4 text-[var(--brand-primary)]" /> Outras Consultas
            </h3>
            {!selectedDateFilter && pendentesRegistro.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg mt-1">
                {pendentesRegistro.length} pendente{pendentesRegistro.length > 1 ? 's' : ''} de registro
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500">{filteredAppointments.length} agendamento(s)</span>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-xs">
            {selectedDateFilter
              ? 'Nenhuma consulta encontrada para a data selecionada.'
              : 'Nenhuma consulta pendente de registro ou fora dos próximos dias.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredAppointments.map((item) => {
              const pendenteDeRegistro = item.data < hojeStr && !possuiEvolucaoVinculada(item.id, item.patient);
              return (
                <div key={item.id} className="p-4 hover:bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-xs bg-[var(--brand-primary)] text-white px-2.5 py-0.5 rounded-full">
                        {formatDateBR(item.data)} às {item.horario}
                      </span>
                      <AppointmentStatusBadge status={item.status} contexto="equipe" />
                      {pendenteDeRegistro && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          Pendente de registro
                        </span>
                      )}
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
                    {/* Abre o mesmo modal "Registrar Nova Consulta" que já
                        existe no cartão da paciente — só chega com o
                        contexto desta AgendaConsulta já preenchido. Não
                        muda o status da consulta. */}
                    <button
                      onClick={() => onRegistrarAtendimento(item, item.patient)}
                      className="px-3 py-1.5 bg-white border border-[var(--brand-primary)] text-[var(--brand-primary)] rounded-xl text-xs font-bold cursor-pointer"
                    >
                      🩺 Registrar atendimento
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
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* 3. HISTÓRICO */}
      <AppointmentHistory itens={historico} onGerenciar={onOpenConfirmModal} />

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
