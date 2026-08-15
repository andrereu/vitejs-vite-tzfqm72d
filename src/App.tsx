import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, Upload, Plus, LogOut, Printer, Syringe, UserPlus, Calculator, AlertCircle, 
  Edit3, Bot, MapPin, CalendarPlus, Calendar, Smartphone, WifiOff, Share2, Send, Settings, Check 
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, signInWithPopup } from 'firebase/auth';

// Tipos e Utils
import { Patient, initialPatientsList, AgendaConsulta, HorarioBloqueado, UserRole } from './types/prenatal';
import { DoctorTenant, ClinicSecretary } from './types/saas';
import { db, auth, googleProvider } from './firebase';
import { formatDateDisplay, formatDateBR, calculateWeeksAndDays, fileToBase64 } from './utils/formatters';
import { generateAppointmentReminderLink, generateConsultationSummaryLink, sharePatientCard } from './utils/whatsapp';
import { processExamWithGeminiIA } from './services/geminiService';
import { hasPermission } from './utils/rbac';

// Componentes
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

const SUPER_ADMIN_EMAILS = ['admin@maternaia.com.br', 'andrereu@gmail.com'];

export default function App() {
  // ESTADOS PRINCIPAIS
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'doctor_panel' | 'patient_app' | 'master_admin'>('landing');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loginRole, setLoginRole] = useState<'medica' | 'secretaria'>('medica');
  const [activeTab, setActiveTab] = useState('resumo');
  const [doctorPanelTab, setDoctorPanelTab] = useState<'pacientes' | 'agenda_geral'>('pacientes');
  
  // DADOS
  const [patients, setPatients] = useState<Patient[]>(initialPatientsList);
  const [selectedPatientId, setSelectedPatientId] = useState("gestante-01");
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

  // MODAIS E INPUTS (Simplificados na visualização, mas funcionais)
  const [showPatientLoginModal, setShowPatientLoginModal] = useState(false);
  const [showDoctorLoginModal, setShowDoctorLoginModal] = useState(false);
  const [showDoctorTrialModal, setShowDoctorTrialModal] = useState(false);
  const [showDoctorSettingsModal, setShowDoctorSettingsModal] = useState(false);
  const [showRequestAppointmentModal, setShowRequestAppointmentModal] = useState(false);
  const [selectedAppointmentForConfirm, setSelectedAppointmentForConfirm] = useState<{ app: AgendaConsulta; pat: Patient } | null>(null);

  // LOGINS E HANDLERS
  const handleDoctorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, doctorEmail.trim(), doctorPassword);
      setUserRole(loginRole);
      setDoctorPanelTab(loginRole === 'secretaria' ? 'agenda_geral' : 'pacientes');
      setCurrentScreen('doctor_panel');
      setShowDoctorLoginModal(false);
    } catch (err) { alert("Erro ao logar"); }
  };

  const handleLogout = async () => { await signOut(auth); setUserRole(null); setCurrentScreen('landing'); };
  const saveToFirestore = async (updatedList: any) => { setPatients(updatedList); /* ... logica de salvar ... */ };
  const saveSaasDoctorsToFirestore = async (list: any) => { setSaasDoctors(list); /* ... logica de salvar ... */ };

  // EFEITOS (Firebase)
  useEffect(() => { /* ... Manter seus useEffects de onSnapshot aqui ... */ }, []);

  const currentPatient = useMemo(() => patients.find(p => p.id === selectedPatientId) || patients[0], [patients, selectedPatientId]);
  const currentGest = calculateWeeksAndDays(currentPatient.dum);
  const nextAppointment = useMemo(() => currentPatient.agendaConsultas?.[0] || null, [currentPatient]);

  return (
    <div className="min-h-screen bg-[#F4F6F2]">
      {/* HEADER */}
      <header className="bg-[#2E482A] text-white p-4 flex justify-between items-center print:hidden">
        <MaternaLogo variant="full" theme="light" size="sm" />
        <button onClick={() => setCurrentScreen('landing')} className="text-xs font-bold underline">Sair</button>
      </header>

      {/* RENDERIZAÇÃO CONDICIONAL */}
      {currentScreen === 'landing' && <LandingPage onOpenPatientLogin={() => setShowPatientLoginModal(true)} onOpenDoctorLogin={() => setShowDoctorLoginModal(true)} onOpenTrialModal={() => setShowDoctorTrialModal(true)} onInstallPWA={() => {}} />}
      
      {currentScreen === 'doctor_panel' && (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
           <div className="flex gap-2 border-b">
             <button onClick={() => setDoctorPanelTab('pacientes')} className="px-4 py-2 bg-white rounded-t-xl text-xs font-bold">Gestantes</button>
             <button onClick={() => setDoctorPanelTab('agenda_geral')} className="px-4 py-2 bg-white rounded-t-xl text-xs font-bold">📅 Agenda</button>
           </div>
           
           {doctorPanelTab === 'agenda_geral' ? (
             <ClinicScheduleManager 
               patients={patients} 
               blockedSlots={blockedSlots}
               onAddBlockedSlot={async (s) => setBlockedSlots([...blockedSlots, s])}
               onRemoveBlockedSlot={async (id) => setBlockedSlots(blockedSlots.filter(b => b.id !== id))}
               onOpenConfirmModal={(app, pat) => setSelectedAppointmentForConfirm({ app, pat })}
               onQuickStatusChange={async () => {}}
             />
           ) : (
             <div className="p-4 bg-white rounded-2xl">Lista de Gestantes...</div>
           )}
        </div>
      )}

      {/* MODAIS */}
      <DoctorSettingsModal 
        isOpen={showDoctorSettingsModal} 
        onClose={() => setShowDoctorSettingsModal(false)} 
        currentDoctor={currentDoctorProfile}
        secretaries={secretaries}
        onSaveSecretaries={setSecretaries}
        onSave={() => {}}
      />
      
      <DoctorTrialSignupModal 
        isOpen={showDoctorTrialModal} 
        onClose={() => setShowDoctorTrialModal(false)} 
        onSuccess={() => {}} 
      />

      <RequestAppointmentModal 
        isOpen={showRequestAppointmentModal} 
        onClose={() => setShowRequestAppointmentModal(false)} 
        onRequest={async (s) => {}} 
        enderecoPadrao="Consultório" 
      />

      {selectedAppointmentForConfirm && (
        <AppointmentConfirmModal
          isOpen={!!selectedAppointmentForConfirm}
          onClose={() => setSelectedAppointmentForConfirm(null)}
          appointment={selectedAppointmentForConfirm.app}
          patient={selectedAppointmentForConfirm.pat}
          onSave={async () => {}}
        />
      )}
    </div>
  );
}
