import React, { useState } from 'react';
import {
  Upload, Plus, Printer, Syringe, Calculator, AlertCircle,
  Edit3, Bot, MapPin, CalendarPlus, Calendar, Share2, Send, Download, ShieldAlert,
  Activity, FlaskConical, CalendarClock,
  LayoutDashboard, History, CreditCard, ClipboardList, BarChart3, FolderOpen, LayoutGrid, X,
  ChevronRight
} from 'lucide-react';
import type { Patient, AgendaConsulta, MarcoPersonalizado, UserRole } from '../types/prenatal';
import type { DoctorTenant } from '../types/saas';
import { PatientHome } from './PatientHome';
import { PatientFinancialTab } from './PatientFinancialTab';
import { PrenatalChatTab } from './PrenatalChatTab';
import { PatientAuditLog } from './PatientAuditLog';
import { GestationTimeline } from './GestationTimeline';
import { criarMarcoPersonalizado } from '../utils/gestationTimeline';
import { formatDateDisplay, formatDateBR } from '../utils/formatters';
import { generateAppointmentReminderLink, generateConsultationSummaryLink, sharePatientCard, cleanPhoneNumber } from '../utils/whatsapp';
import { downloadPatientData } from '../utils/dataExport';
import { hasPermission } from '../utils/rbac';
import { isDoctorBlocked } from '../utils/subscription';
import { LISTA_EXAMES_OFICIAIS } from '../constants/examesList';

interface PatientAppScreenProps {
  currentPatient: Patient;
  doctorProfile?: DoctorTenant;
  currentGest: { weeks: number; days: number };
  userRole: UserRole | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  nextAppointment: AgendaConsulta | null;
  examAlerts: { titulo: string; desc: string }[];
  bmiInfo: { cat: string; recom: string; bg: string };
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
  setShowAddConsultaModal: (v: boolean) => void;
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
  bmiInfo,
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
  setShowAddConsultaModal,
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

  const [showMoreSheet, setShowMoreSheet] = useState(false);

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
        { id: 'consultas', label: 'Evolução Clínica', desc: 'Registro das consultas realizadas', icon: Activity, tint: 'bg-teal-50 text-teal-600', allowed: hasPermission(userRole, 'canViewClinicalHistory') },
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
        <div className="max-w-5xl lg:max-w-7xl mx-auto px-4 pt-4 pb-20 lg:pb-0 space-y-6 lg:space-y-0 print:p-0 print:m-0 print:max-w-none">
        <div className="lg:flex lg:gap-6 lg:items-start">

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
              Sem fundo colorido nem botões: as ações (Compartilhar/Imprimir/Meus Dados) moraram pro "Mais". */}
          {isStaff && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 px-1 print:hidden">
              <span className="font-bold text-gray-800">{currentPatient.nome}</span>
              <span className="text-gray-300">•</span>
              <span>Bebê: {currentPatient.nomeBebe}</span>
              <span className="text-gray-300">•</span>
              <span>{currentGest.weeks} semanas • DPP {new Date(currentPatient.dpp).toLocaleDateString('pt-BR')}</span>
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
                  {currentPatient.agendaConsultas.map((item) => (
                    <div key={item.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 relative">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="bg-[var(--brand-primary)] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                            {formatDateBR(item.data)} às {item.horario}
                          </span>

                          {item.status === 'solicitada' && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              ⏳ Aguardando Confirmação
                            </span>
                          )}
                          {item.status === 'encaixe_urgente' && (
                            <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              🚨 Encaixe Prioritário
                            </span>
                          )}
                          {item.status === 'confirmada' && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              ✅ Confirmada
                            </span>
                          )}
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
          {activeTab === 'graficos' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5 print:hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[var(--brand-primary)] uppercase tracking-wide">
                    Gráfico de Ganho de Peso
                  </h3>
                  <p className="text-xs text-gray-500">Padrão da Caderneta de Saúde da Gestante (MS / Atalah)</p>
                </div>
                {userRole === 'medica' && (
                  <button onClick={() => setShowAddConsultaModal(true)} className="bg-[var(--brand-primary)] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer">
                    + Registrar Peso na Consulta
                  </button>
                )}
              </div>

              <div className="flex flex-col items-center justify-center space-y-1 py-2">
                <div className={`px-6 py-2 text-white font-bold text-sm rounded-full shadow-sm text-center ${bmiInfo.bg}`}>
                  {bmiInfo.cat}
                </div>
                <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">
                  {bmiInfo.recom}
                </span>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-200 overflow-x-auto">
                <svg viewBox="0 0 720 400" className="w-full min-w-[650px] font-sans">
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
                  {(() => {
                    const realPoints = currentPatient.consultasEvolucao
                      .filter(c => c.igSem >= 10 && c.igSem <= 40)
                      .map(c => ({
                        x: 50 + ((c.igSem - 10) / 30) * 620,
                        y: 340 - (((c.peso - (parseFloat(currentPatient.pesoInicial) || 60)) + 4) / 29) * 300,
                        ganho: (c.peso - (parseFloat(currentPatient.pesoInicial) || 60)).toFixed(1),
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
              </div>
            </div>
          )}

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
              <h3 className="font-bold text-gray-900 text-base border-b pb-3">Evolução das Consultas</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-2.5">Data</th>
                      <th className="p-2.5">IG</th>
                      <th className="p-2.5">Peso</th>
                      <th className="p-2.5">PA</th>
                      <th className="p-2.5">AU</th>
                      <th className="p-2.5">BCF/MF</th>
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
                        <td className="p-2.5">{c.au}</td>
                        <td className="p-2.5">{c.bcfMf}</td>
                        <td className="p-2.5 text-gray-600">{c.conduta}</td>
                        {userRole === 'medica' && (
                          <td className="p-2.5 text-center">
                            <a
                              href={generateConsultationSummaryLink(currentPatient, c)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold"
                              title="Enviar resumo desta consulta para o WhatsApp da gestante"
                            >
                              <Send className="w-3 h-3" /> Zap
                            </a>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                    <span className="bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                      <Bot className="w-3 h-3 text-pink-600" /> Leitura Gemini IA Ativa
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">Envie laudos: o Gemini extrai os dados e resume tudo para a mãe</p>
                </div>
                <button onClick={() => setShowUploadExamModal(true)} className="bg-[var(--brand-primary)] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-4 h-4" /> + Anexar Exame
                </button>
              </div>
              <div className="space-y-4">
                {currentPatient.examesEnviados?.map((ex: any) => (
                  <div key={ex.id} className="p-5 bg-gray-50 rounded-2xl border space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="text-sm font-bold text-gray-900 block">{ex.nome}</strong>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">{ex.tipo} • {ex.dataUpload}</span>
                      </div>
                    </div>
                                        {/* PREVIEW: IMAGEM OU PDF */}
                    {ex.fileData && (
                      ex.fileData.startsWith('data:application/pdf') ? (
                        <div className="flex items-center justify-between p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">📄</span>
                            <div>
                              <strong className="text-rose-900 block font-bold">Documento Laudo em PDF</strong>
                              <span className="text-[10px] text-rose-700">Arquivo processado pelo Gemini IA</span>
                            </div>
                          </div>
                          <a
                            href={ex.fileData}
                            download={`${ex.nome || 'laudo'}.pdf`}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[10px] transition-all cursor-pointer"
                          >
                            Baixar PDF
                          </a>
                        </div>
                      ) : (
                        <img
                          src={ex.fileData}
                          alt={ex.nome}
                          className="max-h-68 rounded-xl object-contain border bg-black/5 p-1"
                        />
                      )
                    )}

                    <div className="bg-pink-50/80 p-3.5 rounded-xl text-xs text-gray-800 whitespace-pre-line border border-pink-200">{ex.resumoIA}</div>
                    <div className="bg-emerald-50/80 p-3.5 rounded-xl text-xs text-gray-900 whitespace-pre-line border border-emerald-200">{ex.notaDra}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          </div>

        </div>
        </div>
  );
};
