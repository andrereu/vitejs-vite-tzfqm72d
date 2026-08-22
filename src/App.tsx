import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LogOut, Smartphone, WifiOff } from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';

import type { Patient, AgendaConsulta, ResultadoExame, ItemPrescricao, ItemExameSolicitado, SolicitacaoClinica, DiagnosticoRegistrado } from './types/prenatal';
import type { DoctorTenant, SaasGlobalConfig } from './types/saas';

import { db } from './firebase';
import { DoctorPanelScreen } from './components/DoctorPanelScreen';
import { PatientAppScreen } from './components/PatientAppScreen';

import { AppModals } from './components/AppModals';
import { PrintableCarteirinha } from './components/PrintableCarteirinha';
import { LandingPage } from './components/LandingPage';
import { AdminMasterDashboard } from './components/AdminMasterDashboard';
import { DoctorSettingsModal } from './components/DoctorSettingsModal';
import { DoctorTrialSignupModal } from './components/DoctorTrialSignupModal';
import { RequestAppointmentModal } from './components/RequestAppointmentModal';
import { AppointmentConfirmModal } from './components/AppointmentConfirmModal';
import { MaternaLogo } from './components/MaternaLogo';
import { TwoFactorVerifyModal } from './components/TwoFactorVerifyModal';
import { DoctorShell } from './components/DoctorShell';

import { calculateWeeksAndDays, fileToBase64, getLocalDateString } from './utils/formatters';
import { generateAppointmentReminderLink } from './utils/whatsapp';
import { generatePatientPin } from './utils/pin';
import { processExamWithGeminiIA } from './services/geminiService';
import { useDoctorsDirectory } from './hooks/useDoctorsDirectory';
import { useExamAIConfig } from './hooks/useExamAIConfig';
import { usePatients } from './hooks/usePatients';
import { useSecretaries } from './hooks/useSecretaries';
import { useBlockedSlots } from './hooks/useBlockedSlots';
import { encontrarBloqueioConflitante, mensagemBloqueioAgenda } from './utils/agendaScheduling';
import { selecionarProximaConsulta } from './utils/nextAppointment';
import { encontrarSolicitacaoDoAtendimento } from './utils/solicitacoes';
import { obterReferenciaGPG } from './data/gpgReferencia';
import { useAuthSession } from './hooks/useAuthSession';
import { useBrandTheme } from './hooks/useBrandTheme';
import { useBackNavigation } from './hooks/useBackNavigation';
import { LISTA_EXAMES_OFICIAIS } from './constants/examesList';

export default function App() {
  const [globalConfig, setGlobalConfig] = useState<SaasGlobalConfig>({
    pixKey: '',
    pixKeyType: 'cpf',
    suporteWhatsapp: '',
    nomeRecebedor: 'MaternaIA'
  });

  useEffect(() => {
    const loadGlobalConfig = async () => {
      try {
        const docRef = doc(db, "saas_config", "financeiro");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setGlobalConfig(docSnap.data() as SaasGlobalConfig);
        }
      } catch (err) {
        console.error("Erro ao carregar dados financeiros:", err);
      }
    };
    loadGlobalConfig();
  }, []);

  const handleSaveGlobalConfig = async (newConfig: SaasGlobalConfig) => {
    setGlobalConfig(newConfig);
    try {
      await setDoc(doc(db, "saas_config", "financeiro"), newConfig);
    } catch (err) {
      console.error("Erro ao salvar configuração global:", err);
    }
  };

  // BUG-02.2 — perfil neutro de verdade: nada de "Dra. Priscila" nem de
  // nenhuma outra médica fixa. É o valor inicial (antes de qualquer login) e
  // também o alvo de resetSessionState() — currentDoctorProfile.id === ''
  // já basta pra usePatients/useSecretaries/useBlockedSlots/useExamAIConfig
  // não assinarem nada (todos checam `if (!doctorId) return`), sem precisar
  // apontar pra nenhum médico real nem fictício.
  const NEUTRAL_DOCTOR_PROFILE: DoctorTenant = {
    id: '', nome: '', email: '', crm: '', telefone: '',
    clinicaNome: '', especialidade: '', enderecoConsultorio: '',
    plano: 'individual_pro', status: 'blocked', trialEndsAt: '',
    totalPacientes: 0, dataCadastro: '', valorMensalidade: 0
  };

  const [currentDoctorProfile, setCurrentDoctorProfile] = useState<DoctorTenant>(NEUTRAL_DOCTOR_PROFILE);

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedPatientDoctorId, setSelectedPatientDoctorId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('resumo');
  // BUG-01.1 — subiu de dentro de PatientAppScreen.tsx (era useState local
  // ali) pra entrar no cômputo de "existe overlay aberto?" do modelo de
  // navegação Back (useBackNavigation, mais abaixo). Comportamento visual
  // inalterado — só de onde o estado vive.
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const [showDoctorTrialModal, setShowDoctorTrialModal] = useState(false);
  const [showDoctorSettingsModal, setShowDoctorSettingsModal] = useState(false);

  const [showAddConsultaModal, setShowAddConsultaModal] = useState(false);
  // Contexto de quando "Registrar atendimento" é aberto a partir da Agenda —
  // guarda a AgendaConsulta e a paciente dela, pra handleAddConsulta gravar
  // o vínculo (agendaConsultaId) e escrever no prontuário certo mesmo sem
  // depender de qual paciente está "selecionada" globalmente
  // (selectedPatientId). Fica null quando o modal é aberto pelo fluxo antigo
  // (Gráfico GPG → "Registrar Nova Consulta"), garantindo que registros
  // desse caminho continuam saindo sem agendaConsultaId, como antes.
  const [consultaAgendaVinculada, setConsultaAgendaVinculada] = useState<{ app: AgendaConsulta; pat: Patient } | null>(null);
  // D2: id da ConsultaEvolucao em edição — null enquanto o modal está
  // registrando um atendimento novo. Guardar só o id (não o registro
  // inteiro) porque handleAddConsulta já resolve pacienteAlvo/consultas
  // atualizadas a partir de `patients`, evitando salvar em cima de uma cópia
  // desatualizada do registro.
  const [editingConsultaId, setEditingConsultaId] = useState<string | null>(null);
  // D2.2: id que a ConsultaEvolucao vai ter quando o atendimento em edição
  // for salvo — gerado ao ABRIR o modal (não no salvamento), pra uma
  // prescrição/exame adicionado durante o preenchimento já poder guardar o
  // vínculo (consultaEvolucaoId) antes de a evolução em si existir de fato.
  // Em edição, é sempre igual a editingConsultaId.
  const [idAtendimentoRascunho, setIdAtendimentoRascunho] = useState('');
  // Rascunho de prescrição/exames — compartilhado pelos dois pontos de
  // entrada da D2.2 (dentro do "Registrar Atendimento" e no modal avulso
  // "Nova Solicitação"), já que só um dos dois fica aberto por vez. Nada é
  // gravado no Firestore até o formulário que os contém ser salvo.
  const [prescricoesRascunho, setPrescricoesRascunho] = useState<ItemPrescricao[]>([]);
  const [examesRascunho, setExamesRascunho] = useState<ItemExameSolicitado[]>([]);
  const [showSolicitacaoModal, setShowSolicitacaoModal] = useState(false);
  const [showUploadExamModal, setShowUploadExamModal] = useState(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [showEditExamesModal, setShowEditExamesModal] = useState(false);
  const [showAddAgendaModal, setShowAddAgendaModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showEditVacinasModal, setShowEditVacinasModal] = useState(false);

  const [showRequestAppointmentModal, setShowRequestAppointmentModal] = useState(false);
  const [selectedAppointmentForConfirm, setSelectedAppointmentForConfirm] = useState<{ app: AgendaConsulta; pat: Patient } | null>(null);

  const [calcUsgData, setCalcUsgData] = useState(new Date().toISOString().split('T')[0]);
  const [calcUsgSemanas, setCalcUsgSemanas] = useState("8");
  const [calcUsgDias, setCalcUsgDias] = useState("0");
  const [calcResultado, setCalcResultado] = useState<any>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [examName, setExamName] = useState("");
  const [examCategory, setExamCategory] = useState("Ecografia");
  const [isUploading, setIsUploading] = useState(false);

  const [editExamesData, setEditExamesData] = useState<any>({});
  const [editProfileData, setEditProfileData] = useState<any>({});
  const [editVacinasData, setEditVacinasData] = useState<any>({});

  // Fábricas do estado inicial de cada rascunho — usadas tanto no useState
  // quanto em resetSessionState (BUG-02.2), pra "estado em branco" nunca
  // ficar definido em dois lugares que podem desalinhar com o tempo. Nenhuma
  // delas referencia currentDoctorProfile: um rascunho novo começa neutro
  // ("Consultório Médico"), não com o endereço de uma médica específica —
  // quem preenche já pode sobrescrever, e handleAddAgenda já cai pro
  // endereço real da médica logada quando o campo fica vazio.
  const initialNewAgenda = () => ({
    data: getLocalDateString(),
    horario: '14:00',
    tipo: 'Consulta Pré-Natal de Rotina',
    local: 'Consultório Médico',
    observacoes: ''
  });
  const initialNewPatient = () => ({
    nome: '', cpf: '', telefone: '', idade: '28', pai: '', nomeBebe: '',
    dum: new Date().toISOString().split('T')[0],
    pesoInicial: '60.0', altura: '1.65', tipoSanguineo: 'O+', doencasPrevias: '',
    g: '1', p: '0', c: '0', a: '0'
  });
  const initialNewConsulta = () => ({
    data: new Date().toISOString().split('T')[0],
    peso: '', pa: '120/80', au: '', bcfMf: '140 bpm / MF+', edema: 'Ausente',
    queixas: '', diagnostico: undefined as DiagnosticoRegistrado | undefined, conduta: ''
  });

  const [newAgenda, setNewAgenda] = useState(initialNewAgenda);
  const [newPatient, setNewPatient] = useState(initialNewPatient);
  const [newConsulta, setNewConsulta] = useState(initialNewConsulta);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Lógica de dados (Firestore) de médicos, pacientes e secretárias, e tudo
  // relacionado a login/sessão, vive em hooks próprios (src/hooks/) — o
  // App.tsx só usa o resultado.
  const { saasDoctors, saveSaasDoctorsToFirestore } = useDoctorsDirectory();
  const { config: examAIConfig, status: examAIConfigStatus, salvarConfigExamesIA } = useExamAIConfig(currentDoctorProfile.id);

  // BUG-02.1 — achado adjacente corrigido: a versão antiga resincronizava
  // sempre com o id fixo 'doc-priscila', não importa quem estivesse logada —
  // então o perfil de qualquer outra médica podia ser sobrescrito de volta
  // pro perfil da Priscila assim que o diretório de médicos mudasse por
  // qualquer motivo (ex: outra médica salvando as configurações dela). Agora
  // só atualiza o PRÓPRIO registro já carregado (mesmo id de quem já está em
  // currentDoctorProfile) — nunca troca pra outra médica sozinho. Com
  // currentDoctorProfile.id === '' (estado neutro), não faz nada.
  useEffect(() => {
    if (!currentDoctorProfile.id) return;
    const found = saasDoctors.find((d) => d.id === currentDoctorProfile.id);
    if (found) setCurrentDoctorProfile(found);
  }, [saasDoctors, currentDoctorProfile.id]);

  // BUG-01.1 — ponte pra useBackNavigation (definida bem mais abaixo, depois
  // de useAuthSession) poder ser chamada por resetSessionState (definida
  // antes de useAuthSession, já que é passada como onResetLocalState pra
  // ele). O ref é reatribuído a cada render com a versão mais atual do hook —
  // ver o comentário perto de "const backNav = useBackNavigation(...)".
  const backNavRef = useRef<{ resetToRest: () => void }>({ resetToRest: () => {} });

  // BUG-02.2 — reset central de sessão. Chamado por "Sair" e por "Trocar
  // usuário" (via onResetLocalState, dentro de useAuthSession) — a lista
  // completa de estado a limpar mora só aqui, uma vez, pra logout e troca de
  // usuário nunca divergirem sobre o que "sessão limpa" significa. Cobre
  // exatamente o levantamento da investigação BUG-02.1: perfil da médica,
  // paciente selecionada, aba ativa, e todo modal/rascunho que poderia
  // sobreviver de uma identidade pra outra no mesmo aparelho.
  //
  // BUG-01.1 — também zera o histórico de navegação (backNavRef.resetToRest)
  // na mesma tacada: sem isso, um Back logo depois de "Trocar usuário"
  // poderia alcançar uma entrada de histórico ainda associada à identidade
  // anterior (Seção 9 do pedido).
  const resetSessionState = () => {
    setCurrentDoctorProfile(NEUTRAL_DOCTOR_PROFILE);
    setSelectedPatientId('');
    setSelectedPatientDoctorId(null);
    setActiveTab('resumo');
    setShowMoreSheet(false);

    setShowDoctorTrialModal(false);
    setShowDoctorSettingsModal(false);

    setShowAddConsultaModal(false);
    setConsultaAgendaVinculada(null);
    setEditingConsultaId(null);
    setIdAtendimentoRascunho('');
    setPrescricoesRascunho([]);
    setExamesRascunho([]);
    setShowSolicitacaoModal(false);
    setShowUploadExamModal(false);
    setShowNewPatientModal(false);
    setShowEditExamesModal(false);
    setShowAddAgendaModal(false);
    setShowEditProfileModal(false);
    setShowEditVacinasModal(false);

    setShowRequestAppointmentModal(false);
    setSelectedAppointmentForConfirm(null);

    setCalcUsgData(new Date().toISOString().split('T')[0]);
    setCalcUsgSemanas('8');
    setCalcUsgDias('0');
    setCalcResultado(null);

    setSelectedFile(null);
    setExamName('');
    setExamCategory('Ecografia');
    setIsUploading(false);

    setEditExamesData({});
    setEditProfileData({});
    setEditVacinasData({});

    setNewAgenda(initialNewAgenda());
    setNewPatient(initialNewPatient());
    setNewConsulta(initialNewConsulta());

    backNavRef.current.resetToRest();
  };

  const {
    currentScreen, setCurrentScreen,
    userRole, setUserRole,
    loginRole, setLoginRole,
    doctorPanelTab, setDoctorPanelTab,
    showPatientLoginModal, setShowPatientLoginModal,
    showDoctorLoginModal, setShowDoctorLoginModal,
    showMasterLoginModal, setShowMasterLoginModal,
    doctorEmail, setDoctorEmail,
    doctorPassword, setDoctorPassword,
    masterEmail, setMasterEmail,
    masterPassword, setMasterPassword,
    loginCpf, setLoginCpf,
    loginSenha, setLoginSenha,
    loginError,
    resetMessage,
    showTwoFactorModal, setShowTwoFactorModal,
    pendingTwoFactorUser, setPendingTwoFactorUser,
    handleDoctorLogin,
    handleMasterLogin,
    handleGooglePatientLogin,
    handlePatientLogin,
    handleGoogleDoctorLogin,
    handlePasswordReset,
    handleLogout,
    handleSwitchUser
  } = useAuthSession({
    saasDoctors,
    currentDoctorProfile,
    setCurrentDoctorProfile,
    setSelectedPatientId,
    setSelectedPatientDoctorId,
    onResetLocalState: resetSessionState,
    onResetNavigation: () => backNavRef.current.resetToRest()
  });

  // Endereço próprio por médica: maternaia.com.br/{slug} mostra uma landing
  // com a cara dela em vez da genérica (pensado pra ela linkar daqui do site
  // pessoal dela, tipo um WordPress, sem precisar hospedar o app lá).
  const [doctorSlugFromUrl] = useState(() =>
    window.location.pathname.replace(/^\/+/, '').split('/')[0].toLowerCase()
  );
  const landingDoctor = doctorSlugFromUrl
    ? saasDoctors.find((d) => d.slug === doctorSlugFromUrl)
    : undefined;

  // Médica dona do prontuário que a paciente está vendo — não é a mesma
  // coisa que currentDoctorProfile (essa fica com o perfil da última médica
  // logada/demo, e não é atualizada no login da paciente).
  const patientDoctorProfile = selectedPatientDoctorId
    ? saasDoctors.find((d) => d.id === selectedPatientDoctorId)
    : undefined;

  // Médica "dona" da tela atual, pra decidir de quem é a cor personalizada
  // (prompt 5): painel/prontuário/landing pessoal usam a cor da médica dona
  // daquele conteúdo; landing genérica e master admin ficam no verde padrão.
  const themeDoctor =
    currentScreen === 'landing' ? landingDoctor
    : currentScreen === 'patient_app' ? patientDoctorProfile
    : currentScreen === 'doctor_panel' ? currentDoctorProfile
    : undefined;
  useBrandTheme(themeDoctor);

  const { patients, saveToFirestore } = usePatients({
    doctorId: currentDoctorProfile.id,
    doctorName: currentDoctorProfile.nome,
    userRole,
    selectedPatientDoctorId,
    selectedPatientId
  });

  const { secretaries, saveSecretaries } = useSecretaries(currentDoctorProfile.id, userRole);

  const { blockedSlots, addBlockedSlot, removeBlockedSlot } = useBlockedSlots(currentDoctorProfile.id, userRole);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  // Placeholder seguro: evita que a tela quebre quando a médica ainda não tem
  // nenhuma paciente cadastrada (comum logo após o cadastro/trial).
  const EMPTY_PATIENT: Patient = {
    id: '', doctorId: '', cpf: '', nome: '', idade: '', pai: '', nomeBebe: '',
    dum: '', dpp: '', g: '0', p: '0', c: '0', a: '0',
    pesoInicial: '60', altura: '1.65', tipoSanguineo: '', doencasPrevias: '',
    vacinas: {}, examesTabela: {}, consultasEvolucao: [], agendaConsultas: [], examesEnviados: [], solicitacoes: []
  };

  const currentPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId) || patients[0] || EMPTY_PATIENT;
  }, [patients, selectedPatientId]);

  const currentGest = calculateWeeksAndDays(currentPatient.dum);

  // Só confirmada/encaixe_urgente contam como "próxima consulta" — mesma
  // regra já usada pra checar conflito de agenda (Fase 2D-D1) e a mesma
  // ordenação central da Agenda (compararAgendamentos), em vez do sort
  // próprio que existia aqui antes (que quebrava com horario vazio numa
  // solicitação ainda não confirmada).
  const nextAppointment = useMemo(
    () => selecionarProximaConsulta(currentPatient.agendaConsultas),
    [currentPatient.agendaConsultas]
  );

  // UX-04: substitui o antigo bmiInfo (faixas do IOM, americanas e já
  // desatualizadas no Brasil desde 2022) pela referência de GPG que a Dra.
  // Priscila já usa na Caderneta impressa da clínica (src/data/gpgReferencia.ts).
  // Sem o fallback de 60kg/1,65m que existia antes — peso/altura ausentes ou
  // inválidos agora resultam em "referência indisponível" (faixa: null),
  // nunca numa faixa clínica inventada.
  const referenciaGPG = useMemo(
    () => obterReferenciaGPG(currentPatient.pesoInicial, currentPatient.altura),
    [currentPatient.pesoInicial, currentPatient.altura]
  );

  const handleCalculateUsg = (e: React.FormEvent) => {
    e.preventDefault();
    const dataUsg = new Date(calcUsgData);
    const sem = parseInt(calcUsgSemanas) || 0;
    const dias = parseInt(calcUsgDias) || 0;

    const totalDiasNaUsg = sem * 7 + dias;
    const dumCorrigida = new Date(dataUsg.getTime() - totalDiasNaUsg * 24 * 60 * 60 * 1000);
    const dppCalculada = new Date(dumCorrigida.getTime() + 280 * 24 * 60 * 60 * 1000);

    const hoje = new Date();
    const diffDiasHoje = Math.floor(Math.max(0, hoje.getTime() - dumCorrigida.getTime()) / (1000 * 60 * 60 * 24));
    const semHoje = Math.floor(diffDiasHoje / 7);
    const diasHoje = diffDiasHoje % 7;

    setCalcResultado({
      dumCorrigida: dumCorrigida.toISOString().split('T')[0],
      dpp: dppCalculada.toLocaleDateString('pt-BR'),
      igHoje: `${semHoje} Semanas e ${diasHoje} dias`
    });
  };

  const examAlerts = useMemo(() => {
    const sem = currentGest.weeks;
    const list = [];

    if (sem >= 11 && sem <= 14) list.push({ titulo: 'Ecografia Morfológica do 1º Trimestre', desc: 'Medição da Translucência Nucal (TN) e osso nasal.' });
    if (sem >= 20 && sem <= 24) list.push({ titulo: 'Ecografia Morfológica do 2º Trimestre', desc: 'Avaliação detalhada da anatomia fetal e coração.' });
    if (sem >= 24 && sem <= 28) {
      list.push({ titulo: 'TOTG (Teste de Glicose)', desc: 'Rastreio de Diabetes Gestacional.' });
      list.push({ titulo: 'Vacina dTPa', desc: 'Imunização contra coqueluche.' });
    }
    if (sem >= 28) list.push({ titulo: 'Sorologias do 3º Trimestre', desc: 'Repetição de VDRL, HIV, Toxoplasmose e Hemograma.' });
    if (sem >= 35 && sem <= 37) list.push({ titulo: 'Estreptococo do Grupo B (GBS)', desc: 'Swab de prevenção neonatal.' });

    return list;
  }, [currentGest.weeks]);

      const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Por favor, selecione um arquivo.");
      return;
    }

    setIsUploading(true);

    try {
      const base64Content = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type || "application/pdf";

      // 1. Processa no Gemini
      const resultIA = await processExamWithGeminiIA(base64Content, mimeType, examCategory, examName, currentDoctorProfile.id);

      // 2. Cria o registro do exame (SEM salvar o Base64 gigante no Firestore para não estourar o limite de 1MB)
      const novoExame = {
        id: `ex-${Date.now()}`,
        nome: examName || selectedFile.name,
        tipo: examCategory,
        dataUpload: new Date().toISOString().split('T')[0],
        // Se for imagem pequena (< 300KB) guarda o preview; se for PDF de 20 páginas, não incha o banco
        fileData: (mimeType.includes('image') && base64Content.length < 400000) ? base64Content : '',
        resumoIA: resultIA.resumoIA,
        notaDra: resultIA.notaDra,
        enviadoPor: userRole === 'medica' ? currentDoctorProfile.nome : "Paciente"
      };

      // 3. Atualiza os campos da Tabela de Exames Laboratoriais — cada exame
      // é uma lista (mais recente primeiro), então um novo envio sempre soma
      // ao histórico em vez de sobrescrever um resultado anterior.
      const currentExamesTab: Record<string, ResultadoExame[]> = { ...(currentPatient.examesTabela || {}) };
      const todayStr = new Date().toISOString().split('T')[0];

      if (resultIA.examesExtraidos && Object.keys(resultIA.examesExtraidos).length > 0) {
        Object.entries(resultIA.examesExtraidos).forEach(([k, val]: any) => {
          if (val && typeof val === 'string' && val.trim() !== '') {
            const historico = currentExamesTab[k] || [];
            currentExamesTab[k] = [{ data: todayStr, resultado: val.trim() }, ...historico];
          }
        });
      }

      // 4. Monta o paciente atualizado
      const updated: Patient = {
        ...currentPatient,
        examesTabela: currentExamesTab,
        examesEnviados: [novoExame, ...(currentPatient.examesEnviados || [])]
      };

      // 5. Salva na lista e sincroniza com o Firestore
      const novaLista = patients.map(p => p.id === updated.id ? updated : p);
      await saveToFirestore(novaLista);

      setIsUploading(false);
      setShowUploadExamModal(false);
      setSelectedFile(null);
      setExamName("");
     } catch (err: any) {
      console.error("Erro detalhado no processamento:", err);
      alert(`Falha no processamento:\n${err.message || JSON.stringify(err)}`);
      setIsUploading(false);
    }

  };



  const handleSaveTabelaExames = () => {
    const updated: Patient = { ...currentPatient, examesTabela: editExamesData };
    saveToFirestore(patients.map(p => p.id === updated.id ? updated : p));
    setShowEditExamesModal(false);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const dumDate = new Date(editProfileData.dum);
    const dppDate = new Date(dumDate.getTime() + 280 * 24 * 60 * 60 * 1000);

    const updated: Patient = {
      ...currentPatient,
      ...editProfileData,
      dpp: dppDate.toISOString().split('T')[0]
    };

    saveToFirestore(patients.map(p => p.id === updated.id ? updated : p));
    setShowEditProfileModal(false);
  };

  const handleSaveVacinas = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Patient = { ...currentPatient, vacinas: editVacinasData };
    saveToFirestore(patients.map(p => p.id === updated.id ? updated : p));
    setShowEditVacinasModal(false);
  };

  const handleAddAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    const itemAgenda: AgendaConsulta = {
      id: `ag-${Date.now()}`,
      data: newAgenda.data,
      horario: newAgenda.horario,
      tipo: newAgenda.tipo,
      local: newAgenda.local || currentDoctorProfile.enderecoConsultorio || 'Consultório Médico',
      observacoes: newAgenda.observacoes,
      status: 'confirmada',
      solicitadoPor: 'clinica',
      solicitadoEm: new Date().toISOString()
    };

    const updatedAgenda = [...(currentPatient.agendaConsultas || []), itemAgenda];
    const updated: Patient = { ...currentPatient, agendaConsultas: updatedAgenda };
    saveToFirestore(patients.map(p => p.id === updated.id ? updated : p));
    setShowAddAgendaModal(false);
    setNewAgenda({
      data: getLocalDateString(),
      horario: '14:00',
      tipo: 'Consulta Pré-Natal de Rotina',
      local: currentDoctorProfile.enderecoConsultorio || 'Consultório Médico',
      observacoes: ''
    });
  };

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    const dumDate = new Date(newPatient.dum);
    const dppDate = new Date(dumDate.getTime() + 280 * 24 * 60 * 60 * 1000);
    const pinGerado = generatePatientPin();

    const novoObjetoPaciente: Patient = {
      id: `gestante-${Date.now()}`,
      doctorId: currentDoctorProfile.id,
      cpf: newPatient.cpf || "000.000.000-00",
      telefone: newPatient.telefone || "",
      senhaAcc: pinGerado,
      nome: newPatient.nome || "Nova Gestante",
      idade: newPatient.idade || "25",
      pai: newPatient.pai || "Não informado",
      nomeBebe: newPatient.nomeBebe || "A definir",
      dum: newPatient.dum,
      dpp: dppDate.toISOString().split('T')[0],
      g: newPatient.g || "1", 
      p: newPatient.p || "0", 
      c: newPatient.c || "0", 
      a: newPatient.a || "0",
      pesoInicial: newPatient.pesoInicial || "60.0",
      altura: newPatient.altura || "1.65",
      tipoSanguineo: newPatient.tipoSanguineo || "O+",
      doencasPrevias: newPatient.doencasPrevias || "Nenhuma",
      vacinas: {
        influenza: { realizada: false, data: "", lote: "" },
        vsr: { realizada: false, data: "", lote: "" },
        dtpa: { realizada: false, data: "", lote: "" },
        covid19: { realizada: false, data: "", lote: "" },
        hepatiteB: { d1: "", d2: "", d3: "" }
      },
      examesTabela: {},
      agendaConsultas: [],
      consultasEvolucao: [
        { id: `c-init`, data: newPatient.dum, igSem: 0, peso: parseFloat(newPatient.pesoInicial || '60'), pa: "120/80", au: "NP", bcfMf: "Aguardando", edema: "Ausente", conduta: "Consulta Inicial de Pré-Natal." }
      ],
      examesEnviados: [],
      solicitacoes: []
    };

    saveToFirestore([...patients, novoObjetoPaciente]);
    setSelectedPatientId(novoObjetoPaciente.id);
    setShowNewPatientModal(false);
    window.alert(
      `Cadastro criado!\n\nSenha de acesso da paciente (PIN): ${pinGerado}\n\nPasse esse PIN para a gestante — ela usa CPF + esse PIN para entrar no app. Você pode gerar um novo PIN a qualquer momento em "Editar Dados".`
    );
  };

  const handleResetPatientPin = () => {
    const novoPin = generatePatientPin();
    setEditProfileData({ ...editProfileData, senhaAcc: novoPin });
    window.alert(`Novo PIN gerado: ${novoPin}\n\nClique em "Salvar Perfil" para confirmar a troca.`);
  };

  // D2.2: solicitação (prescrição/exames) já vinculada ao atendimento em
  // edição, se existir — calculado uma vez aqui pra ser reaproveitado tanto
  // no JSX (mostrar como somente-leitura) quanto dentro de handleAddConsulta
  // (decidir se cria uma solicitação nova ou não mexe em nada).
  const pacienteParaConsulta = consultaAgendaVinculada?.pat ?? currentPatient;
  const solicitacaoExistenteDoAtendimento = editingConsultaId
    ? encontrarSolicitacaoDoAtendimento(pacienteParaConsulta.solicitacoes, editingConsultaId) ?? null
    : null;

  const handleAddConsulta = (e: React.FormEvent) => {
    e.preventDefault();
    // Aberto pela Agenda → grava no prontuário da paciente daquela consulta
    // específica (não necessariamente a "selecionada" globalmente). Aberto
    // pelo fluxo do prontuário (novo ou edição) → sempre currentPatient,
    // como sempre foi.
    const pacienteAlvo = consultaAgendaVinculada?.pat ?? currentPatient;
    // D2.1: IG deixou de ser digitável no atendimento — é sempre derivada da
    // DUM da paciente (única referência obstétrica persistida, corrigida uma
    // vez em "Editar Dados") na data deste atendimento. Nunca fica
    // "congelada" com um valor manual antigo.
    const sem = calculateWeeksAndDays(pacienteAlvo.dum, newConsulta.data).weeks;
    const pesoVal = parseFloat(newConsulta.peso) || parseFloat(pacienteAlvo.pesoInicial);
    // D2.2: id definitivo do atendimento — gerado ao abrir o modal (não
    // aqui), pra qualquer prescrição/exame adicionado durante o
    // preenchimento já poder referenciar o id certo.
    const idAtendimento = editingConsultaId || idAtendimentoRascunho;

    const dadosClinicos = {
      data: newConsulta.data,
      igSem: sem,
      peso: pesoVal,
      pa: newConsulta.pa,
      au: newConsulta.au,
      bcfMf: newConsulta.bcfMf,
      edema: newConsulta.edema,
      queixas: newConsulta.queixas,
      diagnostico: newConsulta.diagnostico,
      conduta: newConsulta.conduta
    };

    // Edição: mesmo id, mesmo agendaConsultaId original (se existir) — só os
    // campos clínicos são substituídos. Nunca cria um registro novo aqui.
    const updatedConsultas = (editingConsultaId
      ? pacienteAlvo.consultasEvolucao.map((c) => (c.id === editingConsultaId ? { ...c, ...dadosClinicos } : c))
      : [
          ...pacienteAlvo.consultasEvolucao,
          {
            id: idAtendimento,
            ...dadosClinicos,
            // Só existe quando o modal foi aberto a partir da Agenda — o
            // fluxo do prontuário nunca seta consultaAgendaVinculada, então
            // nunca inclui essa chave (sem alterar o formato de registros já
            // existentes).
            ...(consultaAgendaVinculada ? { agendaConsultaId: consultaAgendaVinculada.app.id } : {})
          }
        ]
    ).sort((a, b) => a.igSem - b.igSem);

    // D2.2: só cria uma solicitação nova se a médica de fato adicionou algo
    // E o atendimento ainda não tinha uma vinculada — editar um atendimento
    // que já tem solicitação nunca mexe nela por aqui (a seção fica
    // somente-leitura nesse caso, então prescricoesRascunho/examesRascunho
    // já chegam vazios; a checagem abaixo é só uma segunda trava).
    const criaSolicitacaoNova = !solicitacaoExistenteDoAtendimento && (prescricoesRascunho.length > 0 || examesRascunho.length > 0);
    const solicitacoesAtualizadas = criaSolicitacaoNova
      ? [
          ...(pacienteAlvo.solicitacoes || []),
          {
            id: `sol-${Date.now()}`,
            data: newConsulta.data,
            prescricoes: prescricoesRascunho,
            exames: examesRascunho,
            consultaEvolucaoId: idAtendimento
          }
        ]
      : pacienteAlvo.solicitacoes;

    const updated: Patient = { ...pacienteAlvo, consultasEvolucao: updatedConsultas, solicitacoes: solicitacoesAtualizadas };
    saveToFirestore(patients.map(p => p.id === updated.id ? updated : p));
    setShowAddConsultaModal(false);
    setConsultaAgendaVinculada(null);
    setEditingConsultaId(null);
    setPrescricoesRascunho([]);
    setExamesRascunho([]);
  };

  // BUG-01.1 — nomeado (antes era uma arrow inline só no onCancelarConsulta
  // do AppModals) pra o Back poder chamar exatamente esta mesma função
  // quando fecha o overlay "Registrar Atendimento", sem duplicar a limpeza
  // de rascunho num segundo lugar.
  const handleCancelarConsulta = () => {
    setShowAddConsultaModal(false);
    setConsultaAgendaVinculada(null);
    setEditingConsultaId(null);
    setPrescricoesRascunho([]);
    setExamesRascunho([]);
  };

  // Ponto de entrada "🩺 Registrar atendimento" na Agenda — abre o MESMO
  // modal de sempre ("Registrar Atendimento"), só pré-preenchendo a data da
  // AgendaConsulta selecionada (e a IG já calculada pra essa data) e
  // guardando o vínculo pra handleAddConsulta gravar o agendaConsultaId. Não
  // muda status da AgendaConsulta, não muda selectedPatientId, não navega de
  // tela.
  const handleAbrirRegistroAtendimento = (app: AgendaConsulta, pat: Patient) => {
    setNewConsulta({
      data: app.data,
      peso: '', pa: '120/80', au: '', bcfMf: '140 bpm / MF+', edema: 'Ausente',
      queixas: '', diagnostico: undefined, conduta: ''
    });
    setConsultaAgendaVinculada({ app, pat });
    setEditingConsultaId(null);
    setIdAtendimentoRascunho(`c-${Date.now()}`);
    setPrescricoesRascunho([]);
    setExamesRascunho([]);
    setShowAddConsultaModal(true);
  };

  // Ponto de entrada "+ Registrar Atendimento" dentro do prontuário (aba
  // Evolução / Atendimento e Gráfico GPG) — mesmo modal, sem vínculo com
  // nenhuma AgendaConsulta. IG pré-calculada a partir da DUM de
  // currentPatient pra hoje.
  const handleAbrirNovaEvolucao = () => {
    setNewConsulta({
      data: getLocalDateString(),
      peso: '', pa: '120/80', au: '', bcfMf: '140 bpm / MF+', edema: 'Ausente',
      queixas: '', diagnostico: undefined, conduta: ''
    });
    setConsultaAgendaVinculada(null);
    setEditingConsultaId(null);
    setIdAtendimentoRascunho(`c-${Date.now()}`);
    setPrescricoesRascunho([]);
    setExamesRascunho([]);
    setShowAddConsultaModal(true);
  };

  // "Editar" numa evolução já registrada — mesmo modal, carregado com os
  // dados existentes. agendaConsultaId do registro original é preservado
  // automaticamente (handleAddConsulta só sobrescreve os campos clínicos).
  const handleEditarEvolucao = (consulta: Patient['consultasEvolucao'][number]) => {
    setNewConsulta({
      data: consulta.data,
      peso: String(consulta.peso),
      pa: consulta.pa,
      au: consulta.au,
      bcfMf: consulta.bcfMf,
      edema: consulta.edema,
      queixas: consulta.queixas || '',
      // consulta.diagnostico já vem normalizado (string antiga -> {descricao}
      // sem código, objeto novo passa direto) por normalizarPaciente em
      // usePatients.ts — a médica pode selecionar um CID de novo se quiser.
      diagnostico: consulta.diagnostico,
      conduta: consulta.conduta
    });
    setConsultaAgendaVinculada(null);
    setEditingConsultaId(consulta.id);
    setIdAtendimentoRascunho(consulta.id);
    // Seção de prescrição/exames abre vazia mesmo em edição — se o
    // atendimento já tiver uma solicitação vinculada, ela é mostrada
    // separadamente como somente-leitura (ver solicitacaoExistenteDoAtendimento).
    setPrescricoesRascunho([]);
    setExamesRascunho([]);
    setShowAddConsultaModal(true);
  };

  // D2.2 — helpers de prescrição/exames, compartilhados pelas duas entradas
  // (dentro do atendimento e no modal avulso "Nova Solicitação").
  const handleAdicionarPrescricao = (item: Omit<ItemPrescricao, 'id'>) => {
    setPrescricoesRascunho((prev) => [...prev, { id: `presc-${Date.now()}`, ...item }]);
  };
  const handleRemoverPrescricao = (id: string) => {
    setPrescricoesRascunho((prev) => prev.filter((p) => p.id !== id));
  };
  const handleAdicionarExameSolicitado = (item: Omit<ItemExameSolicitado, 'id'>) => {
    setExamesRascunho((prev) => [...prev, { id: `exsol-${Date.now()}`, ...item }]);
  };
  const handleRemoverExameSolicitado = (id: string) => {
    setExamesRascunho((prev) => prev.filter((ex) => ex.id !== id));
  };

  // Ponto de entrada "+ Nova Solicitação" na Central de Exames — MESMO
  // mecanismo do atendimento (mesmos handlers, mesmo componente de UI), só
  // que sem nenhum vínculo de atendimento: consultaEvolucaoId nunca é
  // setado por este caminho.
  const handleAbrirNovaSolicitacao = () => {
    setPrescricoesRascunho([]);
    setExamesRascunho([]);
    setShowSolicitacaoModal(true);
  };

  const handleCancelarSolicitacao = () => {
    setShowSolicitacaoModal(false);
    setPrescricoesRascunho([]);
    setExamesRascunho([]);
  };

  const handleSalvarSolicitacao = () => {
    if (prescricoesRascunho.length === 0 && examesRascunho.length === 0) return;
    const nova: SolicitacaoClinica = {
      id: `sol-${Date.now()}`,
      data: getLocalDateString(),
      prescricoes: prescricoesRascunho,
      exames: examesRascunho
    };
    const updated: Patient = { ...currentPatient, solicitacoes: [...(currentPatient.solicitacoes || []), nova] };
    saveToFirestore(patients.map((p) => (p.id === updated.id ? updated : p)));
    handleCancelarSolicitacao();
  };

  // BUG-01.1 — modelo de navegação Back (3 níveis fixos: overlay > drill >
  // aba, cada um substituindo — nunca empilhando — sucessivas transições do
  // mesmo tipo; ver useBackNavigation.ts). Os 3 booleanos abaixo são
  // DERIVADOS de estado que o app já muda por outros motivos — nenhum "avisa
  // o hook" novo foi espalhado pelos ~18 pontos que abrem modal/sheet, aba ou
  // prontuário de paciente.
  //
  // hasDrill: só a equipe "entra" numa paciente a partir do painel (a própria
  // paciente não tem tela de repouso separada da sua ficha).
  const hasDrillOpen = (userRole === 'medica' || userRole === 'secretaria') && currentScreen === 'patient_app';
  // hasTab: sair da aba 'resumo' dentro de patient_app, seja na própria
  // ficha da paciente ou na da equipe navegando — mesma regra pros dois papéis.
  const hasTabOpen = currentScreen === 'patient_app' && activeTab !== 'resumo';
  // hasOverlay: OR de todo modal/sheet/confirmação do app — na prática nunca
  // mais de um verdadeiro ao mesmo tempo (mutuamente exclusivos por
  // construção), então tratar como uma camada só é seguro.
  const hasOverlayOpen =
    showMoreSheet ||
    !!selectedAppointmentForConfirm ||
    showTwoFactorModal ||
    showAddConsultaModal ||
    showSolicitacaoModal ||
    showDoctorSettingsModal ||
    showDoctorTrialModal ||
    showRequestAppointmentModal ||
    showInstallModal ||
    showEditProfileModal ||
    showEditVacinasModal ||
    showEditExamesModal ||
    showAddAgendaModal ||
    showUploadExamModal ||
    showNewPatientModal ||
    showPatientLoginModal ||
    showDoctorLoginModal ||
    showMasterLoginModal;

  // Fecha o overlay que estiver aberto usando EXATAMENTE o mesmo handler já
  // ligado ao botão "Cancelar"/X de cada um — nunca um fechamento paralelo,
  // pra nunca pular a limpeza de rascunho que alguns deles já fazem
  // (Registrar Atendimento, Nova Solicitação, 2FA). Só um é verdadeiro por
  // vez hoje, então a ordem dos ifs não decide prioridade nenhuma.
  const closeTopmostOverlay = () => {
    if (showMoreSheet) { setShowMoreSheet(false); return; }
    if (selectedAppointmentForConfirm) { setSelectedAppointmentForConfirm(null); return; }
    if (showTwoFactorModal) { setShowTwoFactorModal(false); setPendingTwoFactorUser(null); return; }
    if (showAddConsultaModal) { handleCancelarConsulta(); return; }
    if (showSolicitacaoModal) { handleCancelarSolicitacao(); return; }
    if (showDoctorSettingsModal) { setShowDoctorSettingsModal(false); return; }
    if (showDoctorTrialModal) { setShowDoctorTrialModal(false); return; }
    if (showRequestAppointmentModal) { setShowRequestAppointmentModal(false); return; }
    if (showInstallModal) { setShowInstallModal(false); return; }
    if (showEditProfileModal) { setShowEditProfileModal(false); return; }
    if (showEditVacinasModal) { setShowEditVacinasModal(false); return; }
    if (showEditExamesModal) { setShowEditExamesModal(false); return; }
    if (showAddAgendaModal) { setShowAddAgendaModal(false); return; }
    if (showUploadExamModal) { setShowUploadExamModal(false); return; }
    if (showNewPatientModal) { setShowNewPatientModal(false); return; }
    if (showPatientLoginModal) { setShowPatientLoginModal(false); return; }
    if (showDoctorLoginModal) { setShowDoctorLoginModal(false); return; }
    if (showMasterLoginModal) { setShowMasterLoginModal(false); return; }
  };

  const backNav = useBackNavigation({
    hasDrill: hasDrillOpen,
    hasTab: hasTabOpen,
    hasOverlay: hasOverlayOpen,
    onPopOverlay: closeTopmostOverlay,
    onPopTab: () => setActiveTab('resumo'),
    onPopDrill: () => setCurrentScreen('doctor_panel')
  });
  // resetSessionState (definida antes de useAuthSession, que por sua vez
  // precisa vir antes de useBackNavigation por causa de currentScreen/
  // userRole) chama resetToRest através deste ref — sempre a versão mais
  // recente do hook, sem inverter a ordem de declaração dos dois.
  backNavRef.current = backNav;

  return (
    <div className={`min-h-screen font-sans pb-12 print:bg-white print:pb-0 ${
      currentScreen === 'master_admin' ? 'bg-slate-950 text-slate-100' : 'bg-[#F4F6F2] text-gray-800'
    }`}>
      
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>

      {isOffline && (
        <div className="bg-amber-600 text-white text-xs font-bold px-4 py-2 text-center flex items-center justify-center gap-2 print:hidden">
          <WifiOff className="w-4 h-4" />
          <span>Você está navegando em modo offline. O app mantém os dados salvos localmente.</span>
        </div>
      )}

      {/* CABEÇALHO — só sobra pra landing/master admin; área profissional
          ganhou moldura própria (DoctorShell, fase 1 da reforma App-First)
          mais abaixo. A paciente não tem header persistente nenhum desde a
          UX-06.4 — a jornada dela começa direto pela saudação; identidade da
          Dra./Instalar/Sair moraram pro menu "Mais" dela. */}
      {(currentScreen === 'landing' || currentScreen === 'master_admin') && (
      <header className={`text-white shadow-md sticky top-0 z-40 print:hidden ${
        currentScreen === 'master_admin' ? 'bg-black border-b border-slate-800' : 'bg-[var(--brand-primary)] border-b border-[var(--brand-primary-border)]'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          
          <div 
            onClick={() => {
              if (currentScreen === 'landing') {
                setCurrentScreen('landing');
              } else if (currentScreen === 'master_admin') {
                setCurrentScreen('master_admin');
              } else if (userRole === 'medica' || userRole === 'secretaria') {
                setCurrentScreen('doctor_panel');
              } else if (userRole === 'paciente') {
                setCurrentScreen('patient_app');
              }
            }} 
            className="cursor-pointer"
          >
            {currentScreen === 'landing' && landingDoctor ? (
              <div className="flex items-center gap-3">
                {landingDoctor.logoUrl ? (
                  <img src={landingDoctor.logoUrl} alt="Logo" className="w-9 h-9 rounded-xl object-contain bg-white/10 p-0.5 border border-white/20" />
                ) : (
                  <MaternaLogo variant="icon" size="sm" />
                )}
                <div>
                  <h1 className="font-serif text-base md:text-lg font-bold text-[var(--brand-on-primary)] leading-none">
                    {landingDoctor.nome}
                  </h1>
                  <p className="text-[9px] uppercase tracking-widest text-[var(--brand-on-primary-muted)] font-medium mt-0.5">
                    {landingDoctor.especialidade || 'OBSTETRA'} • CRM {landingDoctor.crm}
                  </p>
                </div>
              </div>
            ) : currentScreen === 'landing' || currentScreen === 'master_admin' ? (
              <MaternaLogo variant="full" theme="light" size="md" />
            ) : (
              <div className="flex items-center gap-3">
                {currentDoctorProfile.logoUrl ? (
                  <img src={currentDoctorProfile.logoUrl} alt="Logo" className="w-9 h-9 rounded-xl object-contain bg-white/10 p-0.5 border border-white/20" />
                ) : (
                  <MaternaLogo variant="icon" size="sm" />
                )}
                <div>
                  <h1 className="font-serif text-base md:text-lg font-bold text-[var(--brand-on-primary)] leading-none">
                    {currentDoctorProfile.nome}
                  </h1>
                  <p className="text-[9px] uppercase tracking-widest text-[var(--brand-on-primary-muted)] font-medium mt-0.5">
                    {currentDoctorProfile.especialidade || 'OBSTETRA'} • CRM {currentDoctorProfile.crm}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentScreen !== 'landing' && currentScreen !== 'master_admin' && (
              <button
                onClick={() => {
                  if (userRole === 'medica' || userRole === 'secretaria') {
                    setCurrentScreen('doctor_panel');
                  } else {
                    setCurrentScreen('patient_app');
                  }
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
              >
                🏠 Início
              </button>
            )}

            <button
              onClick={handleInstallPWA}
              className="bg-[var(--brand-gold)] hover:bg-amber-400 text-gray-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">Instalar App</span>
            </button>

            {currentScreen !== 'landing' && (
              <>
                {(userRole === 'medica' || userRole === 'secretaria') && currentScreen !== 'master_admin' && (
                  <button
                    onClick={() => setCurrentScreen('doctor_panel')}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 text-white hover:bg-white/20 cursor-pointer hidden md:inline-block"
                  >
                    Lista de Pacientes
                  </button>
                )}
                <button 
                  onClick={handleLogout} 
                  className="p-2 bg-red-500/20 text-red-200 hover:bg-red-500/30 rounded-xl cursor-pointer transition-all"
                  title="Sair do Sistema"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Na landing pessoal da médica a página é curta — o hero logo
                abaixo já tem esses mesmos botões, então repeti-los aqui só
                empilha duas vezes a mesma ação. Na landing genérica de
                vendas, com bastante conteúdo pra rolar, o atalho fixo ainda
                vale a pena. */}
            {currentScreen === 'landing' && !landingDoctor && (
              <>
                <button
                  onClick={() => setShowPatientLoginModal(true)}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  👶 Sou Gestante
                </button>
                <button
                  onClick={() => setShowDoctorLoginModal(true)}
                  className="bg-[var(--brand-gold)] hover:bg-amber-400 text-gray-900 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  🩺 Acesso Profissional
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      )}

      {/* 1. LANDING PAGE PRINCIPAL */}
      {currentScreen === 'landing' && (
        <div className="space-y-6">
          <LandingPage
            onOpenPatientLogin={() => setShowPatientLoginModal(true)}
            onOpenDoctorLogin={() => setShowDoctorLoginModal(true)}
            onOpenTrialModal={() => setShowDoctorTrialModal(true)}
            onInstallPWA={handleInstallPWA}
            doctorContext={landingDoctor}
          />
          {!landingDoctor && (
            <div className="text-center pb-8 print:hidden">
              <button
                onClick={() => setShowMasterLoginModal(true)}
                className="text-[11px] text-gray-400 hover:text-gray-600 transition-all font-medium cursor-pointer"
              >
                🔒 Acesso Restrito • Master Admin
              </button>
            </div>
          )}
        </div>
      )}

      {/* BUG-02.2 — "Quem vai acessar?": destino de "Trocar usuário", sempre
          neutro (resetSessionState já rodou antes de chegar aqui). Reaproveita
          os mesmos modais de login que a landing já usa — nenhuma navegação
          nova, nenhum formulário novo, só um ponto de entrada mais direto que
          pula a landing pública de vendas. */}
      {currentScreen === 'switch_user' && (
        <div className="min-h-screen flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 max-w-sm w-full text-center space-y-5">
            <div className="flex justify-center">
              <MaternaLogo variant="icon" size="md" />
            </div>
            <h1 className="font-serif text-xl font-bold text-gray-900">Quem vai acessar?</h1>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setShowDoctorLoginModal(true)}
                className="w-full px-4 py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white rounded-2xl text-sm font-bold transition-all cursor-pointer"
              >
                🩺 Entrar como médica/equipe
              </button>
              <button
                type="button"
                onClick={() => setShowPatientLoginModal(true)}
                className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl text-sm font-bold transition-all cursor-pointer"
              >
                👶 Entrar como paciente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PAINEL DO MÉDICO & SECRETARIA — moldura profissional (DoctorShell) */}
      {currentScreen === 'doctor_panel' && (
        <DoctorShell
          doctorProfile={currentDoctorProfile}
          userRole={userRole}
          onInstallPWA={handleInstallPWA}
          onLogout={handleLogout}
          onSwitchUser={handleSwitchUser}
          onOpenSettings={() => setShowDoctorSettingsModal(true)}
          onGoToPatientList={() => setCurrentScreen('doctor_panel')}
        >
          <DoctorPanelScreen
            currentDoctorProfile={currentDoctorProfile}
            globalConfig={globalConfig}
            doctorPanelTab={doctorPanelTab}
            setDoctorPanelTab={setDoctorPanelTab}
            patients={patients}
            userRole={userRole}
            onOpenNewPatientModal={() => setShowNewPatientModal(true)}
            onSelectPatient={(patientId) => { setSelectedPatientId(patientId); setCurrentScreen('patient_app'); }}
            blockedSlots={blockedSlots}
            onAddBlockedSlot={addBlockedSlot}
            onRemoveBlockedSlot={removeBlockedSlot}
            onOpenConfirmModal={(app, pat) => setSelectedAppointmentForConfirm({ app, pat })}
            onRegistrarAtendimento={handleAbrirRegistroAtendimento}
            saveToFirestore={saveToFirestore}
          />
        </DoctorShell>
      )}

      {/* 3. ÁREA DA PACIENTE — a moldura depende de QUEM está olhando, não só
          da tela: a equipe navegando o prontuário de uma paciente continua
          com o shell profissional (DoctorShell), inclusive o atalho de volta
          pra Lista de Pacientes — sem isso ela ficaria sem rota de volta. A
          própria gestante (UX-06.4) não tem mais shell/header nenhum aqui —
          a tela dela começa direto pela saudação de PatientHome; Instalar e
          Sair vão como prop pro próprio PatientAppScreen, que os move pro
          menu "Mais"/barra lateral dela. */}
      {currentScreen === 'patient_app' && userRole === 'paciente' && (
        <PatientAppScreen
          currentPatient={currentPatient}
          doctorProfile={patientDoctorProfile}
          currentGest={currentGest}
          userRole={userRole}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          showMoreSheet={showMoreSheet}
          setShowMoreSheet={setShowMoreSheet}
          nextAppointment={nextAppointment}
          examAlerts={examAlerts}
          referenciaGPG={referenciaGPG}
          patients={patients}
          saveToFirestore={saveToFirestore}
          setShowRequestAppointmentModal={setShowRequestAppointmentModal}
          setShowAddAgendaModal={setShowAddAgendaModal}
          setEditProfileData={setEditProfileData}
          setShowEditProfileModal={setShowEditProfileModal}
          setEditVacinasData={setEditVacinasData}
          setShowEditVacinasModal={setShowEditVacinasModal}
          setEditExamesData={setEditExamesData}
          setShowEditExamesModal={setShowEditExamesModal}
          setSelectedAppointmentForConfirm={setSelectedAppointmentForConfirm}
          onAbrirNovaEvolucao={handleAbrirNovaEvolucao}
          onEditarEvolucao={handleEditarEvolucao}
          onAbrirNovaSolicitacao={handleAbrirNovaSolicitacao}
          handleCalculateUsg={handleCalculateUsg}
          calcUsgData={calcUsgData}
          setCalcUsgData={setCalcUsgData}
          calcUsgSemanas={calcUsgSemanas}
          setCalcUsgSemanas={setCalcUsgSemanas}
          calcUsgDias={calcUsgDias}
          setCalcUsgDias={setCalcUsgDias}
          calcResultado={calcResultado}
          setShowUploadExamModal={setShowUploadExamModal}
          onInstallPWA={handleInstallPWA}
          onLogout={handleLogout}
          onSwitchUser={handleSwitchUser}
        />
      )}

      {currentScreen === 'patient_app' && (userRole === 'medica' || userRole === 'secretaria') && (
        <DoctorShell
          doctorProfile={currentDoctorProfile}
          userRole={userRole}
          onInstallPWA={handleInstallPWA}
          onLogout={handleLogout}
          onSwitchUser={handleSwitchUser}
          onOpenSettings={() => setShowDoctorSettingsModal(true)}
          onGoToPatientList={() => setCurrentScreen('doctor_panel')}
        >
          <PatientAppScreen
            currentPatient={currentPatient}
            doctorProfile={patientDoctorProfile}
            currentGest={currentGest}
            userRole={userRole}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            showMoreSheet={showMoreSheet}
            setShowMoreSheet={setShowMoreSheet}
            nextAppointment={nextAppointment}
            examAlerts={examAlerts}
            referenciaGPG={referenciaGPG}
            patients={patients}
            saveToFirestore={saveToFirestore}
            setShowRequestAppointmentModal={setShowRequestAppointmentModal}
            setShowAddAgendaModal={setShowAddAgendaModal}
            setEditProfileData={setEditProfileData}
            setShowEditProfileModal={setShowEditProfileModal}
            setEditVacinasData={setEditVacinasData}
            setShowEditVacinasModal={setShowEditVacinasModal}
            setEditExamesData={setEditExamesData}
            setShowEditExamesModal={setShowEditExamesModal}
            setSelectedAppointmentForConfirm={setSelectedAppointmentForConfirm}
            onAbrirNovaEvolucao={handleAbrirNovaEvolucao}
            onEditarEvolucao={handleEditarEvolucao}
            onAbrirNovaSolicitacao={handleAbrirNovaSolicitacao}
            handleCalculateUsg={handleCalculateUsg}
            calcUsgData={calcUsgData}
            setCalcUsgData={setCalcUsgData}
            calcUsgSemanas={calcUsgSemanas}
            setCalcUsgSemanas={setCalcUsgSemanas}
            calcUsgDias={calcUsgDias}
            setCalcUsgDias={setCalcUsgDias}
            calcResultado={calcResultado}
            setShowUploadExamModal={setShowUploadExamModal}
          />
        </DoctorShell>
      )}

      {/* 4. PAINEL MASTER ADMIN */}
      {currentScreen === 'master_admin' && (
        <AdminMasterDashboard
          doctors={saasDoctors}
          globalConfig={globalConfig}
          onSaveDoctors={saveSaasDoctorsToFirestore}
          onSaveGlobalConfig={handleSaveGlobalConfig}
          onLogout={handleLogout}
        />
      )}

      {/* MODAL CONFIGURAÇÕES DO CONSULTÓRIO (WHITE LABEL) */}
      <DoctorSettingsModal
        isOpen={showDoctorSettingsModal}
        onClose={() => setShowDoctorSettingsModal(false)}
        currentDoctor={currentDoctorProfile}
        globalConfig={globalConfig}
        secretaries={secretaries}
        onSaveSecretaries={saveSecretaries}
        onSave={async (updatedDoctor) => {
          setCurrentDoctorProfile(updatedDoctor);
          const updatedList = saasDoctors.map(d => d.id === updatedDoctor.id ? updatedDoctor : d);
          await saveSaasDoctorsToFirestore(updatedList);
          setShowDoctorSettingsModal(false);
        }}
        examAIConfig={examAIConfig}
        examAIConfigStatus={examAIConfigStatus}
        onSaveExamAIConfig={salvarConfigExamesIA}
      />

      {/* MODAL TRIAL 14 DIAS */}
      <DoctorTrialSignupModal
        isOpen={showDoctorTrialModal}
        onClose={() => setShowDoctorTrialModal(false)}
        onSuccess={async (newDoctor) => {
          await saveSaasDoctorsToFirestore([newDoctor, ...saasDoctors]);
          setCurrentDoctorProfile(newDoctor);
          setUserRole('medica');
          setCurrentScreen('doctor_panel');
          // BUG-01.1 — achado colateral: este sucesso nunca fechava o próprio
          // modal (isOpen ficava true mesmo depois de navegar pra
          // doctor_panel) — sem fechar, hasOverlayOpen nunca cairia e o Back
          // ficaria preso tentando fechar um modal que já devia ter sumido.
          // Fora do escopo original do BUG-01.1 corrigir isso a fundo, mas é
          // o mínimo necessário pra este caminho de login funcionar com o
          // modelo de Back.
          setShowDoctorTrialModal(false);
          backNavRef.current.resetToRest();
        }}
      />

      {/* MODAL SOLICITAÇÃO PACIENTE */}
      <RequestAppointmentModal
        isOpen={showRequestAppointmentModal}
        onClose={() => setShowRequestAppointmentModal(false)}
        enderecoPadrao={currentDoctorProfile.enderecoConsultorio || 'Consultório Médico'}
        onRequest={async (novaSolicitacao) => {
          const updatedAgenda = [...(currentPatient.agendaConsultas || []), novaSolicitacao];
          const updated: Patient = { ...currentPatient, agendaConsultas: updatedAgenda };
          await saveToFirestore(patients.map(p => p.id === updated.id ? updated : p));
        }}
      />

      {/* MODAL GESTÃO / CONFIRMAÇÃO DA SECRETÁRIA E MÉDICA */}
      {selectedAppointmentForConfirm && (
        <AppointmentConfirmModal
          isOpen={!!selectedAppointmentForConfirm}
          onClose={() => setSelectedAppointmentForConfirm(null)}
          appointment={selectedAppointmentForConfirm.app}
          patient={selectedAppointmentForConfirm.pat}
          onSave={async (updatedApp, notifyWhatsApp) => {
            // Antes de confirmar/encaixar num horário real, garante que ele
            // não caiu num bloqueio da médica criado nesse meio-tempo — não
            // grava nada e devolve o erro pro modal não fechar sozinho,
            // pra secretária poder escolher outro horário sem perder o que
            // já tinha preenchido.
            if (updatedApp.status === 'confirmada' || updatedApp.status === 'encaixe_urgente') {
              const bloqueio = encontrarBloqueioConflitante(updatedApp.data, updatedApp.horario, blockedSlots);
              if (bloqueio) {
                alert(mensagemBloqueioAgenda(bloqueio));
                throw new Error('Horário bloqueado na agenda.');
              }
            }

            const updatedAgenda = selectedAppointmentForConfirm.pat.agendaConsultas.map(a =>
              a.id === updatedApp.id ? updatedApp : a
            );
            const updatedPat: Patient = { ...selectedAppointmentForConfirm.pat, agendaConsultas: updatedAgenda };
            await saveToFirestore(patients.map(p => p.id === updatedPat.id ? updatedPat : p));

            if (notifyWhatsApp && updatedApp.status === 'confirmada') {
              const zapLink = generateAppointmentReminderLink(updatedPat, updatedApp);
              window.open(zapLink, '_blank');
            }
          }}
        />
      )}

      {/* MODAIS DO SISTEMA */}
      <AppModals
        showInstallModal={showInstallModal}
        setShowInstallModal={setShowInstallModal}
        isIOS={isIOS}
        handleGooglePatientLogin={handleGooglePatientLogin}
        showEditProfileModal={showEditProfileModal}
        setShowEditProfileModal={setShowEditProfileModal}
        editProfileData={editProfileData}
        setEditProfileData={setEditProfileData}
        handleSaveProfile={handleSaveProfile}
        handleResetPatientPin={handleResetPatientPin}
        showEditVacinasModal={showEditVacinasModal}
        setShowEditVacinasModal={setShowEditVacinasModal}
        editVacinasData={editVacinasData}
        setEditVacinasData={setEditVacinasData}
        handleSaveVacinas={handleSaveVacinas}
        showEditExamesModal={showEditExamesModal}
        setShowEditExamesModal={setShowEditExamesModal}
        editExamesData={editExamesData}
        setEditExamesData={setEditExamesData}
        handleSaveTabelaExames={handleSaveTabelaExames}
        LISTA_EXAMES_OFICIAIS={LISTA_EXAMES_OFICIAIS}
        showAddAgendaModal={showAddAgendaModal}
        setShowAddAgendaModal={setShowAddAgendaModal}
        newAgenda={newAgenda}
        setNewAgenda={setNewAgenda}
        handleAddAgenda={handleAddAgenda}
        showUploadExamModal={showUploadExamModal}
        setShowUploadExamModal={setShowUploadExamModal}
        examName={examName}
        setExamName={setExamName}
        examCategory={examCategory}
        setExamCategory={setExamCategory}
        setSelectedFile={setSelectedFile}
        isUploading={isUploading}
        handleFileUpload={handleFileUpload}
        showAddConsultaModal={showAddConsultaModal}
        setShowAddConsultaModal={setShowAddConsultaModal}
        newConsulta={newConsulta}
        setNewConsulta={setNewConsulta}
        handleAddConsulta={handleAddConsulta}
        consultaAgendaContexto={consultaAgendaVinculada ? {
          pacienteNome: consultaAgendaVinculada.pat.nome,
          data: consultaAgendaVinculada.app.data,
          horario: consultaAgendaVinculada.app.horario
        } : null}
        isEditingConsulta={!!editingConsultaId}
        igAutomatica={calculateWeeksAndDays(pacienteParaConsulta.dum, newConsulta.data)}
        onCancelarConsulta={handleCancelarConsulta}
        prescricoesRascunho={prescricoesRascunho}
        examesRascunho={examesRascunho}
        onAdicionarPrescricao={handleAdicionarPrescricao}
        onRemoverPrescricao={handleRemoverPrescricao}
        onAdicionarExameSolicitado={handleAdicionarExameSolicitado}
        onRemoverExameSolicitado={handleRemoverExameSolicitado}
        solicitacaoExistenteDoAtendimento={solicitacaoExistenteDoAtendimento}
        showSolicitacaoModal={showSolicitacaoModal}
        onCancelarSolicitacao={handleCancelarSolicitacao}
        onSalvarSolicitacao={handleSalvarSolicitacao}
        showNewPatientModal={showNewPatientModal}
        setShowNewPatientModal={setShowNewPatientModal}
        newPatient={newPatient}
        setNewPatient={setNewPatient}
        handleCreatePatient={handleCreatePatient}
        showPatientLoginModal={showPatientLoginModal}
        setShowPatientLoginModal={setShowPatientLoginModal}
        loginCpf={loginCpf}
        setLoginCpf={setLoginCpf}
        loginSenha={loginSenha}
        setLoginSenha={setLoginSenha}
        handlePatientLogin={handlePatientLogin}
        loginRole={loginRole}
        setLoginRole={setLoginRole}
        showDoctorLoginModal={showDoctorLoginModal}
        setShowDoctorLoginModal={setShowDoctorLoginModal}
        doctorEmail={doctorEmail}
        setDoctorEmail={setDoctorEmail}
        doctorPassword={doctorPassword}
        setDoctorPassword={setDoctorPassword}
        handleDoctorLogin={handleDoctorLogin}
        handleGoogleDoctorLogin={handleGoogleDoctorLogin}
        showMasterLoginModal={showMasterLoginModal}
        setShowMasterLoginModal={setShowMasterLoginModal}
        masterEmail={masterEmail}
        setMasterEmail={setMasterEmail}
        masterPassword={masterPassword}
        setMasterPassword={setMasterPassword}
        handleMasterLogin={handleMasterLogin}
        loginError={loginError}
        resetMessage={resetMessage}
        handlePasswordReset={handlePasswordReset}
      />
      {/* MODAL DE VALIDAÇÃO DE DOIS FATORES (A2F) */}
      {pendingTwoFactorUser && (
        <TwoFactorVerifyModal
          isOpen={showTwoFactorModal}
          onClose={() => {
            setShowTwoFactorModal(false);
            setPendingTwoFactorUser(null);
          }}
          twoFactorConfig={pendingTwoFactorUser.config}
          userEmail={pendingTwoFactorUser.profile.email}
          onSuccess={() => {
            setCurrentDoctorProfile(pendingTwoFactorUser.profile);
            setUserRole(pendingTwoFactorUser.role);
            setCurrentScreen('doctor_panel');
            setShowTwoFactorModal(false);
            setPendingTwoFactorUser(null);
            backNavRef.current.resetToRest();
          }}
        />
      )}

      {/* CARTEIRINHA DE IMPRESSÃO */}
      {currentPatient && (
        <PrintableCarteirinha 
          patient={currentPatient} 
          weeks={currentGest.weeks} 
        />
      )}

    </div>
  );
}
