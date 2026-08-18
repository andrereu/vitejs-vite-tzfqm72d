import { useEffect, useState } from 'react';
import { collectionGroup, getDocs, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { auth, db, googleProvider } from '../firebase';
import type { ClinicSecretary, DoctorTenant, TwoFactorConfig } from '../types/saas';
import type { UserRole } from '../types/prenatal';

export const SUPER_ADMIN_EMAILS = ['admin@maternaia.com.br', 'andrereu@gmail.com'];

export type AppScreen = 'landing' | 'doctor_panel' | 'patient_app' | 'master_admin';

interface PendingTwoFactorUser {
  role: 'medica' | 'secretaria';
  profile: DoctorTenant;
  config: TwoFactorConfig;
}

interface UseAuthSessionOptions {
  saasDoctors: DoctorTenant[];
  currentDoctorProfile: DoctorTenant;
  setCurrentDoctorProfile: (doctor: DoctorTenant) => void;
  setSelectedPatientId: (id: string) => void;
  setSelectedPatientDoctorId: (id: string | null) => void;
}

// Tudo relacionado a "quem está logado e como" (telas de login, 2FA, sessão do
// Firebase Auth) vive aqui. Dados de negócio (pacientes, médicos, secretárias)
// ficam nos outros hooks — este cuida só de identidade e navegação de tela.
export function useAuthSession({
  saasDoctors,
  currentDoctorProfile,
  setCurrentDoctorProfile,
  setSelectedPatientId,
  setSelectedPatientDoctorId
}: UseAuthSessionOptions) {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('landing');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loginRole, setLoginRole] = useState<'medica' | 'secretaria'>('medica');
  const [doctorPanelTab, setDoctorPanelTab] = useState<'pacientes' | 'agenda_geral'>('pacientes');

  const [showPatientLoginModal, setShowPatientLoginModal] = useState(false);
  const [showDoctorLoginModal, setShowDoctorLoginModal] = useState(false);
  const [showMasterLoginModal, setShowMasterLoginModal] = useState(false);

  const [doctorEmail, setDoctorEmail] = useState('');
  const [doctorPassword, setDoctorPassword] = useState('');
  const [masterEmail, setMasterEmail] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [loginCpf, setLoginCpf] = useState('');
  const [loginError, setLoginError] = useState('');

  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [pendingTwoFactorUser, setPendingTwoFactorUser] = useState<PendingTwoFactorUser | null>(null);

  // Restaura a sessão quando a página é recarregada com um usuário já logado.
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

  const handleDoctorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, doctorEmail.trim(), doctorPassword);
      if (loginRole === 'secretaria') {
        setUserRole('secretaria');
        setDoctorPanelTab('agenda_geral');
      } else {
        setUserRole('medica');
        setDoctorPanelTab('pacientes');
      }
      setCurrentScreen('doctor_panel');
      setShowDoctorLoginModal(false);
    } catch (err) {
      setLoginError('E-mail ou senha incorretos.');
    }
  };

  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const emailNorm = masterEmail.toLowerCase().trim();

    try {
      await signInWithEmailAndPassword(auth, emailNorm, masterPassword);
      if (SUPER_ADMIN_EMAILS.includes(emailNorm)) {
        setUserRole('medica');
        setCurrentScreen('master_admin');
        setShowMasterLoginModal(false);
      } else {
        setLoginError('Acesso negado: este e-mail não possui permissões de Super Admin.');
        await signOut(auth);
      }
    } catch (err) {
      setLoginError('E-mail ou senha de administrador incorretos.');
    }
  };

  const handleGooglePatientLogin = async () => {
    setLoginError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userEmail = result.user.email?.toLowerCase().trim();

      if (!userEmail) {
        setLoginError('Não foi possível obter o e-mail da sua conta Google.');
        return;
      }

      const snap = await getDocs(query(collectionGroup(db, 'patients'), where('emailLower', '==', userEmail)));

      if (!snap.empty) {
        const matchedDoc = snap.docs[0];
        setSelectedPatientId(matchedDoc.id);
        setSelectedPatientDoctorId(matchedDoc.ref.parent.parent!.id);
        setUserRole('paciente');
        setCurrentScreen('patient_app');
        setShowPatientLoginModal(false);
      } else {
        setLoginError(
          `O e-mail ${userEmail} ainda não está vinculado a nenhum pré-natal cadastrado. Peça à sua médica para incluir seu e-mail no cadastro.`
        );
      }
    } catch (err: any) {
      console.error('Erro no login Google:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setLoginError('Erro ao autenticar com o Google. Tente novamente.');
      }
    }
  };

  const handlePatientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const cpfDigits = loginCpf.replace(/\D/g, '');
    try {
      const snap = await getDocs(query(collectionGroup(db, 'patients'), where('cpfDigits', '==', cpfDigits)));
      if (!snap.empty) {
        const matchedDoc = snap.docs[0];
        setSelectedPatientId(matchedDoc.id);
        setSelectedPatientDoctorId(matchedDoc.ref.parent.parent!.id);
        setUserRole('paciente');
        setCurrentScreen('patient_app');
        setShowPatientLoginModal(false);
      } else {
        setLoginError('CPF não encontrado.');
      }
    } catch (err) {
      console.error('Erro ao buscar paciente:', err);
      setLoginError('Erro ao buscar cadastro. Tente novamente.');
    }
  };

  // Login com Google para Médicas e Secretárias
  const handleGoogleDoctorLogin = async () => {
    setLoginError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userEmail = result.user.email?.toLowerCase().trim() || '';

      if (SUPER_ADMIN_EMAILS.includes(userEmail)) {
        setUserRole('medica');
        setCurrentScreen('master_admin');
        setShowDoctorLoginModal(false);
        return;
      }

      const matchedDoctor = saasDoctors.find((d) => d.email.toLowerCase().trim() === userEmail);
      if (matchedDoctor) {
        if (matchedDoctor.twoFactor?.enabled) {
          setPendingTwoFactorUser({ role: 'medica', profile: matchedDoctor, config: matchedDoctor.twoFactor });
          setShowTwoFactorModal(true);
          setShowDoctorLoginModal(false);
        } else {
          setCurrentDoctorProfile(matchedDoctor);
          setUserRole('medica');
          setCurrentScreen('doctor_panel');
          setShowDoctorLoginModal(false);
        }
        return;
      }

      // Verifica se é uma Secretária cadastrada (busca em todas as clínicas)
      const secSnap = await getDocs(query(collectionGroup(db, 'secretaries'), where('email', '==', userEmail)));
      if (!secSnap.empty) {
        const secDoc = secSnap.docs[0];
        const matchedSecretary = secDoc.data() as ClinicSecretary;
        const secretaryDoctorId = secDoc.ref.parent.parent!.id;
        const secretaryDoctorProfile = saasDoctors.find((d) => d.id === secretaryDoctorId);

        if (matchedSecretary.twoFactor?.enabled) {
          setPendingTwoFactorUser({
            role: 'secretaria',
            profile: secretaryDoctorProfile || currentDoctorProfile,
            config: matchedSecretary.twoFactor
          });
          setShowTwoFactorModal(true);
          setShowDoctorLoginModal(false);
        } else {
          if (secretaryDoctorProfile) setCurrentDoctorProfile(secretaryDoctorProfile);
          setUserRole('secretaria');
          setCurrentScreen('doctor_panel');
          setShowDoctorLoginModal(false);
        }
        return;
      }

      setLoginError(`O e-mail ${userEmail} não possui cadastro profissional ativo no MaternaIA.`);
      await signOut(auth);
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setLoginError('Erro ao autenticar com o Google.');
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUserRole(null);
    setCurrentScreen('landing');
  };

  return {
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
    loginError, setLoginError,

    showTwoFactorModal, setShowTwoFactorModal,
    pendingTwoFactorUser, setPendingTwoFactorUser,

    handleDoctorLogin,
    handleMasterLogin,
    handleGooglePatientLogin,
    handlePatientLogin,
    handleGoogleDoctorLogin,
    handleLogout
  };
}
