import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, Upload, Plus, LogOut, Printer, Syringe, UserPlus, Calculator, AlertCircle, 
  Edit3, Bot, MapPin, CalendarPlus, Calendar, Smartphone, WifiOff, Share2, Send, Settings 
} from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, signInWithPopup } from 'firebase/auth';

import { Patient, initialPatientsList } from './types/prenatal';
import { DoctorTenant } from './types/saas';
import { db, auth, googleProvider } from './firebase';

// Componentes
import { AppModals } from './components/AppModals';
import { PrintableCarteirinha } from './components/PrintableCarteirinha';
import { LandingPage } from './components/LandingPage';
import { AdminMasterDashboard } from './components/AdminMasterDashboard';
import { DoctorSettingsModal } from './components/DoctorSettingsModal';
import { DoctorTrialSignupModal } from './components/DoctorTrialSignupModal';
import { MaternaLogo } from './components/MaternaLogo';
import { AdBanner } from './components/AdBanner';
import { PrenatalChatTab } from './components/PrenatalChatTab';
import { Tooltip } from './components/Tooltip';

// Utils
import { formatDateDisplay, formatDateBR, calculateWeeksAndDays, fileToBase64 } from './utils/formatters';
import { generateAppointmentReminderLink, generateConsultationSummaryLink, sharePatientCard } from './utils/whatsapp';
import { processExamWithGeminiIA } from './services/geminiService';

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
  const [userRole, setUserRole] = useState<'paciente' | 'medica' | null>(null);
  
  // Dados SaaS
  const [saasDoctors, setSaasDoctors] = useState<DoctorTenant[]>([]);
  const [currentDoctorProfile, setCurrentDoctorProfile] = useState<DoctorTenant>({
    id: 'doc-priscila', nome: 'Dra. Priscila Gapski', email: 'dra.priscila@maternaia.com.br',
    crm: '24734-PR', telefone: '(41) 99999-8888', clinicaNome: 'Consultório Dra. Priscila Gapski',
    plano: 'individual_pro', status: 'active', trialEndsAt: '2027-12-31',
    diasRestantes: 365, totalPacientes: 42, dataCadastro: '2026-01-01', valorMensalidade: 89.0
  });

  // Modais de Estado
  const [showMasterLoginModal, setShowMasterLoginModal] = useState(false);
  const [showDoctorTrialModal, setShowDoctorTrialModal] = useState(false);
  const [showDoctorSettingsModal, setShowDoctorSettingsModal] = useState(false);
  const [showPatientLoginModal, setShowPatientLoginModal] = useState(false);
  const [showDoctorLoginModal, setShowDoctorLoginModal] = useState(false);
  
  // Estado de Dados
  const [patients, setPatients] = useState<Patient[]>(initialPatientsList);
  const [selectedPatientId, setSelectedPatientId] = useState("gestante-01");
  const [activeTab, setActiveTab] = useState('resumo');
  const [searchQuery, setSearchQuery] = useState("");
  
  // (Mantenha os outros estados existentes no seu projeto...)
  const [showAddConsultaModal, setShowAddConsultaModal] = useState(false);
  const [showUploadExamModal, setShowUploadExamModal] = useState(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [showEditExamesModal, setShowEditExamesModal] = useState(false);
  const [showAddAgendaModal, setShowAddAgendaModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showEditVacinasModal, setShowEditVacinasModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
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

  // Efeitos e Lógica de Auth (Mantenha as funções handleDoctorLogin, handleMasterLogin, saveToFirestore etc como você já tem no seu código anterior, apenas certifique-se de não duplicar)

  // ... [Inclua as funções handleDoctorLogin, handleMasterLogin, handleLogout, saveToFirestore, saveSaasDoctorsToFirestore aqui] ...

  return (
    <div className="min-h-screen bg-[#F4F6F2] text-gray-800 font-sans pb-12">
      {/* CABEÇALHO */}
      <header className="bg-[#2E482A] text-white shadow-md sticky top-0 z-40 print:hidden">
        {/* ... renderização do seu header (com a logo dinâmica do currentDoctorProfile.logoUrl) ... */}
      </header>

      {/* ROTEAMENTO DE TELAS (SEM DUPLICATA) */}
      {currentScreen === 'landing' && <LandingPage onOpenPatientLogin={() => setShowPatientLoginModal(true)} onOpenDoctorLogin={() => setShowDoctorLoginModal(true)} onOpenTrialModal={() => setShowDoctorTrialModal(true)} onInstallPWA={handleInstallPWA} />}
      
      {currentScreen === 'doctor_panel' && (
        <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
           {/* Botão Configurar Consultório incluído aqui */}
           <button onClick={() => setShowDoctorSettingsModal(true)}>Configurar Consultório</button>
           {/* ... lista de pacientes ... */}
        </div>
      )}
      
      {currentScreen === 'patient_app' && ( /* ... área do paciente ... */ )}
      
      {currentScreen === 'master_admin' && (
        <AdminMasterDashboard doctors={saasDoctors} onSaveDoctors={saveSaasDoctorsToFirestore} onLogout={() => setCurrentScreen('landing')} />
      )}

      {/* MODAIS ÚNICOS */}
      <DoctorSettingsModal isOpen={showDoctorSettingsModal} onClose={() => setShowDoctorSettingsModal(false)} currentDoctor={currentDoctorProfile} onSave={async (u) => { setCurrentDoctorProfile(u); await saveSaasDoctorsToFirestore(saasDoctors.map(d => d.id === u.id ? u : d)); }} />
      <DoctorTrialSignupModal isOpen={showDoctorTrialModal} onClose={() => setShowDoctorTrialModal(false)} onSuccess={async (n) => { await saveSaasDoctorsToFirestore([n, ...saasDoctors]); setCurrentDoctorProfile(n); setUserRole('medica'); setCurrentScreen('doctor_panel'); }} />
      <AppModals /* ... todas as suas props de modais ... */ />
    </div>
  );
}
