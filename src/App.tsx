import React, { useState, useEffect, useMemo } from 'react';
import { LogOut, Smartphone, WifiOff } from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';

import type { Patient, AgendaConsulta, HorarioBloqueado, ResultadoExame } from './types/prenatal';
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
import { PatientShell } from './components/PatientShell';
import { DoctorShell } from './components/DoctorShell';

import { calculateWeeksAndDays, fileToBase64 } from './utils/formatters';
import { generateAppointmentReminderLink } from './utils/whatsapp';
import { generatePatientPin } from './utils/pin';
import { processExamWithGeminiIA } from './services/geminiService';
import { useDoctorsDirectory } from './hooks/useDoctorsDirectory';
import { usePatients } from './hooks/usePatients';
import { useSecretaries } from './hooks/useSecretaries';
import { useAuthSession } from './hooks/useAuthSession';
import { useBrandTheme } from './hooks/useBrandTheme';
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

  const [blockedSlots, setBlockedSlots] = useState<HorarioBloqueado[]>([]);

  const [currentDoctorProfile, setCurrentDoctorProfile] = useState<DoctorTenant>({
    id: 'doc-priscila',
    nome: 'Dra. Priscila Gapski',
    email: 'dra.priscila@maternaia.com.br',
    crm: '24734-PR',
    telefone: '(41) 99999-8888',
    clinicaNome: 'Consultório Dra. Priscila Gapski',
    especialidade: 'Ginecologia & Obstetrícia',
    enderecoConsultorio: 'Curitiba - PR',
    plano: 'individual_pro',
    status: 'active',
    trialEndsAt: '2027-12-31',
    diasRestantes: 365,
    totalPacientes: 1,
    dataCadastro: '2026-01-01',
    valorMensalidade: 89.0,
    metodoPagamento: 'pix'
  });

  const [selectedPatientId, setSelectedPatientId] = useState("gestante-01");
  const [selectedPatientDoctorId, setSelectedPatientDoctorId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('resumo');

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const [showDoctorTrialModal, setShowDoctorTrialModal] = useState(false);
  const [showDoctorSettingsModal, setShowDoctorSettingsModal] = useState(false);

  const [showAddConsultaModal, setShowAddConsultaModal] = useState(false);
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

  const [newAgenda, setNewAgenda] = useState({
    data: new Date().toISOString().split('T')[0],
    horario: '14:00',
    tipo: 'Consulta Pré-Natal de Rotina',
    local: 'Consultório Dra. Priscila Gapski',
    observacoes: ''
  });

  const [newPatient, setNewPatient] = useState({
    nome: '', cpf: '', telefone: '', idade: '28', pai: '', nomeBebe: '',
    dum: new Date().toISOString().split('T')[0],
    pesoInicial: '60.0', altura: '1.65', tipoSanguineo: 'O+', doencasPrevias: '',
    g: '1', p: '0', c: '0', a: '0'
  });

  const [newConsulta, setNewConsulta] = useState({
    data: new Date().toISOString().split('T')[0],
    igSem: '', peso: '', pa: '120/80', au: '', bcfMf: '140 bpm / MF+', edema: 'Ausente', conduta: ''
  });

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

  // Mantém o perfil da médica de demonstração atualizado sempre que o
  // diretório de médicos mudar (comportamento igual ao de antes da divisão).
  useEffect(() => {
    const found = saasDoctors.find((d) => d.id === 'doc-priscila');
    if (found) setCurrentDoctorProfile(found);
  }, [saasDoctors]);

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
    handleLogout
  } = useAuthSession({
    saasDoctors,
    currentDoctorProfile,
    setCurrentDoctorProfile,
    setSelectedPatientId,
    setSelectedPatientDoctorId
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
    vacinas: {}, examesTabela: {}, consultasEvolucao: [], agendaConsultas: [], examesEnviados: []
  };

  const currentPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId) || patients[0] || EMPTY_PATIENT;
  }, [patients, selectedPatientId]);

  const currentGest = calculateWeeksAndDays(currentPatient.dum);

  const nextAppointment = useMemo(() => {
    if (!currentPatient.agendaConsultas || currentPatient.agendaConsultas.length === 0) return null;
    const sorted = [...currentPatient.agendaConsultas]
      .filter((a) => a.status !== 'cancelada')
      .sort((a, b) => new Date(`${a.data}T${a.horario}`).getTime() - new Date(`${b.data}T${b.horario}`).getTime());
    return sorted[0] || null;
  }, [currentPatient.agendaConsultas]);

  const bmiInfo = useMemo(() => {
    const p0 = parseFloat(currentPatient.pesoInicial) || 60;
    const h = parseFloat(currentPatient.altura) || 1.65;
    const bmi = p0 / (h * h);

    if (bmi < 18.5) {
      return { cat: 'Baixo peso (IMC < 18,5)', recom: 'Ganho Recomendado: 12,5 a 18,0 kg', bg: 'bg-blue-600' };
    } else if (bmi < 25.0) {
      return { cat: 'Adequado / Normal (IMC 18,5 a 24,9)', recom: 'Ganho Recomendado: 11,5 a 16,0 kg', bg: 'bg-emerald-600' };
    } else if (bmi < 30.0) {
      return { cat: 'Sobrepeso (IMC 25,0 a 29,9)', recom: 'Ganho Recomendado até 40 sem: 7 a 9 kg', bg: 'bg-rose-600' };
    } else {
      return { cat: 'Obesidade (IMC ≥ 30,0)', recom: 'Ganho Recomendado: 5,0 a 9,0 kg', bg: 'bg-purple-600' };
    }
  }, [currentPatient.pesoInicial, currentPatient.altura]);

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
      const resultIA = await processExamWithGeminiIA(base64Content, mimeType, examCategory, examName);

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
      data: new Date().toISOString().split('T')[0],
      horario: '14:00',
      tipo: 'Consulta Pré-Natal de Rotina',
      local: currentDoctorProfile.enderecoConsultorio || 'Consultório Dra. Priscila Gapski',
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
      examesEnviados: []
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

  const handleAddConsulta = (e: React.FormEvent) => {
    e.preventDefault();
    const sem = parseInt(newConsulta.igSem) || currentGest.weeks;
    const pesoVal = parseFloat(newConsulta.peso) || parseFloat(currentPatient.pesoInicial);

    const updatedConsultas = [
      ...currentPatient.consultasEvolucao,
      {
        id: `c-${Date.now()}`,
        data: newConsulta.data,
        igSem: sem,
        peso: pesoVal,
        pa: newConsulta.pa,
        au: newConsulta.au,
        bcfMf: newConsulta.bcfMf,
        edema: newConsulta.edema,
        conduta: newConsulta.conduta
      }
    ].sort((a, b) => a.igSem - b.igSem);

    const updated: Patient = { ...currentPatient, consultasEvolucao: updatedConsultas };
    saveToFirestore(patients.map(p => p.id === updated.id ? updated : p));
    setShowAddConsultaModal(false);
  };

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

      {/* CABEÇALHO — só sobra pra landing/master admin; paciente e área
          profissional ganharam moldura própria (PatientShell/DoctorShell,
          fase 1 da reforma App-First) mais abaixo. */}
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

      {/* 2. PAINEL DO MÉDICO & SECRETARIA — moldura profissional (DoctorShell) */}
      {currentScreen === 'doctor_panel' && (
        <DoctorShell
          doctorProfile={currentDoctorProfile}
          userRole={userRole}
          onInstallPWA={handleInstallPWA}
          onLogout={handleLogout}
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
            setBlockedSlots={setBlockedSlots}
            onOpenConfirmModal={(app, pat) => setSelectedAppointmentForConfirm({ app, pat })}
            saveToFirestore={saveToFirestore}
          />
        </DoctorShell>
      )}

      {/* 3. ÁREA DA PACIENTE — a moldura depende de QUEM está olhando, não só
          da tela: a própria gestante ganha o shell leve (PatientShell); a
          equipe navegando o prontuário de uma paciente continua com o shell
          profissional (DoctorShell), inclusive o atalho de volta pra Lista
          de Pacientes — sem isso ela ficaria sem rota de volta. */}
      {currentScreen === 'patient_app' && userRole === 'paciente' && (
        <PatientShell
          doctorProfile={patientDoctorProfile}
          onInstallPWA={handleInstallPWA}
          onLogout={handleLogout}
        >
          <PatientAppScreen
            currentPatient={currentPatient}
            doctorProfile={patientDoctorProfile}
            currentGest={currentGest}
            userRole={userRole}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            nextAppointment={nextAppointment}
            examAlerts={examAlerts}
            bmiInfo={bmiInfo}
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
            setShowAddConsultaModal={setShowAddConsultaModal}
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
        </PatientShell>
      )}

      {currentScreen === 'patient_app' && (userRole === 'medica' || userRole === 'secretaria') && (
        <DoctorShell
          doctorProfile={currentDoctorProfile}
          userRole={userRole}
          onInstallPWA={handleInstallPWA}
          onLogout={handleLogout}
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
            nextAppointment={nextAppointment}
            examAlerts={examAlerts}
            bmiInfo={bmiInfo}
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
            setShowAddConsultaModal={setShowAddConsultaModal}
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
