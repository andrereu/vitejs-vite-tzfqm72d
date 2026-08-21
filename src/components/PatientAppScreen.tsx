import React, { useState } from 'react';
import {
  Upload, Plus, Printer, Syringe, Calculator, AlertCircle,
  Edit3, Bot, MapPin, CalendarPlus, Calendar, Share2, Send, Download, ShieldAlert,
  Activity, FlaskConical, CalendarClock,
  LayoutDashboard, History, CreditCard, ClipboardList, BarChart3, FolderOpen, LayoutGrid, X,
  ChevronRight, LineChart, Table2
} from 'lucide-react';
import type { Patient, AgendaConsulta, ConsultaEvolucao, MarcoPersonalizado, UserRole } from '../types/prenatal';
import type { DoctorTenant } from '../types/saas';
import { PatientHome } from './PatientHome';
import { PatientContextBar } from './PatientContextBar';
import { ConsultaEvolucaoCard } from './ConsultaEvolucaoCard';
import { DocumentoExameCard } from './DocumentoExameCard';
import { PatientFinancialTab } from './PatientFinancialTab';
import { PrenatalChatTab } from './PrenatalChatTab';
import { PatientAuditLog } from './PatientAuditLog';
import { GestationTimeline } from './GestationTimeline';
import { criarMarcoPersonalizado } from '../utils/gestationTimeline';
import { agruparExamesTabelaPorData } from '../utils/examesOrganizacao';
import { formatDateDisplay, formatDateBR, formatarDataAgrupador } from '../utils/formatters';
import { compararAgendamentos } from '../utils/agendaScheduling';
import { encontrarSolicitacaoDoAtendimento } from '../utils/solicitacoes';
import { AppointmentStatusBadge } from './agenda/AppointmentStatusBadge';
import { generateAppointmentReminderLink, generateConsultationSummaryLink, sharePatientCard, cleanPhoneNumber } from '../utils/whatsapp';
import { downloadPatientData } from '../utils/dataExport';
import { hasPermission } from '../utils/rbac';
import { isDoctorBlocked } from '../utils/subscription';
import { LISTA_EXAMES_OFICIAIS } from '../constants/examesList';
import type { ReferenciaGPG } from '../data/gpgReferencia';
import { construirTabelaGPG } from '../data/gpgTabela';
import { CURVAS_GPG, gerarPontosCurva } from '../data/gpgCurvas';

interface PatientAppScreenProps {
  currentPatient: Patient;
  doctorProfile?: DoctorTenant;
  currentGest: { weeks: number; days: number };
  userRole: UserRole | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  nextAppointment: AgendaConsulta | null;
  examAlerts: { titulo: string; desc: string }[];
  referenciaGPG: ReferenciaGPG;
  patients: Patient[];
  saveToFirestore: (updatedList: Patient[]) => Promise<void>;
  setShowRequestAppointmentModal: (v: boolean) => void;
  setShowAddAgendaModal: (v: boolean) => void;
  setEditProfileData: (data: any) => void;
  setShowEditProfileModal: (v: boolean) => void;
  setEditVacinasData: (data: any) => void;
  setShowEditVacinasModal: (v: boolean) => void;
  setEditExamesData: (data: any) => void;
  setShowEditExamesModal: (v: boolean) => void;
  setSelectedAppointmentForConfirm: (v: { app: AgendaConsulta; pat: Patient } | null) => void;
  // D2: abre o modal de Registrar Atendimento pelo prontuário — novo
  // (sem vínculo de Agenda) ou editando um registro já existente.
  onAbrirNovaEvolucao: () => void;
  onEditarEvolucao: (consulta: ConsultaEvolucao) => void;
  // D2.2: abre o modal avulso "Nova Solicitação" (prescrição/exames sem
  // vínculo de atendimento) — mesmo mecanismo usado dentro do atendimento.
  onAbrirNovaSolicitacao: () => void;
  handleCalculateUsg: (e: React.FormEvent) => void;
  calcUsgData: string;
  setCalcUsgData: (v: string) => void;
  calcUsgSemanas: string;
  setCalcUsgSemanas: (v: string) => void;
  calcUsgDias: string;
  setCalcUsgDias: (v: string) => void;
  calcResultado: any;
  setShowUploadExamModal: (v: boolean) => void;
}

// Carteirinha digital da gestante: cabeçalho, seletor de abas, e o conteúdo
// de cada aba (resumo, financeiro, dados clínicos, vacinas, exames, agenda,
// gráfico de peso, calculadora, chat de IA, evolução das consultas).
export const PatientAppScreen: React.FC<PatientAppScreenProps> = ({
  currentPatient,
  doctorProfile,
  currentGest,
  userRole,
  activeTab,
  setActiveTab,
  nextAppointment,
  examAlerts,
  referenciaGPG,
  patients,
  saveToFirestore,
  setShowRequestAppointmentModal,
  setShowAddAgendaModal,
  setEditProfileData,
  setShowEditProfileModal,
  setEditVacinasData,
  setShowEditVacinasModal,
  setEditExamesData,
  setShowEditExamesModal,
  setSelectedAppointmentForConfirm,
  onAbrirNovaEvolucao,
  onEditarEvolucao,
  onAbrirNovaSolicitacao,
  handleCalculateUsg,
  calcUsgData,
  setCalcUsgData,
  calcUsgSemanas,
  setCalcUsgSemanas,
  calcUsgDias,
  setCalcUsgDias,
  calcResultado,
  setShowUploadExamModal
}) => {
  // 'canManageSchedule' também é dada à paciente (só pra ela ver a própria
  // aba de agenda e solicitar consulta) — então ações de uso exclusivo da
  // equipe (agendar direto, enviar lembrete, editar registro) precisam
  // checar o papel explicitamente, não essa permissão compartilhada.
  const isStaff = userRole === 'medica' || userRole === 'secretaria';

  // Resumo da paciente: última consulta registrada (última posição da lista,
  // mesma convenção já usada em gestationTimeline.ts pra "primeira consulta"
  // = primeira posição).
  const ultimaConsulta = currentPatient.consultasEvolucao?.[currentPatient.consultasEvolucao.length - 1];

  // D2.3: Central de Exames organizada — mesmos dados de sempre
  // (examesTabela/examesEnviados), só reagrupados por data/tipo pra exibição.
  const gruposExamesLaboratoriais = agruparExamesTabelaPorData(currentPatient.examesTabela, LISTA_EXAMES_OFICIAIS);
  const examesEnviadosOrdenados = [...(currentPatient.examesEnviados || [])].sort((a: any, b: any) => (a.dataUpload < b.dataUpload ? 1 : a.dataUpload > b.dataUpload ? -1 : 0));
  const ecografiasEnviadas = examesEnviadosOrdenados.filter((ex: any) => ex.tipo === 'Ecografia');
  const outrosDocumentosAnexados = examesEnviadosOrdenados.filter((ex: any) => ex.tipo !== 'Ecografia');

  const [showMoreSheet, setShowMoreSheet] = useState(false);

  // UX-04: alternância Gráfico/Tabela do GPG — só controla apresentação,
  // os dados são sempre currentPatient.consultasEvolucao.
  const [visualizacaoGPG, setVisualizacaoGPG] = useState<'grafico' | 'tabela'>('grafico');

  const [examesExpandidos, setExamesExpandidos] = useState<Set<string>>(new Set());
  const toggleExameExpandido = (id: string) => {
    setExamesExpandidos((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id); else novo.add(id);
      return novo;
    });
  };

  const handleSolicitarExclusao = () => {
    const confirmado = window.confirm(
      'Isso avisa sua médica que você quer remover seus dados do MaternaIA. ' +
      'Alguns dados de saúde precisam ser mantidos por um tempo por obrigação legal do prontuário médico, ' +
      'então a exclusão pode não ser imediata — sua médica vai analisar e entrar em contato. Confirmar solicitação?'
    );
    if (!confirmado) return;
    const updated: Patient = { ...currentPatient, solicitacaoExclusao: { em: new Date().toISOString(), atendida: false } };
    saveToFirestore(patients.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleMarcarExclusaoAtendida = () => {
    if (!currentPatient.solicitacaoExclusao) return;
    const updated: Patient = { ...currentPatient, solicitacaoExclusao: { ...currentPatient.solicitacaoExclusao, atendida: true } };
    saveToFirestore(patients.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleMarcarMarcoRealizado = (marcoId: string) => {
    const marcoPersonalizado = currentPatient.marcosPersonalizados?.find((m) => m.id === marcoId);
    const updated: Patient = marcoPersonalizado
      ? {
          ...currentPatient,
          marcosPersonalizados: currentPatient.marcosPersonalizados!.map((m) =>
            m.id === marcoId ? { ...m, concluidoEm: new Date().toISOString() } : m
          )
        }
      : {
          ...currentPatient,
          marcosTimeline: { ...currentPatient.marcosTimeline, [marcoId]: { concluidoEm: new Date().toISOString() } }
        };
    saveToFirestore(patients.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleAdicionarMarcoPersonalizado = (dados: Omit<MarcoPersonalizado, 'id'>) => {
    const novoMarco = criarMarcoPersonalizado(dados);
    const updated: Patient = {
      ...currentPatient,
      marcosPersonalizados: [...(currentPatient.marcosPersonalizados || []), novoMarco]
    };
    saveToFirestore(patients.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleRemoverMarcoPersonalizado = (marcoId: string) => {
    const updated: Patient = {
      ...currentPatient,
      marcosPersonalizados: (currentPatient.marcosPersonalizados || []).filter((m) => m.id !== marcoId)
    };
    saveToFirestore(patients.map((p) => (p.id === updated.id ? updated : p)));
  };

  // A assinatura da médica venceu/foi bloqueada: a paciente não tem culpa
  // disso, mas também não pode continuar acessando o prontuário — mostra um
  // aviso pra ela contactar a clínica em vez da carteirinha normal.
  if (doctorProfile && isDoctorBlocked(doctorProfile)) {
    const phone = cleanPhoneNumber(doctorProfile.telefone || '');
    return (
      <div className="max-w-md mx-auto px-4 pt-10 print:hidden">
        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Acesso temporariamente indisponível</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            O acesso à carteirinha digital de <strong>{doctorProfile.nome}</strong> está suspenso no momento.
            Fale diretamente com a clínica para regularizar e voltar a acessar seus dados.
          </p>
          {phone && (
            <a
              href={`https://wa.me/${phone}?text=${encodeURIComponent('Olá! Meu acesso à carteirinha digital do MaternaIA está bloqueado, poderiam me ajudar?')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--brand-primary)] text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Falar com a clínica no WhatsApp
            </a>
          )}
        </div>
      </div>
    );
  }

  const NAV_GROUPS = [
    {
      label: 'Visão Geral',
      items: [
        { id: 'resumo', label: 'Resumo', desc: 'Visão geral do seu acompanhamento', icon: LayoutDashboard, tint: 'bg-gray-100 text-gray-600', allowed: true },
        { id: 'linhaTempo', label: 'Linha do Tempo', desc: 'Marcos e etapas da sua gestação', icon: History, tint: 'bg-gray-100 text-gray-600', allowed: hasPermission(userRole, 'canViewClinicalHistory') },
      ]
    },
    {
      label: 'Agenda & Financeiro',
      items: [
        { id: 'agenda', label: 'Agenda & Lembretes', desc: 'Consultas marcadas e solicitações', icon: CalendarClock, tint: 'bg-gray-100 text-gray-600', allowed: hasPermission(userRole, 'canManageSchedule') },
        { id: 'financeiro', label: 'Financeiro & Convênio', desc: 'Pagamentos, convênio e histórico', icon: CreditCard, tint: 'bg-sky-50 text-sky-600', allowed: hasPermission(userRole, 'canManageFinancial') },
      ]
    },
    {
      label: 'Prontuário Clínico',
      items: [
        { id: 'dados', label: 'Dados Clínicos & GPCA', desc: 'Anamnese e histórico obstétrico', icon: ClipboardList, tint: 'bg-indigo-50 text-indigo-600', allowed: hasPermission(userRole, 'canViewClinicalHistory') },
        { id: 'consultas', label: 'Evolução / Atendimento', desc: 'Registrar e consultar os atendimentos realizados', icon: Activity, tint: 'bg-teal-50 text-teal-600', allowed: hasPermission(userRole, 'canViewClinicalHistory') },
        { id: 'vacinas', label: 'Vacinas', desc: 'Carteira de vacinação e pendências', icon: Syringe, tint: 'bg-rose-50 text-rose-600', allowed: hasPermission(userRole, 'canViewClinicalHistory') },
        { id: 'graficos', label: 'Gráfico GPG (MS)', desc: 'Curva de ganho de peso gestacional', icon: BarChart3, tint: 'bg-amber-50 text-amber-600', allowed: hasPermission(userRole, 'canViewClinicalHistory') },
      ]
    },
    {
      label: 'Exames',
      items: [
        { id: 'examesTabela', label: 'Exames Laboratoriais', desc: 'Resultados e histórico de exames', icon: FlaskConical, tint: 'bg-emerald-50 text-emerald-600', allowed: hasPermission(userRole, 'canViewExamReports') },
        { id: 'examesCentral', label: 'Central de Exames + IA', desc: 'Envie laudos e receba leitura com IA', icon: FolderOpen, tint: 'bg-violet-50 text-violet-600', allowed: hasPermission(userRole, 'canViewExamReports') },
      ]
    },
    {
      label: 'Ferramentas',
      items: [
        { id: 'calculadora', label: 'Calculadora Gestacional', desc: 'Idade gestacional e DPP', icon: Calculator, tint: 'bg-cyan-50 text-cyan-600', allowed: true },
        { id: 'chatIA', label: 'Assistente Pré-Natal (IA)', desc: 'Fale com a assistente virtual', icon: Bot, tint: 'bg-fuchsia-50 text-fuchsia-600', allowed: hasPermission(userRole, 'canUseMedicalAI') },
      ]
    },
  ];

  const allNavItems = NAV_GROUPS.flatMap((group) => group.items);

  // As 3 seções mais usadas ganham ícone fixo na barra inferior do celular
  // (Resumo/Linha do Tempo/Agenda); o resto mora atrás do "Mais".
  const PRIMARY_MOBILE_IDS = ['resumo', 'linhaTempo', 'agenda'];
  const primaryMobileTabs = PRIMARY_MOBILE_IDS
    .map((id) => allNavItems.find((item) => item.id === id))
    .filter((item): item is (typeof allNavItems)[number] => !!item && item.allowed);

  // Compartilhado entre a barra lateral fixa do desktop e a folha "Mais" do
  // celular — os dois são a mesma navegação, só muda o container em volta.
  // onSelect fecha a folha no celular; no desktop fica undefined (sempre visível).
  // excludeIds tira, na folha "Mais", os itens que já têm ícone próprio na
  // barra inferior (senão apareceriam duplicados).
  const renderNavGroups = (onSelect?: () => void, excludeIds: string[] = []) => (
    <>
      {NAV_GROUPS.map((group) => {
        const visibleItems = group.items.filter((item) => item.allowed && !excludeIds.includes(item.id));
        if (visibleItems.length === 0) return null;
        return (
          <div key={group.label}>
            <div className="px-3 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              {group.label}
            </div>
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    onSelect?.();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 lg:py-2 rounded-xl text-xs text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-bold'
                      : 'text-gray-600 font-semibold hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>
        );
      })}
    </>
  );

  return (
        <div className="max-w-5xl lg:max-w-7xl xl:max-w-[90rem] 2xl:max-w-[100rem] mx-auto px-4 pt-4 pb-20 lg:pb-0 space-y-6 lg:space-y-0 print:p-0 print:m-0 print:max-w-none">
        <div className="lg:flex lg:gap-6 xl:gap-8 lg:items-start">

          {/* BARRA LATERAL FIXA (DESKTOP) — mesmos grupos da navegação mobile, agrupados por área */}
          <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border border-gray-200 rounded-3xl shadow-sm p-3 print:hidden">
            {renderNavGroups()}

            {doctorProfile && (
              <div className="mt-auto pt-3 border-t border-gray-100 flex items-center gap-2.5 px-1">
                {doctorProfile.logoUrl ? (
                  <img src={doctorProfile.logoUrl} alt={doctorProfile.nome} className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <span className="w-9 h-9 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center text-xs font-bold shrink-0">
                    {doctorProfile.nome.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase()}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-gray-900 truncate">{doctorProfile.nome}</div>
                  <div className="text-[10px] text-gray-400 truncate">{doctorProfile.especialidade || 'Obstetra'}</div>
                </div>
              </div>
            )}
          </aside>

          {/* COLUNA DE CONTEÚDO */}
          <div className="flex-1 min-w-0 space-y-6">

          {/* Tira de identificação — só pra equipe (médica/secretária navegando entre pacientes);
              a própria gestante já sabe de quem é o prontuário que está vendo, não precisa repetir.
              Sem fundo colorido nem botões: as ações (Compartilhar/Imprimir/Meus Dados) moraram pro "Mais".
              UX-02: virou o componente PatientContextBar — mesma condição isStaff de sempre, só a
              apresentação interna mudou (hierarquia nome > IG > DPP > bebê/tipo sanguíneo). */}
          {isStaff && (
            <div className="print:hidden">
              <PatientContextBar
                patientName={currentPatient.nome}
                weeks={currentGest.weeks}
                days={currentGest.days}
                dueDate={currentPatient.dpp}
                babyName={currentPatient.nomeBebe}
                bloodType={currentPatient.tipoSanguineo}
              />
            </div>
          )}

                              {/* BARRA DE NAVEGAÇÃO INFERIOR (CELULAR) — Resumo/Linha do Tempo/Agenda sempre à mão, o resto das 12 seções mora atrás do "Mais"; no desktop a navegação é a barra lateral */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] print:hidden">
            <div
              className="grid"
              style={{ gridTemplateColumns: `repeat(${primaryMobileTabs.length + 1}, 1fr)` }}
            >
              {primaryMobileTabs.map((item) => {
                const Icon = item.icon;
                const isActive = !showMoreSheet && activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setShowMoreSheet(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-0.5 pt-2.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] cursor-pointer ${
                      isActive ? 'text-[var(--brand-primary)]' : 'text-gray-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[9px] font-bold leading-tight text-center px-0.5">{item.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowMoreSheet(true)}
                className={`flex flex-col items-center justify-center gap-0.5 pt-2.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] cursor-pointer ${
                  showMoreSheet ? 'text-[var(--brand-primary)]' : 'text-gray-400'
                }`}
              >
                <LayoutGrid className="w-5 h-5" />
                <span className="text-[9px] font-bold">Mais</span>
              </button>
            </div>
          </nav>

          {/* FOLHA "MAIS" (CELULAR) — lista única (sem cabeçalhos de grupo), ícone + título + descrição + chevron */}
          {showMoreSheet && (
            <div className="lg:hidden fixed inset-0 z-50 bg-white flex flex-col print:hidden animate-in fade-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
                <span className="font-serif font-bold text-lg text-gray-900">Mais</span>
                <button
                  type="button"
                  onClick={() => setShowMoreSheet(false)}
                  className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto p-4 flex-1 space-y-1">
                {/* AÇÕES — Compartilhar/Imprimir/Meus Dados moraram aqui, saíram do topo da home */}
                <button
                  type="button"
                  onClick={() => {
                    sharePatientCard(currentPatient);
                    setShowMoreSheet(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer text-left"
                >
                  <span className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Share2 className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-sm text-gray-900">Compartilhar</span>
                    <span className="block text-xs text-gray-500 truncate">Enviar carteirinha via WhatsApp ou redes</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                    setShowMoreSheet(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer text-left"
                >
                  <span className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Printer className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-sm text-gray-900">Imprimir A4</span>
                    <span className="block text-xs text-gray-500 truncate">Carteirinha impressa em folha A4</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadPatientData(currentPatient);
                    setShowMoreSheet(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer text-left"
                >
                  <span className="w-11 h-11 rounded-2xl bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-sm text-gray-900">Meus Dados</span>
                    <span className="block text-xs text-gray-500 truncate">Baixar uma cópia dos seus dados (LGPD)</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>

                <div className="pt-2" />

                {allNavItems
                  .filter((item) => item.allowed && !PRIMARY_MOBILE_IDS.includes(item.id))
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id);
                          setShowMoreSheet(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-all cursor-pointer text-left"
                      >
                        <span className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${item.tint}`}>
                          <Icon className="w-5 h-5" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-bold text-sm text-gray-900">{item.label}</span>
                          <span className="block text-xs text-gray-500 truncate">{item.desc}</span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                      </button>
                    );
                  })}

                <div className="mt-4 bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center">
                  <p className="text-xs font-semibold text-rose-800">Seus dados são seguros e confidenciais.</p>
                  <p className="text-xs text-rose-700 mt-0.5">Maternidade é nossa prioridade. ❤️</p>
                </div>
              </div>
            </div>
          )}


          {/* TAB 1: RESUMO — nova Home (Fase 2A): saudação, hero de IG, próxima consulta, indicadores e Dicas & Cuidados */}
          {activeTab === 'resumo' && (
            <PatientHome
              currentPatient={currentPatient}
              doctorProfile={doctorProfile}
              currentGest={currentGest}
              userRole={userRole}
              isStaff={isStaff}
              nextAppointment={nextAppointment}
              examAlerts={examAlerts}
              ultimaConsulta={ultimaConsulta}
              onViewAgenda={() => setActiveTab('agenda')}
              onRequestAppointment={() => setShowRequestAppointmentModal(true)}
              onAddAgenda={() => setShowAddAgendaModal(true)}
            />
          )}

          {/* TAB FINANCEIRO & CONVÊNIO */}
          {activeTab === 'financeiro' && hasPermission(userRole, 'canViewClinicalHistory') && (
            <PatientFinancialTab
              patient={currentPatient}
              canEdit={isStaff}
              onUpdatePatient={async (updatedPatient) => {
                const updatedList = patients.map(p => p.id === updatedPatient.id ? updatedPatient : p);
                await saveToFirestore(updatedList);
              }}
            />
          )}

          {/* TAB 2: DADOS CLÍNICOS */}
          {activeTab === 'dados' && hasPermission(userRole, 'canViewClinicalHistory') && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6 print:hidden">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Dados Cadastrais, Anamnese & GPCA</h3>
                  <p className="text-xs text-gray-500">Histórico obstétrico e informações pessoais da gestante</p>
                </div>
                {userRole === 'medica' && (
                  <button
                    onClick={() => {
                      setEditProfileData({
                        nome: currentPatient.nome || '',
                        cpf: currentPatient.cpf || '',
                        telefone: currentPatient.telefone || '',
                        idade: currentPatient.idade || '',
                        pai: currentPatient.pai || '',
                        nomeBebe: currentPatient.nomeBebe || '',
                        dum: currentPatient.dum || '',
                        pesoInicial: currentPatient.pesoInicial || '',
                        altura: currentPatient.altura || '',
                        tipoSanguineo: currentPatient.tipoSanguineo || 'A+',
                        doencasPrevias: currentPatient.doencasPrevias || '',
                        g: currentPatient.g || '1',
                        p: currentPatient.p || '0',
                        c: currentPatient.c || '0',
                        a: currentPatient.a || '0'
                      });
                      setShowEditProfileModal(true);
                    }}
                    className="bg-[var(--brand-primary)] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" /> Editar Perfil & Anamnese
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-gray-400 font-bold block uppercase text-[10px]">Nome & Contato</span>
                  <strong className="text-sm text-gray-900 mt-0.5 block">{currentPatient.nome}</strong>
                  <span className="text-gray-500 mt-1 block">CPF: {currentPatient.cpf}</span>
                  <span className="text-emerald-700 font-bold mt-0.5 block">📱 {currentPatient.telefone || 'Sem WhatsApp'}</span>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-gray-400 font-bold block uppercase text-[10px]">Idade & Altura</span>
                  <strong className="text-sm text-gray-900 mt-0.5 block">{currentPatient.idade} anos • {currentPatient.altura} m</strong>
                  <span className="text-gray-500 mt-1 block">Peso Inicial: {currentPatient.pesoInicial} kg</span>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-gray-400 font-bold block uppercase text-[10px]">Nome do Bebê</span>
                  <strong className="text-sm text-gray-900 mt-0.5 block">👶 {currentPatient.nomeBebe}</strong>
                  <span className="text-gray-500 mt-1 block">DPP: {formatDateBR(currentPatient.dpp)}</span>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-gray-400 font-bold block uppercase text-[10px]">Pai / Acompanhante</span>
                  <strong className="text-sm text-gray-900 mt-0.5 block">{currentPatient.pai || 'Não informado'}</strong>
                </div>

                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200">
                  <span className="text-emerald-800 font-bold block uppercase text-[10px]">Histórico Obstétrico (GPCA)</span>
                  <strong className="text-base text-emerald-950 mt-0.5 block">
                    G{currentPatient.g} P{currentPatient.p} C{currentPatient.c} A{currentPatient.a}
                  </strong>
                  <span className="text-[11px] text-emerald-800 mt-1 block">
                    G: Gestas • P: Partos • C: Cesáreas • A: Abortos
                  </span>
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-gray-400 font-bold block uppercase text-[10px]">Tipo Sanguíneo</span>
                  <strong className="text-base text-gray-900 mt-0.5 block">🩸 {currentPatient.tipoSanguineo}</strong>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
                <span className="text-gray-400 font-bold block uppercase text-[10px] mb-1">Doenças Prévias / Alergias</span>
                <p className="text-gray-800 text-sm font-medium whitespace-pre-line">{currentPatient.doencasPrevias || 'Nenhuma alteração registrada.'}</p>
              </div>

              {isStaff && <PatientAuditLog doctorId={currentPatient.doctorId} patientId={currentPatient.id} />}

              {/* PRIVACIDADE / LGPD */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs space-y-3">
                <span className="text-gray-500 font-bold block uppercase text-[10px] flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> Privacidade dos Dados (LGPD)
                </span>

                {currentPatient.solicitacaoExclusao && !currentPatient.solicitacaoExclusao.atendida ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-2">
                    <p>
                      {userRole === 'paciente'
                        ? `Sua solicitação de exclusão de dados foi enviada em ${new Date(currentPatient.solicitacaoExclusao.em).toLocaleDateString('pt-BR')}. A clínica vai analisar e entrar em contato.`
                        : `⚠️ Esta paciente solicitou a exclusão dos dados dela em ${new Date(currentPatient.solicitacaoExclusao.em).toLocaleDateString('pt-BR')}.`}
                    </p>
                    {isStaff && (
                      <button
                        onClick={handleMarcarExclusaoAtendida}
                        className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 font-bold rounded-lg text-[11px] cursor-pointer"
                      >
                        Marcar como atendida
                      </button>
                    )}
                  </div>
                ) : (
                  userRole === 'paciente' && (
                    <button
                      onClick={handleSolicitarExclusao}
                      className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl text-[11px] cursor-pointer hover:bg-gray-100"
                    >
                      Solicitar exclusão dos meus dados
                    </button>
                  )
                )}

                {isStaff && !currentPatient.solicitacaoExclusao && (
                  <p className="text-gray-400">Nenhuma solicitação de exclusão de dados até o momento.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB: LINHA DO TEMPO DA GESTAÇÃO */}
          {activeTab === 'linhaTempo' && hasPermission(userRole, 'canViewClinicalHistory') && (
            <GestationTimeline
              patient={currentPatient}
              semanaAtual={currentGest.weeks}
              isStaff={isStaff}
              onMarcarRealizado={handleMarcarMarcoRealizado}
              onIrParaAba={setActiveTab}
              onAdicionarPersonalizado={handleAdicionarMarcoPersonalizado}
              onRemoverPersonalizado={handleRemoverMarcoPersonalizado}
            />
          )}

          {/* TAB 3: VACINAS */}
          {activeTab === 'vacinas' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4 print:hidden">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Carteira de Vacinação da Gestante</h3>
                  <p className="text-xs text-gray-500">Esquema vacinal recomendado para a gestação</p>
                </div>
                {userRole === 'medica' && (
                  <button
                    onClick={() => {
                      setEditVacinasData(currentPatient.vacinas || {});
                      setShowEditVacinasModal(true);
                    }}
                    className="bg-[var(--brand-primary)] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Syringe className="w-4 h-4" /> Registrar / Editar Vacinas
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'influenza', nome: 'INFLUENZA (Gripe)', recom: 'Dose Anual recomendada' },
                  { key: 'vsr', nome: 'VSR (Vírus Sincicial Respiratório)', recom: 'A partir da 32ª semana' },
                  { key: 'dtpa', nome: 'dTpa (Coqueluche / Tétano)', recom: 'A partir da 20ª semana' },
                  { key: 'covid19', nome: 'COVID-19', recom: 'Dose de reforço' },
                ].map(v => {
                  const vac = (currentPatient.vacinas as any)?.[v.key] || {};
                  return (
                    <div key={v.key} className="p-4 bg-gray-50 rounded-2xl border flex justify-between items-center">
                      <div>
                        <strong className="text-sm font-bold text-gray-900 block">{v.nome}</strong>
                        <span className="text-[10px] text-gray-500 block">{v.recom}</span>
                        {vac.realizada ? (
                          <span className="text-xs font-bold text-emerald-800 mt-1 block">
                            Aplicada em: {formatDateBR(vac.data)} {vac.lote ? `(Lote: ${vac.lote})` : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-700 italic mt-1 block">Pendente</span>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold shrink-0 ${vac.realizada ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {vac.realizada ? 'OK / APLICADA' : 'PENDENTE'}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border space-y-2">
                <strong className="text-sm font-bold text-gray-900 block">HEPATITE B (Esquema 3 Doses)</strong>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-white border rounded-xl">
                    <span className="text-[10px] text-gray-400 font-bold block">1ª DOSE</span>
                    <strong>{formatDateBR((currentPatient.vacinas as any)?.hepatiteB?.d1) || '____/____/____'}</strong>
                  </div>
                  <div className="p-2 bg-white border rounded-xl">
                    <span className="text-[10px] text-gray-400 font-bold block">2ª DOSE</span>
                    <strong>{formatDateBR((currentPatient.vacinas as any)?.hepatiteB?.d2) || '____/____/____'}</strong>
                  </div>
                  <div className="p-2 bg-white border rounded-xl">
                    <span className="text-[10px] text-gray-400 font-bold block">3ª DOSE</span>
                    <strong>{formatDateBR((currentPatient.vacinas as any)?.hepatiteB?.d3) || '____/____/____'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB EXAMES */}
          {activeTab === 'examesTabela' && hasPermission(userRole, 'canViewExamReports') && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4 print:hidden">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Tabela de Exames Laboratoriais</h3>
                  <p className="text-xs text-gray-500">Resultados numéricos e sorologias do pré-natal</p>
                </div>
                {userRole === 'medica' && (
                  <button
                    onClick={() => {
                      setEditExamesData(currentPatient.examesTabela || {});
                      setShowEditExamesModal(true);
                    }}
                    className="bg-[var(--brand-primary)] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" /> Preencher / Editar Exames
                  </button>
                )}
              </div>

              <div className="border border-gray-100 rounded-2xl divide-y divide-gray-100 overflow-hidden">
                {LISTA_EXAMES_OFICIAIS.map(ex => {
                  const historico = currentPatient.examesTabela?.[ex.id] || [];
                  const [ultimo, ...anteriores] = historico;
                  const expandido = examesExpandidos.has(ex.id);
                  return (
                    <div key={ex.id} className="p-3 hover:bg-gray-50">
                      <div className="flex justify-between items-center gap-2">
                        <div className="min-w-0">
                          <strong className="text-xs text-gray-900 block">{ex.label}</strong>
                          {ultimo ? (
                            <span className="text-xs text-gray-700">
                              <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md mr-2">{formatDateDisplay(ultimo.data)}</span>
                              {ultimo.resultado}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300 italic">Pendente ({ex.placeholder})</span>
                          )}
                        </div>
                        {anteriores.length > 0 && (
                          <button
                            onClick={() => toggleExameExpandido(ex.id)}
                            className="text-[10px] font-bold text-gray-500 underline shrink-0 cursor-pointer"
                          >
                            {expandido ? 'Ocultar' : `Ver histórico (${anteriores.length})`}
                          </button>
                        )}
                      </div>
                      {expandido && anteriores.length > 0 && (
                        <div className="mt-2 pl-2.5 border-l-2 border-gray-200 space-y-1">
                          {anteriores.map((h, i) => (
                            <div key={i} className="text-[11px] text-gray-500">
                              <span className="font-semibold">{formatDateDisplay(h.data)}:</span> {h.resultado}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB AGENDA & LEMBRETES */}
          {activeTab === 'agenda' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6 print:hidden">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <CalendarPlus className="w-5 h-5 text-[var(--brand-primary)]" />
                    Agenda de Consultas & Lembretes
                  </h3>
                  <p className="text-xs text-gray-500">Próximos compromissos pré-natais da gestante</p>
                </div>

                <div className="flex items-center gap-2">
                  {userRole === 'paciente' && (
                    <button
                      onClick={() => setShowRequestAppointmentModal(true)}
                      className="bg-[var(--brand-primary)] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <CalendarPlus className="w-4 h-4" /> Solicitar Consulta
                    </button>
                  )}

                  {isStaff && (
                    <button
                      onClick={() => setShowAddAgendaModal(true)}
                      className="bg-[var(--brand-primary)] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Agendar Nova Consulta
                    </button>
                  )}
                </div>
              </div>

              {(!currentPatient.agendaConsultas || currentPatient.agendaConsultas.length === 0) ? (
                <div className="text-center py-10 text-gray-400 text-xs space-y-2">
                  <Calendar className="w-8 h-8 mx-auto text-gray-300" />
                  <p>Nenhuma consulta futura agendada na carteirinha digital.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...currentPatient.agendaConsultas].sort(compararAgendamentos).map((item) => (
                    <div key={item.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 relative">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="bg-[var(--brand-primary)] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                            {formatDateBR(item.data)} às {item.horario}
                          </span>

                          <AppointmentStatusBadge status={item.status} contexto="paciente" />
                        </div>

                        {isStaff && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSelectedAppointmentForConfirm({ app: item, pat: currentPatient })}
                              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              Gerenciar
                            </button>
                            <a
                              href={generateAppointmentReminderLink(currentPatient, item)}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" /> Zap
                            </a>
                          </div>
                        )}
                      </div>

                      <h4 className="font-bold text-gray-900 text-sm pt-1">{item.tipo}</h4>
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" /> {item.local}
                      </p>
                      {item.observacoes && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-2">
                          💡 <strong>Orientações:</strong> {item.observacoes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB GRÁFICO GPG */}
          {activeTab === 'graficos' && (() => {
            // UX-04: sem o fallback de 60kg que existia antes — sem um peso
            // pré-gestacional real, não dá pra calcular ganho nenhum (nem
            // pro gráfico, nem pra tabela), então mostramos isso explicitamente
            // em vez de desenhar uma curva baseada num número inventado.
            const pesoInicialNum = parseFloat(currentPatient.pesoInicial);
            const temPesoInicialValido = Number.isFinite(pesoInicialNum) && pesoInicialNum > 0;

            return (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5 print:hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[var(--brand-primary)] uppercase tracking-wide">
                    Gráfico de Ganho de Peso
                  </h3>
                  <p className="text-xs text-gray-500">Referência de ganho de peso gestacional da Caderneta da Gestante</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center bg-gray-100 rounded-xl p-1 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setVisualizacaoGPG('grafico')}
                      aria-pressed={visualizacaoGPG === 'grafico'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${visualizacaoGPG === 'grafico' ? 'bg-white shadow-xs text-[var(--brand-primary)]' : 'text-gray-500'}`}
                    >
                      <LineChart className="w-3.5 h-3.5" /> Gráfico
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisualizacaoGPG('tabela')}
                      aria-pressed={visualizacaoGPG === 'tabela'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${visualizacaoGPG === 'tabela' ? 'bg-white shadow-xs text-[var(--brand-primary)]' : 'text-gray-500'}`}
                    >
                      <Table2 className="w-3.5 h-3.5" /> Tabela
                    </button>
                  </div>
                  {userRole === 'medica' && (
                    <button onClick={onAbrirNovaEvolucao} className="bg-[var(--brand-primary)] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer whitespace-nowrap">
                      + Registrar Atendimento
                    </button>
                  )}
                </div>
              </div>

              {/* Categoria/referência — substitui o antigo badge baseado no IOM
                  (UX-04). Sem peso e altura pré-gestacionais válidos, nunca
                  inventa uma faixa: mostra que a referência está indisponível. */}
              {referenciaGPG.faixa ? (
                <div className="flex flex-col items-center justify-center gap-1 py-2">
                  <div className={`px-6 py-2 text-white font-bold text-sm rounded-full shadow-sm text-center ${referenciaGPG.faixa.corBadge}`}>
                    {referenciaGPG.faixa.label} · IMC inicial {referenciaGPG.imcInicial!.toFixed(1)}
                  </div>
                  <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">
                    Ganho recomendado: {referenciaGPG.faixa.ganhoTotal.min}–{referenciaGPG.faixa.ganhoTotal.max} kg até 40 semanas
                  </span>
                  {/* UX-04.2: a nota "curvas digitalizadas... vale conferir" (provisória
                      desde a UX-04.1) saiu da interface depois da validação final das
                      4 curvas contra as imagens — a ressalva de que é uma digitalização
                      manual, não os dados originais em número, continua documentada em
                      src/data/gpgCurvas.ts. */}
                </div>
              ) : (
                <div className="flex items-center justify-center py-2">
                  <span className="text-xs text-gray-400 italic text-center max-w-md">
                    Referência de ganho de peso indisponível — falta peso e/ou altura pré-gestacionais cadastrados.
                  </span>
                </div>
              )}

              {visualizacaoGPG === 'grafico' ? (
                temPesoInicialValido ? (
                  <div className="space-y-1.5">
                    {/* UX-04.1: a grade semanal inteira não cabe em 375px sem rolar —
                        indicação discreta de que há mais conteúdo, fora do container
                        que rola (senão ela mesma ficaria "escondida" fora da tela). */}
                    <p className="md:hidden flex items-center justify-center gap-1 text-[10px] text-gray-400">
                      Deslize para ver todas as semanas <ChevronRight className="w-3 h-3" />
                    </p>
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 overflow-x-auto">
                    <svg viewBox="0 0 720 400" className="w-full min-w-[650px] font-sans" role="img" aria-label="Gráfico de ganho de peso ao longo da gestação">
                      <rect x="50" y="40" width="620" height="300" fill="#FAFAFA" stroke="#CBD5E1" strokeWidth="1.5" />
                      {Array.from({ length: 30 }, (_, i) => i - 4).map((kg) => {
                        if (kg % 2 !== 0 && kg !== 25) return null;
                        const y = 340 - ((kg + 4) / 29) * 300;
                        return (
                          <g key={kg}>
                            <line x1="50" y1={y} x2="670" y2={y} stroke={kg === 0 ? "#64748B" : "#E2E8F0"} strokeWidth={kg === 0 ? "1.5" : "1"} />
                            <text x="42" y={y + 3} fontSize="9" fontWeight="bold" fill="#475569" textAnchor="end">{kg}</text>
                            <text x="678" y={y + 3} fontSize="9" fontWeight="bold" fill="#475569" textAnchor="start">{kg}</text>
                          </g>
                        );
                      })}
                      {Array.from({ length: 31 }, (_, i) => i + 10).map((sem) => {
                        const x = 50 + ((sem - 10) / 30) * 620;
                        const isDivisoria = sem === 13 || sem === 27;
                        return (
                          <g key={sem}>
                            <line x1={x} y1="40" x2={x} y2="340" stroke={isDivisoria ? "#E11D48" : "#F1F5F9"} strokeWidth={isDivisoria ? "2" : "1"} />
                            <text x={x} y="34" fontSize="9" fontWeight={isDivisoria ? "bold" : "medium"} fill={isDivisoria ? "#E11D48" : "#64748B"} textAnchor="middle">{sem}</text>
                            <text x={x} y="352" fontSize="9" fontWeight={isDivisoria ? "bold" : "medium"} fill={isDivisoria ? "#E11D48" : "#64748B"} textAnchor="middle">{sem}</text>
                          </g>
                        );
                      })}
                      {/* Faixas/curvas de referência (UX-04) — desenhadas ANTES da linha
                          da paciente, pra ela continuar sendo o elemento de maior
                          contraste (seção 4/6 da fase). Semitransparentes, cor de
                          categoria (nunca a cor de marca nem a semântica de status
                          clínico já usada em outro lugar do app). */}
                      {referenciaGPG.faixa && (() => {
                        const faixa = referenciaGPG.faixa;
                        const toXY = (semana: number, kg: number) => ({
                          x: 50 + ((semana - 10) / 30) * 620,
                          y: 340 - ((kg + 4) / 29) * 300
                        });
                        const curvasPontos = faixa.percentis.map((p) =>
                          gerarPontosCurva(CURVAS_GPG[faixa.categoria][p], 10, 40).map((pt) => toXY(pt.semana, pt.kg))
                        );
                        const inferior = curvasPontos[0];
                        const superior = curvasPontos[curvasPontos.length - 1];
                        const areaPath = [
                          ...superior.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x},${pt.y}`),
                          ...[...inferior].reverse().map((pt) => `L${pt.x},${pt.y}`),
                          'Z'
                        ].join(' ');

                        // UX-04.1 seção 6: os rótulos de percentil (P10, P18...) partem
                        // da posição real da curva em semana 40, mas quando duas curvas
                        // terminam perto uma da outra os rótulos se sobrepunham (achado
                        // real nos prints). Declutter simples: ordena por y e garante uma
                        // distância mínima entre rótulos vizinhos, empurrando pra baixo
                        // quando precisa — nunca muda os dados, só onde o texto aparece.
                        const ESPACAMENTO_MINIMO_LABEL = 9;
                        const labelsOrdenados = faixa.percentis
                          .map((p, idx) => ({ texto: p, x: curvasPontos[idx][curvasPontos[idx].length - 1].x, y: curvasPontos[idx][curvasPontos[idx].length - 1].y }))
                          .sort((a, b) => a.y - b.y);
                        for (let i = 1; i < labelsOrdenados.length; i++) {
                          const minY = labelsOrdenados[i - 1].y + ESPACAMENTO_MINIMO_LABEL;
                          if (labelsOrdenados[i].y < minY) labelsOrdenados[i].y = minY;
                        }
                        const labelPorTexto = Object.fromEntries(labelsOrdenados.map((l) => [l.texto, l]));

                        return (
                          <g>
                            <path d={areaPath} fill={faixa.corHex} fillOpacity="0.08" stroke="none" />
                            {faixa.percentis.map((p, idx) => {
                              const pontos = curvasPontos[idx];
                              const pontoReal = pontos[pontos.length - 1];
                              const label = labelPorTexto[p];
                              const éExtremo = idx === 0 || idx === faixa.percentis.length - 1;
                              return (
                                <g key={p}>
                                  <polyline
                                    fill="none"
                                    stroke={faixa.corHex}
                                    strokeOpacity="0.55"
                                    strokeWidth={p === 'P50' ? '1.75' : '1.1'}
                                    strokeDasharray={éExtremo ? '4 3' : undefined}
                                    points={pontos.map((pt) => `${pt.x},${pt.y}`).join(' ')}
                                  />
                                  {/* linha-guia curta só quando o rótulo foi deslocado pelo declutter */}
                                  {Math.abs(label.y - pontoReal.y) > 1 && (
                                    <line x1={pontoReal.x + 1} y1={pontoReal.y} x2={label.x + 2} y2={label.y} stroke={faixa.corHex} strokeOpacity="0.4" strokeWidth="0.75" />
                                  )}
                                  <text x={label.x + 4} y={label.y + 3} fontSize="8" fontWeight="bold" fill={faixa.corHex}>{p}</text>
                                </g>
                              );
                            })}
                          </g>
                        );
                      })()}
                      {/* Linha vertical da semana atual (UX-04.1 seção 9) — cor forte e
                          distinta tanto das divisórias de trimestre (vermelho) quanto da
                          cor de categoria, pra funcionar como um "você está aqui" claro. */}
                      {currentGest.weeks >= 10 && currentGest.weeks <= 40 && (() => {
                        const x = 50 + ((currentGest.weeks - 10) / 30) * 620;
                        return (
                          <g>
                            <line x1={x} y1="40" x2={x} y2="340" stroke="#0F172A" strokeWidth="2" strokeDasharray="2 2" />
                            <text x={x} y="14" fontSize="9" fontWeight="bold" fill="#0F172A" textAnchor="middle">Hoje</text>
                          </g>
                        );
                      })()}
                      {(() => {
                        const realPoints = currentPatient.consultasEvolucao
                          .filter(c => c.igSem >= 10 && c.igSem <= 40)
                          .map(c => ({
                            x: 50 + ((c.igSem - 10) / 30) * 620,
                            y: 340 - (((c.peso - pesoInicialNum) + 4) / 29) * 300,
                            ganho: (c.peso - pesoInicialNum).toFixed(1),
                            ...c
                          }));
                        return (
                          <g>
                            {realPoints.length > 1 && (
                              <polyline fill="none" stroke="var(--brand-primary)" strokeWidth="3.5" points={realPoints.map(p => `${p.x},${p.y}`).join(" ")} />
                            )}
                            {realPoints.map(p => (
                              <circle key={p.id} cx={p.x} cy={p.y} r="5" fill="var(--brand-gold)" stroke="var(--brand-primary)" strokeWidth="2" />
                            ))}
                          </g>
                        );
                      })()}
                    </svg>
                    <p className="text-[10px] text-gray-400 text-center mt-1.5">
                      Eixo horizontal: semanas gestacionais · Eixo vertical: ganho de peso (kg) em relação ao peso pré-gestacional
                    </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-6 text-center text-xs text-gray-500">
                    Sem peso pré-gestacional cadastrado — não é possível calcular o ganho de peso. Preencha em "Editar Dados" pra habilitar o gráfico.
                  </div>
                )
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-2.5">Data</th>
                        <th className="p-2.5">IG</th>
                        <th className="p-2.5">Peso</th>
                        <th className="p-2.5">Ganho acumulado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {construirTabelaGPG(currentPatient.consultasEvolucao, currentPatient.pesoInicial).map((linha) => (
                        <tr key={linha.id} className="border-b">
                          <td className="p-2.5 font-bold">{formatDateBR(linha.data)}</td>
                          <td className="p-2.5">{linha.igSem} sem</td>
                          <td className="p-2.5">{linha.peso}kg</td>
                          <td className="p-2.5">{linha.ganho !== null ? `${linha.ganho > 0 ? '+' : ''}${linha.ganho}kg` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {currentPatient.consultasEvolucao.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">Nenhuma pesagem registrada ainda.</p>
                  )}
                </div>
              )}
            </div>
            );
          })()}

          {/* TAB CALCULADORA */}
          {activeTab === 'calculadora' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6 print:hidden">
              <div className="border-b pb-3">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-[var(--brand-primary)]" />
                  Calculadora Gestacional Obstétrica
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form onSubmit={handleCalculateUsg} className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-200">
                  <h4 className="text-xs font-bold uppercase text-[var(--brand-primary)]">Cálculo por Ecografia (USG)</h4>
                  <input type="date" value={calcUsgData} onChange={(e) => setCalcUsgData(e.target.value)} className="w-full text-xs p-2.5 border rounded-xl bg-white" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Semanas" value={calcUsgSemanas} onChange={(e) => setCalcUsgSemanas(e.target.value)} className="w-full text-xs p-2.5 border rounded-xl bg-white" />
                    <input type="number" placeholder="Dias" min="0" max="6" value={calcUsgDias} onChange={(e) => setCalcUsgDias(e.target.value)} className="w-full text-xs p-2.5 border rounded-xl bg-white" />
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-[var(--brand-primary)] text-white rounded-xl text-xs font-bold cursor-pointer">Calcular DPP</button>
                </form>
                {calcResultado && (
                  <div className="space-y-3 bg-[var(--brand-primary)]/5 p-5 rounded-2xl border">
                    <div className="bg-white p-3 rounded-xl border"><span className="text-[10px] text-gray-400 font-bold block">IG HOJE</span><strong>{calcResultado.igHoje}</strong></div>
                    <div className="bg-white p-3 rounded-xl border"><span className="text-[10px] text-gray-400 font-bold block">DPP CALCULADA</span><strong>{calcResultado.dpp}</strong></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB ASSISTENTE PRÉ-NATAL IA */}
          {activeTab === 'chatIA' && hasPermission(userRole, 'canUseMedicalAI') && (
            <PrenatalChatTab
              currentPatient={currentPatient}
              gestationalWeeks={currentGest.weeks}
            />
          )}

          {/* TAB CONSULTAS */}
          {activeTab === 'consultas' && hasPermission(userRole, 'canViewClinicalHistory') && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4 print:hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 gap-3">
                <h3 className="font-bold text-gray-900 text-base">Evolução / Atendimento</h3>
                {userRole === 'medica' && (
                  <button onClick={onAbrirNovaEvolucao} className="bg-[var(--brand-primary)] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Registrar Atendimento
                  </button>
                )}
              </div>
              {/* Desktop (md+): mesma tabela densa de sempre, intocada — UX-01
                  seção 12 já validou que ela funciona bem nesse tamanho de tela. */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-2.5">Data</th>
                      <th className="p-2.5">IG</th>
                      <th className="p-2.5">Peso</th>
                      <th className="p-2.5">PA</th>
                      {/* AU, BCF/MF e Edema cabem numa coluna só, empilhados — em vez
                          de 3 colunas largas, que já sofriam com scroll horizontal
                          no celular (feedback direto da Dra. Priscila). */}
                      <th className="p-2.5">Exame Físico</th>
                      <th className="p-2.5">Conduta</th>
                      {userRole === 'medica' && <th className="p-2.5 text-center">Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {currentPatient.consultasEvolucao.map(c => (
                      <tr key={c.id} className="border-b">
                        <td className="p-2.5 font-bold">{c.data}</td>
                        <td className="p-2.5">{c.igSem} Sem</td>
                        <td className="p-2.5">{c.peso}kg</td>
                        <td className="p-2.5">{c.pa}</td>
                        <td className="p-2.5 text-[11px] leading-relaxed whitespace-nowrap">
                          <div>AU: {c.au || '—'}</div>
                          <div>BCF/MF: {c.bcfMf || '—'}</div>
                          <div className="text-gray-500">Edema: {c.edema || '—'}</div>
                        </td>
                        <td className="p-2.5 text-gray-600">{c.conduta}</td>
                        {userRole === 'medica' && (
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onEditarEvolucao(c)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold cursor-pointer"
                                title="Editar este registro"
                              >
                                <Edit3 className="w-3 h-3" /> Editar
                              </button>
                              <a
                                href={generateConsultationSummaryLink(currentPatient, c)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold"
                                title="Enviar resumo desta consulta para o WhatsApp da gestante"
                              >
                                <Send className="w-3 h-3" /> Zap
                              </a>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile (< md): cards expansíveis — UX-03. Mesmos dados da tabela
                  acima, só a apresentação muda; a solicitação vinculada é
                  procurada aqui (dado já carregado no paciente, sem nova consulta
                  ao Firestore) e passada pronta pro card. */}
              <div className="md:hidden space-y-2">
                {currentPatient.consultasEvolucao.map(c => {
                  const solicitacaoVinculada = encontrarSolicitacaoDoAtendimento(currentPatient.solicitacoes, c.id);
                  return (
                    <ConsultaEvolucaoCard
                      key={c.id}
                      consulta={c}
                      solicitacao={solicitacaoVinculada}
                      onEditar={userRole === 'medica' ? () => onEditarEvolucao(c) : undefined}
                      whatsappHref={userRole === 'medica' ? generateConsultationSummaryLink(currentPatient, c) : undefined}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB CENTRAL DE EXAMES */}
          {activeTab === 'examesCentral' && hasPermission(userRole, 'canViewExamReports') && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4 print:hidden">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    Central de Laudos e Ecografias
                    {/* UX-05: badge da IA discreto — a função principal é o exame,
                        não o Gemini (seção 6 da fase). */}
                    <span className="text-[10px] text-pink-500 font-medium flex items-center gap-1">
                      ✨ IA Gemini
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">Envie laudos: o Gemini extrai os dados e resume tudo para a mãe</p>
                </div>
                {/* Ação principal ("+ Anexar Exame", preenchida) vs. secundária
                    ("Nova Solicitação", contorno) — já era essa a distinção, só
                    confirmada/preservada nesta fase (seção 2). */}
                <div className="flex flex-wrap gap-2">
                  {userRole === 'medica' && (
                    <button onClick={onAbrirNovaSolicitacao} className="bg-white border border-[var(--brand-primary)] text-[var(--brand-primary)] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                      <ClipboardList className="w-4 h-4" /> Nova Solicitação
                    </button>
                  )}
                  <button onClick={() => setShowUploadExamModal(true)} className="bg-[var(--brand-primary)] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-4 h-4" /> + Anexar Exame
                  </button>
                </div>
              </div>

              {/* D2.2/D2.3: prescrições e solicitações — são PEDIDOS, não
                  resultado. Ficam separadas das seções de exame realizado
                  abaixo, pra nunca dar a entender que foram feitos. Ícone +
                  estilo neutro (nunca verde de "concluído") reforçam "isto foi
                  pedido", não "isto é resultado" (seção 3 da UX-05). */}
              {(currentPatient.solicitacoes || []).length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase">Solicitações (ainda não é resultado)</h4>
                  {[...(currentPatient.solicitacoes || [])].reverse().map((s) => (
                    <div key={s.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-bold text-gray-800 flex items-center gap-1.5">
                          <ClipboardList className="w-3.5 h-3.5 text-gray-400" /> {formatDateBR(s.data)}
                        </span>
                        {s.consultaEvolucaoId && <span className="text-[10px] text-gray-400 shrink-0">Vinculada a um atendimento</span>}
                      </div>
                      {s.prescricoes.length > 0 && (
                        <p className="text-gray-600"><span className="font-bold">Medicamentos:</span> {s.prescricoes.map((p) => p.medicamento).join(', ')}</p>
                      )}
                      {s.exames.length > 0 && (
                        <p className="text-gray-600"><span className="font-bold">Exames:</span> {s.exames.map((ex) => ex.nome).join(', ')}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Nenhuma solicitação realizada.</p>
              )}

              {/* D2.3: laboratórios organizados por data, a partir da MESMA
                  Tabela de Exames da aba "Exames Laboratoriais" (nenhum dado
                  novo, só reorganizado por data em vez de por exame). */}
              {gruposExamesLaboratoriais.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase">Exames Laboratoriais</h4>
                  {gruposExamesLaboratoriais.map((grupo) => (
                    <div key={grupo.data} className="border border-gray-100 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-3 py-1.5 text-[11px] font-bold text-gray-600 border-b border-gray-100">{formatarDataAgrupador(grupo.data)}</div>
                      <div className="divide-y divide-gray-100">
                        {grupo.itens.map((item) => (
                          <div key={item.exameId} className="flex justify-between items-center gap-2 px-3 py-2 text-xs">
                            <span className="text-gray-500">{item.label}</span>
                            <span className="font-bold text-gray-800 text-right">{item.resultado || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Nenhum laboratório encontrado.</p>
              )}

              {/* D2.3: ecografias/imagem organizadas por data — mesmo dado de
                  sempre (examesEnviados), só filtrado por tipo e com uma
                  data de cabeçalho quando muda de dia. Laudo e análise
                  Gemini continuam exatamente como já funcionavam, agora no
                  card expansível DocumentoExameCard (UX-05). */}
              {ecografiasEnviadas.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase">Ecografias</h4>
                  {ecografiasEnviadas.map((ex, i) => (
                    <React.Fragment key={ex.id}>
                      {(i === 0 || ex.dataUpload !== ecografiasEnviadas[i - 1].dataUpload) && (
                        <div className="text-[11px] font-bold text-gray-600 pt-1">{formatarDataAgrupador(ex.dataUpload)}</div>
                      )}
                      <DocumentoExameCard exame={ex} />
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Nenhuma ecografia anexada.</p>
              )}

              {outrosDocumentosAnexados.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase">Outros Documentos Anexados</h4>
                  {outrosDocumentosAnexados.map((ex) => <DocumentoExameCard key={ex.id} exame={ex} />)}
                </div>
              )}
            </div>
          )}

          </div>

        </div>
        </div>
  );
};
