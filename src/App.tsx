import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, Upload, Plus, LogOut, Printer, Syringe, UserPlus, Calculator, AlertCircle, 
  Edit3, Bot, MapPin, CalendarPlus, Calendar, Smartphone, WifiOff, Share2, Send, Settings, Check, X, User, Ban, ChevronLeft, ChevronRight, List 
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, signInWithPopup } from 'firebase/auth';

import { Patient, initialPatientsList, AgendaConsulta, HorarioBloqueado, UserRole } from './types/prenatal';
import { DoctorTenant, ClinicSecretary } from './types/saas';
import { db, auth, googleProvider } from './firebase';

import { AppModals } from './components/AppModals';
import { PrintableCarteirinha } from './components/PrintableCarteirinha';
import { LandingPage } from './components/LandingPage';
import { AdminMasterDashboard } from './components/AdminMasterDashboard';
import { DoctorSettingsModal } from './components/DoctorSettingsModal';
import { DoctorTrialSignupModal } from './components/DoctorTrialSignupModal';
import { RequestAppointmentModal } from './components/RequestAppointmentModal';
import { AppointmentConfirmModal } from './components/AppointmentConfirmModal';
import { ClinicScheduleManager } from './components/ClinicScheduleManager';
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
  { id: 'hbVg', label: 'HB / VG' }, { id: 'plaquetas', label: 'PLAQUETAS' },
  { id: 'glicemiaTotg', label: 'GLICEMIA / TOTG' }, { id: 'htlv', label: 'HTLV' },
  { id: 'hiv', label: 'HIV' }, { id: 'sifilis', label: 'SÍFILIS' },
  { id: 'hbsag', label: 'HBsAG / Anti-HBS' }, { id: 'tsh', label: 'TSH' },
  { id: 'antiHcv', label: 'Anti-HCV' }, { id: 'rubeola', label: 'RUBÉOLA' },
  { id: 'cmv', label: 'CMV' }, { id: 'toxo', label: 'TOXO' },
  { id: 'vitD', label: 'VITAMINA D' }, { id: 'ferritina', label: 'FERRITINA' },
  { id: 'vitB12', label: 'VITAMINA B12' }, { id: 'urinaUrocultura', label: 'URINA / UROCULTURA' },
  { id: 'gbs', label: 'GBS (35-37 sem)' }
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'doctor_panel' | 'patient_app' | 'master_admin'>('landing');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loginRole, setLoginRole] = useState<'medica' | 'secretaria'>('medica');
  const [activeTab, setActiveTab] = useState('resumo');
  const [doctorPanelTab, setDoctorPanelTab] = useState<'pacientes' | 'agenda_geral'>('pacientes');

  const [patients, setPatients] = useState<Patient[]>(initialPatientsList);
  const [selectedPatientId, setSelectedPatientId] = useState("gestante-01");
  const [searchQuery, setSearchQuery] = useState("");
  const [saasDoctors, setSaasDoctors] = useState<DoctorTenant[]>([]);
  const [secretaries, setSecretaries] = useState<ClinicSecretary[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<HorarioBloqueado[]>([]);

  const [currentDoctorProfile, setCurrentDoctorProfile] = useState<DoctorTenant>({
    id: 'doc-priscila', nome: 'Dra. Priscila Gapski', email: 'dra.priscila@maternaia.com.br',
    crm: '24734-PR', telefone: '(41) 99999-8888', clinicaNome: 'Consultório Dra. Priscila Gapski',
    especialidade: 'Ginecologia & Obstetrícia', enderecoConsultorio: 'Curitiba - PR',
    plano: 'individual_pro', status: 'active', trialEndsAt: '2027-12-31',
    diasRestantes: 365, totalPacientes: 42, dataCadastro: '2026-01-01', valorMensalidade: 89.0
  });

  const [showPatientLoginModal, setShowPatientLoginModal] = useState(false);
  const [showDoctorLoginModal, setShowDoctorLoginModal] = useState(false);
  const [showMasterLoginModal, setShowMasterLoginModal] = useState(false);
  const [showDoctorTrialModal, setShowDoctorTrialModal] = useState(false);
  const [showDoctorSettingsModal, setShowDoctorSettingsModal] = useState(false);
  const [showRequestAppointmentModal, setShowRequestAppointmentModal] = useState(false);
  const [selectedAppointmentForConfirm, setSelectedAppointmentForConfirm] = useState<{ app: AgendaConsulta; pat: Patient } | null>(null);

  const [showAddConsultaModal, setShowAddConsultaModal] = useState(false);
  const [showUploadExamModal, setShowUploadExamModal] = useState(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [showEditExamesModal, setShowEditExamesModal] = useState(false);
  const [showAddAgendaModal, setShowAddAgendaModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showEditVacinasModal, setShowEditVacinasModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
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
  const [newAgenda, setNewAgenda] = useState({ data: new Date().toISOString().split('T')[0], horario: '14:00', tipo: 'Consulta Pré-Natal de Rotina', local: 'Consultório Dra. Priscila Gapski', observacoes: '' });
  const [newPatient, setNewPatient] = useState({ nome: '', cpf: '', telefone: '', idade: '28', pai: '', nomeBebe: '', dum: new Date().toISOString().split('T')[0], pesoInicial: '60.0', altura: '1.65', tipoSanguineo: 'O+', doencasPrevias: '', g: '1', p: '0', c: '0', a: '0' });
  const [newConsulta, setNewConsulta] = useState({ data: new Date().toISOString().split('T')[0], igSem: '', peso: '', pa: '120/80', au: '', bcfMf: '140 bpm / MF+', edema: 'Ausente', conduta: '' });
  const [calcUsgData, setCalcUsgData] = useState(new Date().toISOString().split('T')[0]);
  const [calcUsgSemanas, setCalcUsgSemanas] = useState("8");
  const [calcUsgDias, setCalcUsgDias] = useState("0");
  const [calcResultado, setCalcResultado] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        const isMaster = SUPER_ADMIN_EMAILS.includes(u.email || '');
        setUserRole(isMaster ? 'medica' : 'medica');
        setCurrentScreen(isMaster ? 'master_admin' : 'doctor_panel');
      }
    });
    return () => unsub();
  }, []);

  const handleDoctorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, doctorEmail.trim(), doctorPassword);
      setUserRole(loginRole);
      setDoctorPanelTab(loginRole === 'secretaria' ? 'agenda_geral' : 'pacientes');
      setCurrentScreen('doctor_panel');
      setShowDoctorLoginModal(false);
    } catch (err) { setLoginError("Dados incorretos."); }
  };

  const handleLogout = async () => { await signOut(auth); setUserRole(null); setCurrentScreen('landing'); };
  const saveToFirestore = async (list: any) => { setPatients(list); await setDoc(doc(db, "prenatal", "lista_pacientes"), { lista: list }); };
  const saveSaasDoctorsToFirestore = async (list: any) => { setSaasDoctors(list); await setDoc(doc(db, "saas_config", "medicos_cadastrados"), { lista: list }); };

  const currentPatient = useMemo(() => patients.find(p => p.id === selectedPatientId) || patients[0], [patients, selectedPatientId]);
  const currentGest = calculateWeeksAndDays(currentPatient.dum);
  const nextAppointment = useMemo(() => currentPatient.agendaConsultas?.[0] || null, [currentPatient]);
  const examAlerts = useMemo(() => { const sem = currentGest.weeks; const list = []; if (sem >= 11 && sem <= 14) list.push({ titulo: 'Ecografia Morfológica 1º Trimestre', desc: 'Medição da Translucência Nucal' }); return list; }, [currentGest.weeks]);

  return (
    <div className="min-h-screen bg-[#F4F6F2] font-sans">
      <header className="bg-[#2E482A] text-white p-4 flex justify-between items-center print:hidden">
        <MaternaLogo variant="full" theme="light" size="sm" />
        <button onClick={handleLogout} className="text-xs font-bold underline cursor-pointer">Sair</button>
      </header>

      {currentScreen === 'landing' && <LandingPage onOpenPatientLogin={() => setShowPatientLoginModal(true)} onOpenDoctorLogin={() => setShowDoctorLoginModal(true)} onOpenTrialModal={() => setShowDoctorTrialModal(true)} onInstallPWA={() => setShowInstallModal(true)} />}
      
      {currentScreen === 'doctor_panel' && (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
           <div className="flex gap-2 border-b border-gray-200">
             <button onClick={() => setDoctorPanelTab('pacientes')} className={`px-4 py-2 ${doctorPanelTab === 'pacientes' ? 'bg-[#2E482A] text-white' : 'bg-white'} rounded-t-xl text-xs font-bold`}>Gestantes</button>
             <button onClick={() => setDoctorPanelTab('agenda_geral')} className={`px-4 py-2 ${doctorPanelTab === 'agenda_geral' ? 'bg-[#2E482A] text-white' : 'bg-white'} rounded-t-xl text-xs font-bold`}>📅 Agenda</button>
           </div>
           {doctorPanelTab === 'agenda_geral' ? (
             <ClinicScheduleManager 
               patients={patients} 
               blockedSlots={blockedSlots}
               onAddBlockedSlot={async (s) => setBlockedSlots([...blockedSlots, s])}
               onRemoveBlockedSlot={async (id) => setBlockedSlots(blockedSlots.filter(b => b.id !== id))}
               onOpenConfirmModal={(app, pat) => setSelectedAppointmentForConfirm({ app, pat })}
               onQuickStatusChange={async (pid, aid, status) => {}}
             />
           ) : (
             <div className="bg-white p-6 rounded-3xl">
                {patients.map(p => (
                  <div key={p.id} className="p-4 border-b flex justify-between">
                    <span>{p.nome}</span>
                    <button onClick={() => { setSelectedPatientId(p.id); setCurrentScreen('patient_app'); }} className="px-4 py-1 bg-[#2E482A] text-white rounded-lg text-xs font-bold">Abrir</button>
                  </div>
                ))}
             </div>
           )}
        </div>
      )}

      {currentScreen === 'patient_app' && (
         <div className="max-w-5xl mx-auto p-4">{/* ... renderização da área paciente ... */}</div>
      )}

      {/* MODAIS (Manter todos organizados aqui) */}
      <DoctorSettingsModal isOpen={showDoctorSettingsModal} onClose={() => setShowDoctorSettingsModal(false)} currentDoctor={currentDoctorProfile} secretaries={secretaries} onSaveSecretaries={setSecretaries} onSave={() => {}} />
      <DoctorTrialSignupModal isOpen={showDoctorTrialModal} onClose={() => setShowDoctorTrialModal(false)} onSuccess={() => {}} />
      <RequestAppointmentModal isOpen={showRequestAppointmentModal} onClose={() => setShowRequestAppointmentModal(false)} onRequest={async () => {}} enderecoPadrao="Curitiba" />
      {selectedAppointmentForConfirm && (
        <AppointmentConfirmModal isOpen={!!selectedAppointmentForConfirm} onClose={() => setSelectedAppointmentForConfirm(null)} appointment={selectedAppointmentForConfirm.app} patient={selectedAppointmentForConfirm.pat} onSave={async () => {}} />
      )}
      <AppModals 
         showDoctorLoginModal={showDoctorLoginModal} setShowDoctorLoginModal={setShowDoctorLoginModal}
         handleDoctorLogin={handleDoctorLogin}
         doctorEmail={doctorEmail} setDoctorEmail={setDoctorEmail}
         doctorPassword={doctorPassword} setDoctorPassword={setDoctorPassword}
         loginError={loginError} loginRole={loginRole} setLoginRole={setLoginRole}
      />
    </div>
  );
}
