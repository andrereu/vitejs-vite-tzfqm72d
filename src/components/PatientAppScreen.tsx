import React from 'react';
import {
  Upload, Plus, Printer, Syringe, Calculator, AlertCircle,
  Edit3, Bot, MapPin, CalendarPlus, Calendar, Share2, Send
} from 'lucide-react';
import type { Patient, AgendaConsulta, UserRole } from '../types/prenatal';
import { Tooltip } from './Tooltip';
import { AdBanner } from './AdBanner';
import { PatientFinancialTab } from './PatientFinancialTab';
import { PrenatalChatTab } from './PrenatalChatTab';
import { formatDateDisplay, formatDateBR } from '../utils/formatters';
import { generateAppointmentReminderLink, generateConsultationSummaryLink, sharePatientCard } from '../utils/whatsapp';
import { hasPermission } from '../utils/rbac';
import { LISTA_EXAMES_OFICIAIS } from '../constants/examesList';

interface PatientAppScreenProps {
  currentPatient: Patient;
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

  return (
        <div className="max-w-5xl mx-auto px-4 pt-4 space-y-6 print:p-0 print:m-0 print:max-w-none">
          <div className="bg-[#2E482A] text-white p-6 rounded-3xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
            <div>
              <span className="text-[10px] text-[#A3B18A] uppercase font-bold">Carteirinha Pré-Natal Digital</span>
              <h2 className="text-2xl font-bold text-white mt-0.5">{currentPatient.nome}</h2>
              <p className="text-xs text-gray-200 mt-1">
                Bebê: <strong>{currentPatient.nomeBebe}</strong> •
                <span className="inline-flex items-center ml-1">
                  DPP: <strong>{new Date(currentPatient.dpp).toLocaleDateString('pt-BR')}</strong>
                  <Tooltip title="DPP" text="Data Provável do Parto calculada pela regra obstétrica (40 semanas)." />
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => sharePatientCard(currentPatient)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Compartilhar carteirinha via WhatsApp ou redes"
              >
                <Share2 className="w-4 h-4" /> Compartilhar
              </button>

              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-[#D4AF37] text-gray-900 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-amber-400 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Imprimir A4
              </button>

              <div className="bg-white/10 px-3 py-1.5 rounded-2xl flex items-center gap-2">
                <span className="text-2xl">👶</span>
                <div>
                  <div className="text-base font-bold leading-none">
                    {currentGest.weeks} <span className="text-[10px] font-normal">sem</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

                              {/* LISTA DE ABAS COM RESTRIÇÃO RBAC */}
          <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200 flex overflow-x-auto gap-1 print:hidden">
            {[
              { id: 'resumo', label: 'Resumo', allowed: true },
              { id: 'agenda', label: '📅 Agenda & Lembretes', allowed: hasPermission(userRole, 'canManageSchedule') },
              { id: 'financeiro', label: '💳 Financeiro & Convênio', allowed: hasPermission(userRole, 'canManageFinancial') },
              { id: 'dados', label: 'Dados Clínicos & GPCA', allowed: hasPermission(userRole, 'canViewClinicalHistory') },
              { id: 'vacinas', label: 'Vacinas', allowed: hasPermission(userRole, 'canViewClinicalHistory') },
              { id: 'examesTabela', label: 'Exames Laboratoriais', allowed: hasPermission(userRole, 'canViewExamReports') },
              { id: 'graficos', label: 'Gráfico GPG (MS)', allowed: hasPermission(userRole, 'canViewClinicalHistory') },
              { id: 'calculadora', label: 'Calculadora Gestacional', allowed: true },
              { id: 'chatIA', label: '💬 Assistente Pré-Natal (IA)', allowed: hasPermission(userRole, 'canUseMedicalAI') },
              { id: 'consultas', label: 'Evolução Clínica', allowed: hasPermission(userRole, 'canViewClinicalHistory') },
              { id: 'examesCentral', label: 'Central de Exames + IA', allowed: hasPermission(userRole, 'canViewExamReports') }
            ]
            .filter(t => t.allowed)
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap uppercase transition-all cursor-pointer ${
                  activeTab === tab.id ? 'bg-[#2E482A] text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>


          <AdBanner
            placeholderTitle="Dicas & Cuidados"
            placeholderSubtitle="Enxoval, amamentação e cuidados no pós-parto"
          />

                    {/* TAB 1: RESUMO */}
          {activeTab === 'resumo' && (
            <div className="space-y-4 print:hidden">

              {nextAppointment ? (
                <div className="bg-[#2E482A]/10 border border-[#2E482A]/30 p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#2E482A] text-white flex items-center justify-center font-bold text-xl shrink-0">
                      🗓️
                    </div>
                    <div>
                      <span className="text-[10px] text-[#2E482A] font-bold uppercase tracking-wider block">Próxima Consulta Agendada</span>
                      <strong className="text-base text-gray-900 block">{nextAppointment.tipo}</strong>
                      <p className="text-xs text-gray-600 mt-0.5">
                        📍 {nextAppointment.local} • <strong>{formatDateBR(nextAppointment.data)} às {nextAppointment.horario}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isStaff && (
                      <a
                        href={generateAppointmentReminderLink(currentPatient, nextAppointment)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" /> Enviar Lembrete Zap
                      </a>
                    )}
                    <button
                      onClick={() => setActiveTab('agenda')}
                      className="px-3.5 py-2 bg-[#2E482A] text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                    >
                      Ver Agenda
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border p-4 rounded-2xl flex justify-between items-center text-xs text-gray-500">
                  <span>Nenhuma consulta agendada no momento.</span>
                  {userRole === 'paciente' && (
                    <button onClick={() => setShowRequestAppointmentModal(true)} className="text-[#2E482A] font-bold underline cursor-pointer">
                      + Solicitar Agendamento
                    </button>
                  )}
                  {isStaff && (
                    <button onClick={() => setShowAddAgendaModal(true)} className="text-[#2E482A] font-bold underline cursor-pointer">
                      + Agendar Agora
                    </button>
                  )}
                </div>
              )}

              {examAlerts.length > 0 && (
                <div className="bg-amber-50/80 p-5 rounded-3xl border border-amber-200 space-y-2">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Exames Recomendados para esta Fase ({currentGest.weeks}ª Semana)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                    {examAlerts.map((al, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-2xl border border-amber-100 text-xs space-y-0.5">
                        <strong className="text-gray-900 block font-bold">{al.titulo}</strong>
                        <p className="text-gray-600 text-[11px]">{al.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs">
                  <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase">Idade Gestacional (IG)</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{currentGest.weeks} Semanas e {currentGest.days} dias</div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs">
                  <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase">Data Provável do Parto (DPP)</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{new Date(currentPatient.dpp).toLocaleDateString('pt-BR')}</div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs">
                  <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase">Tipo Sanguíneo & Fator Rh</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{currentPatient.tipoSanguineo}</div>
                </div>
              </div>
            </div>
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
                    className="bg-[#2E482A] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
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
            </div>
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
                    className="bg-[#2E482A] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
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
                    className="bg-[#2E482A] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" /> Preencher / Editar Exames
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-3 font-bold text-gray-700">EXAME</th>
                      <th className="p-3 font-bold text-gray-700">1º TRIMESTRE (Data / Resultado)</th>
                      <th className="p-3 font-bold text-gray-700">3º TRIMESTRE (Data / Resultado)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {LISTA_EXAMES_OFICIAIS.map(ex => {
                      const dados = (currentPatient.examesTabela as any)?.[ex.id] || {};
                      return (
                        <tr key={ex.id} className="hover:bg-gray-50">
                          <td className="p-3 font-bold text-gray-900">{ex.label}</td>
                          <td className="p-3 text-gray-700">
                            {dados.d1 ? <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md mr-2">{formatDateDisplay(dados.d1)}</span> : null}
                            {dados.r1 || <span className="text-gray-300 italic">Pendente ({ex.placeholder})</span>}
                          </td>
                          <td className="p-3 text-gray-700">
                            {dados.d2 ? <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md mr-2">{formatDateDisplay(dados.d2)}</span> : null}
                            {dados.r2 || <span className="text-gray-300 italic">Pendente ({ex.placeholder})</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB AGENDA & LEMBRETES */}
          {activeTab === 'agenda' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6 print:hidden">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <CalendarPlus className="w-5 h-5 text-[#2E482A]" />
                    Agenda de Consultas & Lembretes
                  </h3>
                  <p className="text-xs text-gray-500">Próximos compromissos pré-natais da gestante</p>
                </div>

                <div className="flex items-center gap-2">
                  {userRole === 'paciente' && (
                    <button
                      onClick={() => setShowRequestAppointmentModal(true)}
                      className="bg-[#2E482A] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <CalendarPlus className="w-4 h-4" /> Solicitar Consulta
                    </button>
                  )}

                  {isStaff && (
                    <button
                      onClick={() => setShowAddAgendaModal(true)}
                      className="bg-[#2E482A] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
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
                          <span className="bg-[#2E482A] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
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
                  <h3 className="font-serif text-lg font-bold text-[#2E482A] uppercase tracking-wide">
                    Gráfico de Ganho de Peso
                  </h3>
                  <p className="text-xs text-gray-500">Padrão da Caderneta de Saúde da Gestante (MS / Atalah)</p>
                </div>
                {userRole === 'medica' && (
                  <button onClick={() => setShowAddConsultaModal(true)} className="bg-[#2E482A] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer">
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
                          <polyline fill="none" stroke="#2E482A" strokeWidth="3.5" points={realPoints.map(p => `${p.x},${p.y}`).join(" ")} />
                        )}
                        {realPoints.map(p => (
                          <circle key={p.id} cx={p.x} cy={p.y} r="5" fill="#D4AF37" stroke="#2E482A" strokeWidth="2" />
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
                  <Calculator className="w-5 h-5 text-[#2E482A]" />
                  Calculadora Gestacional Obstétrica
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form onSubmit={handleCalculateUsg} className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-200">
                  <h4 className="text-xs font-bold uppercase text-[#2E482A]">Cálculo por Ecografia (USG)</h4>
                  <input type="date" value={calcUsgData} onChange={(e) => setCalcUsgData(e.target.value)} className="w-full text-xs p-2.5 border rounded-xl bg-white" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Semanas" value={calcUsgSemanas} onChange={(e) => setCalcUsgSemanas(e.target.value)} className="w-full text-xs p-2.5 border rounded-xl bg-white" />
                    <input type="number" placeholder="Dias" min="0" max="6" value={calcUsgDias} onChange={(e) => setCalcUsgDias(e.target.value)} className="w-full text-xs p-2.5 border rounded-xl bg-white" />
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-[#2E482A] text-white rounded-xl text-xs font-bold cursor-pointer">Calcular DPP</button>
                </form>
                {calcResultado && (
                  <div className="space-y-3 bg-[#2E482A]/5 p-5 rounded-2xl border">
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
                <button onClick={() => setShowUploadExamModal(true)} className="bg-[#2E482A] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
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
  );
};
