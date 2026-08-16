import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, Upload, Plus, LogOut, Printer, Syringe, UserPlus, Calculator, AlertCircle, 
  Edit3, Bot, MapPin, CalendarPlus, Calendar, Smartphone, WifiOff, Share2, Send, Settings, Check 
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, signInWithPopup } from 'firebase/auth';

import { Patient, initialPatientsList, AgendaConsulta, HorarioBloqueado, UserRole } from './types/prenatal';
import { DoctorTenant, ClinicSecretary } from './types/saas';
import { ClinicScheduleManager } from './components/ClinicScheduleManager';

import { db, auth, googleProvider } from './firebase';

import { AppModals } from './components/AppModals';
import { PrintableCarteirinha } from './components/PrintableCarteirinha';
import { LandingPage } from './components/LandingPage';
import { AdminMasterDashboard } from './components/AdminMasterDashboard';
import { DoctorSettingsModal } from './components/DoctorSettingsModal';
import { DoctorTrialSignupModal } from './components/DoctorTrialSignupModal';
import { RequestAppointmentModal } from './components/RequestAppointmentModal';
import { AppointmentConfirmModal } from './components/AppointmentConfirmModal';
import { MaternaLogo } from './components/MaternaLogo';
import { AdBanner } from './components/AdBanner';
import { PrenatalChatTab } from './components/PrenatalChatTab';
import { Tooltip } from './components/Tooltip';

import { formatDateDisplay, formatDateBR, calculateWeeksAndDays, fileToBase64 } from './utils/formatters';
import { generateAppointmentReminderLink, generateConsultationSummaryLink, sharePatientCard } from './utils/whatsapp';
import { processExamWithGeminiIA } from './services/geminiService';
import { hasPermission } from './utils/rbac';

const SUPER_ADMIN_EMAILS = ['admin@maternaia.com.br', 'andrereu@gmail.com'];

const LISTA_EXAMES_OFICIAIS = [
  { id: 'hbVg', label: 'HB / VG', placeholder: 'Ex: 12.5 g/dL / 38%' },
  { id: 'plaquetas', label: 'PLAQUETAS', placeholder: 'Ex: 240.000 /mm³' },
  { id: 'glicemiaTotg', label: 'GLICEMIA / TOTG', placeholder: 'Ex: 85 mg/dL' },
  { id: 'htlv', label: 'HTLV', placeholder: 'Ex: Não Reagente' },
  { id: 'hiv', label: 'HIV', placeholder: 'Ex: Não Reagente' },
  { id: 'sifilis', label: 'SÍFILIS', placeholder: 'Ex: Não Reagente (VDRL)' },
  { id: 'hbsag', label: 'HBsAG / Anti-HBS', placeholder: 'Ex: Não Reagente' },
  { id: 'tsh', label: 'TSH', placeholder: 'Ex: 1.8 mIU/L' },
  { id: 'antiHcv', label: 'Anti-HCV', placeholder: 'Ex: Não Reagente' },
  { id: 'rubeola', label: 'RUBÉOLA', placeholder: 'Ex: IgG Imune / IgM-' },
  { id: 'cmv', label: 'CMV', placeholder: 'Ex: IgG Imune / IgM-' },
  { id: 'toxo', label: 'TOXO', placeholder: 'Ex: IgG+ IgM-' },
  { id: 'vitD', label: 'VITAMINA D', placeholder: 'Ex: 35 ng/mL' },
  { id: 'ferritina', label: 'FERRITINA', placeholder: 'Ex: 60 ng/mL' },
  { id: 'vitB12', label: 'VITAMINA B12', placeholder: 'Ex: 450 pg/mL' },
  { id: 'urinaUrocultura', label: 'URINA / UROCULTURA', placeholder: 'Ex: Normal / Sem germes' },
  { id: 'gbs', label: 'GBS (35-37 sem)', placeholder: 'Ex: Negativo / Positivo' }
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'doctor_panel' | 'patient_app' | 'master_admin'>('landing');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loginRole, setLoginRole] = useState<'medica' | 'secretaria'>('medica');
  const [doctorPanelTab, setDoctorPanelTab] = useState<'pacientes' | 'agenda_geral'>('pacientes');
  const [secretaries, setSecretaries] = useState<ClinicSecretary[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<HorarioBloqueado[]>([]);

  const [saasDoctors, setSaasDoctors] = useState<DoctorTenant[]>([]);
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
    totalPacientes: 42,
    dataCadastro: '2026-01-01',
    valorMensalidade: 89.0,
    metodoPagamento: 'pix'
  });

  const [patients, setPatients] = useState<Patient[]>(initialPatientsList);
  const [selectedPatientId, setSelectedPatientId] = useState("gestante-01");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState('resumo');

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const [showPatientLoginModal, setShowPatientLoginModal] = useState(false);
  const [showDoctorLoginModal, setShowDoctorLoginModal] = useState(false);
  const [showMasterLoginModal, setShowMasterLoginModal] = useState(false);
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

  const [doctorEmail, setDoctorEmail] = useState("");
  const [doctorPassword, setDoctorPassword] = useState("");
  const [masterEmail, setMasterEmail] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [loginCpf, setLoginCpf] = useState("");
  const [loginError, setLoginError] = useState("");

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

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const userEmail = currentUser.email?.toLowerCase().trim() || '';
        if (SUPER_ADMIN_EMAILS.includes(userEmail)) {
          setUserRole('medica');
          setCurrentScreen('master_admin');
        } else {
          setUserRole('medica');
          setCurrentScreen('doctor_panel');
        }
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    try {
      const docRef = doc(db, "prenatal", "lista_pacientes");
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists() && snapshot.data().lista) {
          setPatients(snapshot.data().lista);
        } else {
          setDoc(docRef, { lista: initialPatientsList }).catch(console.error);
        }
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn("Modo offline:", err);
    }
  }, []);

  useEffect(() => {
    try {
      const docRef = doc(db, "saas_config", "medicos_cadastrados");
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists() && snapshot.data().lista) {
          setSaasDoctors(snapshot.data().lista);
          const found = snapshot.data().lista.find((d: DoctorTenant) => d.id === 'doc-priscila');
          if (found) setCurrentDoctorProfile(found);
        } else {
          const initialDoc: DoctorTenant[] = [
            {
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
              totalPacientes: 42,
              dataCadastro: '2026-01-01',
              valorMensalidade: 89.0,
              metodoPagamento: 'pix'
            }
          ];
          setDoc(docRef, { lista: initialDoc }).catch(console.error);
        }
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn("Modo offline SaaS:", err);
    }
  }, []);

  const saveSaasDoctorsToFirestore = async (updatedList: DoctorTenant[]) => {
    setSaasDoctors(updatedList);
    try {
      const docRef = doc(db, "saas_config", "medicos_cadastrados");
      await setDoc(docRef, { lista: updatedList }, { merge: true });
    } catch (err) {
      console.error("Erro ao salvar médicos no Firestore:", err);
    }
  };

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

  const saveToFirestore = async (updatedList: Patient[]) => {
    setPatients(updatedList);
    try {
      const docRef = doc(db, "prenatal", "lista_pacientes");
      await setDoc(docRef, { lista: updatedList }, { merge: true });
    } catch (err) {
      console.error("Erro ao salvar no Firestore:", err);
    }
  };

  const currentPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId) || patients[0];
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

  const handleDoctorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, doctorEmail.trim(), doctorPassword);
      setUserRole('medica');
      setCurrentScreen('doctor_panel');
      setShowDoctorLoginModal(false);
    } catch (err) {
      setLoginError("E-mail ou senha incorretos.");
    }
  };

  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const emailNorm = masterEmail.toLowerCase().trim();

    try {
      await signInWithEmailAndPassword(auth, emailNorm, masterPassword);
      if (SUPER_ADMIN_EMAILS.includes(emailNorm)) {
        setUserRole('medica');
        setCurrentScreen('master_admin');
        setShowMasterLoginModal(false);
      } else {
        setLoginError("Acesso negado: este e-mail não possui permissões de Super Admin.");
        await signOut(auth);
      }
    } catch (err) {
      setLoginError("E-mail ou senha de administrador incorretos.");
    }
  };

  const handleGooglePatientLogin = async () => {
    setLoginError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userEmail = user.email?.toLowerCase().trim();

      if (!userEmail) {
        setLoginError("Não foi possível obter o e-mail da sua conta Google.");
        return;
      }

      const matched = patients.find(
        (p) => p.email && p.email.toLowerCase().trim() === userEmail
      );

      if (matched) {
        setSelectedPatientId(matched.id);
        setUserRole('paciente');
        setCurrentScreen('patient_app');
        setShowPatientLoginModal(false);
      } else {
        setLoginError(
          `O e-mail ${userEmail} ainda não está vinculado a nenhum pré-natal cadastrado. Peça à sua médica para incluir seu e-mail no cadastro.`
        );
      }
    } catch (err: any) {
      console.error("Erro no login Google:", err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setLoginError("Erro ao autenticar com o Google. Tente novamente.");
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUserRole(null);
    setCurrentScreen('landing');
  };

  const handlePatientLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = patients.find(p => p.cpf.replace(/\D/g, '') === loginCpf.replace(/\D/g, ''));
    if (matched) {
      setSelectedPatientId(matched.id);
      setUserRole('paciente');
      setCurrentScreen('patient_app');
      setShowPatientLoginModal(false);
    } else {
      setLoginError("CPF não encontrado.");
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Por favor, selecione um arquivo.");
      return;
    }

    setIsUploading(true);

    try {
      const base64Content = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type || "image/jpeg";

      const resultIA = await processExamWithGeminiIA(base64Content, mimeType, examCategory, examName);

      const novoExame = {
        id: `ex-${Date.now()}`,
        nome: examName || selectedFile.name,
        tipo: examCategory,
        dataUpload: new Date().toISOString().split('T')[0],
        fileData: base64Content,
        resumoIA: resultIA.resumoIA,
        notaDra: resultIA.notaDra,
        enviadoPor: userRole === 'medica' ? currentDoctorProfile.nome : "Paciente"
      };

      let currentExamesTab = { ...(currentPatient.examesTabela || {}) };
      if (resultIA.examesExtraidos && Object.keys(resultIA.examesExtraidos).length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        Object.entries(resultIA.examesExtraidos).forEach(([k, val]: any) => {
          if (val && typeof val === 'string' && val.trim() !== '') {
            currentExamesTab[k] = {
              ...(currentExamesTab[k] || { d1: '', r1: '', d2: '', r2: '' }),
              d1: currentExamesTab[k]?.d1 || todayStr,
              r1: val.trim()
            };
          }
        });
      }

      const updated: Patient = { 
        ...currentPatient, 
        examesTabela: currentExamesTab,
        examesEnviados: [novoExame, ...(currentPatient.examesEnviados || [])] 
      };
      
      await saveToFirestore(patients.map(p => p.id === updated.id ? updated : p));

      setIsUploading(false);
      setShowUploadExamModal(false);
      setSelectedFile(null);
      setExamName("");
    } catch (err) {
      console.error("Erro no processamento:", err);
      alert("Erro ao processar arquivo.");
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

    const novoObjetoPaciente: Patient = {
      id: `gestante-${Date.now()}`,
      cpf: newPatient.cpf || "000.000.000-00",
      telefone: newPatient.telefone || "",
      senhaAcc: "1234",
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

  const filteredPatients = useMemo(() => {
    if (!searchQuery) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(p => p.nome.toLowerCase().includes(q) || p.cpf.includes(q));
  }, [patients, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F4F6F2] text-gray-800 font-sans pb-12 print:bg-white print:pb-0">
      
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

            {/* CABEÇALHO */}
      <header className="bg-[#2E482A] text-white shadow-md sticky top-0 z-40 border-b border-[#3D5C38] print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          
          {/* LOGO / NOME DO CONSULTÓRIO (Navegação contextual) */}
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
            {currentScreen === 'landing' || currentScreen === 'master_admin' ? (
              <MaternaLogo variant="full" theme="light" size="md" />
            ) : (
              <div className="flex items-center gap-3">
                {currentDoctorProfile.logoUrl ? (
                  <img src={currentDoctorProfile.logoUrl} alt="Logo" className="w-9 h-9 rounded-xl object-contain bg-white/10 p-0.5 border border-white/20" />
                ) : (
                  <MaternaLogo variant="icon" size="sm" />
                )}
                <div>
                  <h1 className="font-serif text-base md:text-lg font-bold text-[#E8ECD8] leading-none">
                    {currentDoctorProfile.nome}
                  </h1>
                  <p className="text-[9px] uppercase tracking-widest text-[#A3B18A] font-medium mt-0.5">
                    {currentDoctorProfile.especialidade || 'OBSTETRA'} • CRM {currentDoctorProfile.crm}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Botão de Início quando estiver navegando dentro do app */}
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
              className="bg-[#D4AF37] hover:bg-amber-400 text-gray-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
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

            {currentScreen === 'landing' && (
              <>
                <button 
                  onClick={() => setShowPatientLoginModal(true)} 
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  👶 Sou Gestante
                </button>
                <button 
                  onClick={() => setShowDoctorLoginModal(true)} 
                  className="bg-[#D4AF37] hover:bg-amber-400 text-gray-900 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  🩺 Acesso Profissional
                </button>
              </>
            )}
          </div>
        </div>
      </header>


      {/* 1. LANDING PAGE PRINCIPAL */}
      {currentScreen === 'landing' && (
        <div className="space-y-6">
          <LandingPage
            onOpenPatientLogin={() => setShowPatientLoginModal(true)}
            onOpenDoctorLogin={() => setShowDoctorLoginModal(true)}
            onOpenTrialModal={() => setShowDoctorTrialModal(true)}
            onInstallPWA={handleInstallPWA}
          />
          <div className="text-center pb-8 print:hidden">
            <button
              onClick={() => setShowMasterLoginModal(true)}
              className="text-[11px] text-gray-400 hover:text-gray-600 transition-all font-medium cursor-pointer"
            >
              🔒 Acesso Restrito • Master Admin
            </button>
          </div>
        </div>
      )}

      {/* 2. PAINEL DO MÉDICO & SECRETARIA */}
      {currentScreen === 'doctor_panel' && (
        <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6 print:hidden">
          {/* SELETOR DE ABAS DA CLÍNICA */}
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <button
              onClick={() => setDoctorPanelTab('pacientes')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                doctorPanelTab === 'pacientes' ? 'bg-[#2E482A] text-white shadow-xs' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Gestantes Cadastradas ({patients.length})
            </button>
            <button
              onClick={() => setDoctorPanelTab('agenda_geral')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                doctorPanelTab === 'agenda_geral' ? 'bg-[#2E482A] text-white shadow-xs' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              📅 Central da Agenda & Recepção
            </button>
          </div>

          {/* ABA 1: LISTA DE GESTANTES */}
          {doctorPanelTab === 'pacientes' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Gestantes Cadastradas</h2>
                  <p className="text-xs text-gray-500">Acesse ou cadastre novas pacientes no banco de dados</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Buscar paciente por nome ou CPF..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 text-xs p-2.5 border rounded-xl"
                  />

                  {hasPermission(userRole, 'canManageSchedule') && (
                    <button 
                      onClick={() => setShowDoctorSettingsModal(true)} 
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border border-gray-200"
                      title="Configurar Logo, CRM e endereço do consultório"
                    >
                      <Settings className="w-4 h-4 text-[#2E482A]" /> Configurar Consultório
                    </button>
                  )}

                  {hasPermission(userRole, 'canManageBasicPatientData') && (
                    <button 
                      onClick={() => setShowNewPatientModal(true)} 
                      className="bg-[#2E482A] hover:bg-[#233820] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" /> + Cadastrar Gestante
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPatients.map((pat) => (
                  <div key={pat.id} className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">CPF: {pat.cpf}</span>
                      <h3 className="font-bold text-gray-900 text-base">{pat.nome}</h3>
                      <p className="text-xs text-gray-600 mt-1">
                        Bebê: <strong>{pat.nomeBebe}</strong> • 
                        <span className="inline-flex items-center ml-1">
                          DPP: {new Date(pat.dpp).toLocaleDateString('pt-BR')}
                        </span>
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        G{pat.g} P{pat.p} C{pat.c} A{pat.a} • WhatsApp: {pat.telefone || 'Não informado'}
                      </p>
                    </div>
                    <button 
                      onClick={() => { setSelectedPatientId(pat.id); setCurrentScreen('patient_app'); }} 
                      className="px-4 py-2.5 bg-[#2E482A] text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                    >
                      Abrir Cartão
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 2: CENTRAL DA AGENDA & RECEPÇÃO */}
          {doctorPanelTab === 'agenda_geral' && (
            <ClinicScheduleManager
              patients={patients}
              blockedSlots={blockedSlots}
              onAddBlockedSlot={async (newSlot) => setBlockedSlots([...blockedSlots, newSlot])}
              onRemoveBlockedSlot={async (id) => setBlockedSlots(blockedSlots.filter(b => b.id !== id))}
              onOpenConfirmModal={(app, pat) => setSelectedAppointmentForConfirm({ app, pat })}
              onQuickStatusChange={async (patientId, appointmentId, newStatus) => {
                const targetPat = patients.find(p => p.id === patientId);
                if (!targetPat) return;
                const updatedAgenda = (targetPat.agendaConsultas || []).map(a => 
                  a.id === appointmentId ? { ...a, status: newStatus } : a
                );
                const updated = { ...targetPat, agendaConsultas: updatedAgenda };
                await saveToFirestore(patients.map(p => p.id === updated.id ? updated : p));
              }}
            />
          )}
        </div>
      )}

      {/* 3. ÁREA DA PACIENTE */}
      {currentScreen === 'patient_app' && (
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

          {/* LISTA DE ABAS */}
          <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200 flex overflow-x-auto gap-1 print:hidden">
            {[
              { id: 'resumo', label: 'Resumo', allowed: true },
              { id: 'dados', label: 'Dados Clínicos & GPCA', allowed: hasPermission(userRole, 'canViewClinicalHistory') },
              { id: 'vacinas', label: 'Vacinas', allowed: true },
              { id: 'examesTabela', label: 'Exames Laboratoriais', allowed: hasPermission(userRole, 'canViewExamReports') },
              { id: 'agenda', label: 'Agenda & Lembretes', allowed: true },
              { id: 'graficos', label: 'Gráfico GPG (MS)', allowed: true },
              { id: 'calculadora', label: 'Calculadora Gestacional', allowed: true },
              { id: 'chatIA', label: '💬 Assistente Pré-Natal (IA)', allowed: hasPermission(userRole, 'canUseMedicalAI') },
              { id: 'consultas', label: 'Consultas', allowed: hasPermission(userRole, 'canViewClinicalHistory') },
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
              <div className="bg-gradient-to-br from-[#2E482A] to-[#1E311B] text-white p-6 rounded-3xl shadow-md">
                <blockquote className="font-serif italic text-lg leading-relaxed text-[#F4F6F0]">
                  "Antes de você existir eu já te queria, antes de você nascer eu já te amava, em menos de um minuto de nascido já daria minha vida por você."
                </blockquote>
                <p className="mt-3 text-xs font-bold text-[#E8ECD8]">{currentDoctorProfile.nome} • CRM {currentDoctorProfile.crm}</p>
              </div>

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
                    {hasPermission(userRole, 'canManageSchedule') && (
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
                  {hasPermission(userRole, 'canManageSchedule') && (
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

                  {hasPermission(userRole, 'canManageSchedule') && (
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

                        {hasPermission(userRole, 'canManageSchedule') && (
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
                    {ex.fileData && <img src={ex.fileData} alt={ex.nome} className="max-h-68 rounded-xl object-contain border bg-black/5 p-1" />}
                    <div className="bg-pink-50/80 p-3.5 rounded-xl text-xs text-gray-800 whitespace-pre-line border border-pink-200">{ex.resumoIA}</div>
                    <div className="bg-emerald-50/80 p-3.5 rounded-xl text-xs text-gray-900 whitespace-pre-line border border-emerald-200">{ex.notaDra}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. PAINEL SUPER ADMIN MASTER */}
      {currentScreen === 'master_admin' && (
        <AdminMasterDashboard 
          doctors={saasDoctors}
          onSaveDoctors={saveSaasDoctorsToFirestore}
          onLogout={() => setCurrentScreen('landing')}
        />
      )}

            {/* MODAL CONFIGURAÇÕES DO CONSULTÓRIO (WHITE LABEL) */}
      <DoctorSettingsModal
        isOpen={showDoctorSettingsModal}
        onClose={() => setShowDoctorSettingsModal(false)}
        currentDoctor={currentDoctorProfile}
        secretaries={secretaries}
        onSaveSecretaries={async (updatedSecs) => {
          setSecretaries(updatedSecs);
          try {
            await setDoc(doc(db, "saas_config", `secretarias_${currentDoctorProfile.id}`), { lista: updatedSecs });
          } catch (err) {
            console.error("Erro ao salvar secretárias:", err);
          }
        }}
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
        showMasterLoginModal={showMasterLoginModal}
        setShowMasterLoginModal={setShowMasterLoginModal}
        masterEmail={masterEmail}
        setMasterEmail={setMasterEmail}
        masterPassword={masterPassword}
        setMasterPassword={setMasterPassword}
        handleMasterLogin={handleMasterLogin}
        loginError={loginError}
      />

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
