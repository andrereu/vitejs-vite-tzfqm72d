import { useEffect, useRef, useState } from 'react';
import { collectionGroup, getDocs, query, where } from 'firebase/firestore';
import { onAuthStateChanged, sendPasswordResetEmail, signInWithCustomToken, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { auth, db, googleProvider } from '../firebase';
import type { ClinicSecretary, DoctorTenant, TwoFactorConfig } from '../types/saas';
import type { UserRole } from '../types/prenatal';

export const SUPER_ADMIN_EMAILS = ['admin@maternaia.com.br', 'andrereu@gmail.com'];

// 'switch_user' — BUG-02.2: tela neutra "Quem vai acessar?" entre uma
// identidade e outra no mesmo aparelho. Não é a landing pública (essa
// continua existindo pra quem nunca esteve logado) — é o destino de
// "Trocar usuário", que precisa ficar sem qualquer rastro de quem usou o
// aparelho antes (ver resetSessionState em App.tsx).
export type AppScreen = 'landing' | 'doctor_panel' | 'patient_app' | 'master_admin' | 'switch_user';

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
  // BUG-02.2 — limpa todo o estado de sessão que vive em App.tsx (perfil da
  // médica, paciente selecionada, aba ativa, modais/rascunhos abertos).
  // Chamado tanto por "Sair" quanto por "Trocar usuário", pra nunca duplicar
  // a lista de que estado precisa ser resetado em dois lugares.
  onResetLocalState: () => void;
  // BUG-01.1 — zera o histórico de navegação Back (useBackNavigation, em
  // App.tsx). Chamado nos mesmos pontos que onResetLocalState (logout, trocar
  // usuário) e também logo depois de todo login bem-sucedido — login sempre
  // deve começar em repouso (Seção 10 do pedido), mesmo que isso já
  // aconteça de graça pelo fechamento do próprio modal de login (rastreado
  // como overlay); chamar aqui também deixa a garantia explícita, em vez de
  // depender só desse efeito colateral.
  onResetNavigation: () => void;
}

// Tudo relacionado a "quem está logado e como" (telas de login, 2FA, sessão do
// Firebase Auth) vive aqui. Dados de negócio (pacientes, médicos, secretárias)
// ficam nos outros hooks — este cuida só de identidade e navegação de tela.
export function useAuthSession({
  saasDoctors,
  currentDoctorProfile,
  setCurrentDoctorProfile,
  setSelectedPatientId,
  setSelectedPatientDoctorId,
  onResetLocalState,
  onResetNavigation
}: UseAuthSessionOptions) {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('landing');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loginRole, setLoginRole] = useState<'medica' | 'secretaria'>('medica');
  const [doctorPanelTab, setDoctorPanelTab] = useState<'pacientes' | 'agenda_geral' | 'metricas' | 'lembretes'>('pacientes');

  const [showPatientLoginModal, setShowPatientLoginModal] = useState(false);
  const [showDoctorLoginModal, setShowDoctorLoginModal] = useState(false);
  const [showMasterLoginModal, setShowMasterLoginModal] = useState(false);

  const [doctorEmail, setDoctorEmail] = useState('');
  const [doctorPassword, setDoctorPassword] = useState('');
  const [masterEmail, setMasterEmail] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [loginCpf, setLoginCpf] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [loginError, setLoginError] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [pendingTwoFactorUser, setPendingTwoFactorUser] = useState<PendingTwoFactorUser | null>(null);

  // BUG-02.1/02.2 — este efeito só roda uma vez (monta o listener do Firebase
  // Auth e nunca mais); sem essa ref, o callback ficaria fechado (closure)
  // sobre o `saasDoctors` do primeiro render (quase sempre [], antes do
  // useDoctorsDirectory carregar) pra sempre, e nunca acharia a médica certa
  // ao restaurar sessão depois de um reload.
  const saasDoctorsRef = useRef(saasDoctors);
  useEffect(() => {
    saasDoctorsRef.current = saasDoctors;
  }, [saasDoctors]);

  // Restaura a sessão quando a página é recarregada com um usuário já logado.
  //
  // BUG-02.1 — achado adjacente corrigido aqui: antes, esta restauração
  // sempre fazia setUserRole('medica'), mesmo pra uma secretária, e nunca
  // chamava setCurrentDoctorProfile — currentDoctorProfile simplesmente
  // ficava com o que quer que já estivesse em memória (o perfil de outra
  // médica, ou o placeholder). Agora resolve o papel e o tenant de verdade a
  // partir do e-mail autenticado, do mesmo jeito que handleGoogleDoctorLogin
  // já fazia — nunca assume.
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return;

      const userEmail = currentUser.email?.toLowerCase().trim() || '';
      if (userEmail) {
        if (SUPER_ADMIN_EMAILS.includes(userEmail)) {
          setUserRole('medica');
          setCurrentScreen('master_admin');
          return;
        }

        const matchedDoctor = saasDoctorsRef.current.find((d) => d.email.toLowerCase().trim() === userEmail);
        if (matchedDoctor) {
          setCurrentDoctorProfile(matchedDoctor);
          setUserRole('medica');
          setCurrentScreen('doctor_panel');
          return;
        }

        try {
          const secSnap = await getDocs(query(collectionGroup(db, 'secretaries'), where('email', '==', userEmail)));
          const secDoc = secSnap.docs[0];
          const secretaryDoctorProfile = secDoc
            ? saasDoctorsRef.current.find((d) => d.id === secDoc.ref.parent.parent!.id)
            : undefined;
          if (secretaryDoctorProfile) {
            setCurrentDoctorProfile(secretaryDoctorProfile);
            setUserRole('secretaria');
            setCurrentScreen('doctor_panel');
            return;
          }
        } catch (err) {
          console.error('Erro ao restaurar sessão da equipe:', err);
        }

        // E-mail autenticado, mas sem registro correspondente (ainda
        // carregando saasDoctors, ou conta órfã) — não deixa a sessão restaurar
        // "pela metade" com um perfil que pode não ser o certo.
        setUserRole(null);
        return;
      }

      // Sem e-mail: é uma sessão de paciente, autenticada por CPF + PIN via
      // api/patient-login.ts (o "custom token" carrega doctorId/patientId
      // como claims em vez de um e-mail).
      try {
        const tokenResult = await currentUser.getIdTokenResult();
        const claims = tokenResult.claims as { role?: string; doctorId?: string; patientId?: string };
        if (claims.role === 'paciente' && claims.doctorId && claims.patientId) {
          setSelectedPatientId(claims.patientId);
          setSelectedPatientDoctorId(claims.doctorId);
          setUserRole('paciente');
          setCurrentScreen('patient_app');
        }
      } catch (err) {
        console.error('Erro ao restaurar sessão da paciente:', err);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // BUG-02.1 — achado adjacente corrigido: este login nunca chamava
  // setCurrentDoctorProfile, então currentDoctorProfile ficava com o que
  // quer que estivesse em memória de antes (a médica anterior no mesmo
  // aparelho, ou o placeholder) em vez da médica/secretária que de fato
  // acabou de autenticar. Agora resolve o tenant certo antes de entrar no
  // painel — mesma lógica de busca que handleGoogleDoctorLogin já usa, só
  // disparada pelo login por e-mail/senha. Se a autenticação passar mas
  // nenhum registro correspondente for encontrado, desfaz o login (signOut)
  // em vez de deixar a sessão entrar com um perfil errado.
  const handleDoctorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setResetMessage('');
    try {
      await signInWithEmailAndPassword(auth, doctorEmail.trim(), doctorPassword);
      const emailNorm = doctorEmail.trim().toLowerCase();

      if (loginRole === 'secretaria') {
        const secSnap = await getDocs(query(collectionGroup(db, 'secretaries'), where('email', '==', emailNorm)));
        const secDoc = secSnap.docs[0];
        const secretaryDoctorProfile = secDoc
          ? saasDoctors.find((d) => d.id === secDoc.ref.parent.parent!.id)
          : undefined;
        if (!secretaryDoctorProfile) {
          setLoginError('E-mail não encontrado como secretária de nenhuma clínica.');
          await signOut(auth);
          return;
        }
        setCurrentDoctorProfile(secretaryDoctorProfile);
        setUserRole('secretaria');
        setDoctorPanelTab('agenda_geral');
      } else {
        const matchedDoctor = saasDoctors.find((d) => d.email.toLowerCase().trim() === emailNorm);
        if (!matchedDoctor) {
          setLoginError('E-mail não encontrado como médica cadastrada.');
          await signOut(auth);
          return;
        }
        setCurrentDoctorProfile(matchedDoctor);
        setUserRole('medica');
        setDoctorPanelTab('pacientes');
      }

      setCurrentScreen('doctor_panel');
      setShowDoctorLoginModal(false);
      onResetNavigation();
    } catch (err) {
      setLoginError('E-mail ou senha incorretos.');
    }
  };

  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setResetMessage('');
    const emailNorm = masterEmail.toLowerCase().trim();

    try {
      await signInWithEmailAndPassword(auth, emailNorm, masterPassword);
      if (SUPER_ADMIN_EMAILS.includes(emailNorm)) {
        setUserRole('medica');
        setCurrentScreen('master_admin');
        setShowMasterLoginModal(false);
        onResetNavigation();
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
        onResetNavigation();
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
    try {
      const response = await fetch('/api/patient-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: loginCpf, senha: loginSenha })
      });
      const data = await response.json();

      if (!response.ok) {
        setLoginError(data.error || 'CPF ou senha inválidos.');
        return;
      }

      await signInWithCustomToken(auth, data.token);
      setSelectedPatientId(data.patientId);
      setSelectedPatientDoctorId(data.doctorId);
      setUserRole('paciente');
      setCurrentScreen('patient_app');
      setShowPatientLoginModal(false);
      setLoginSenha('');
      onResetNavigation();
    } catch (err) {
      console.error('Erro ao autenticar paciente:', err);
      setLoginError('Erro ao entrar. Tente novamente.');
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
        onResetNavigation();
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
          onResetNavigation();
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
          onResetNavigation();
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

  // "Esqueci minha senha" pra médica/secretária/admin. A mensagem de retorno
  // é sempre a mesma, exista ou não o e-mail — assim ninguém descobre, por
  // tentativa e erro, quais e-mails têm cadastro no sistema.
  const handlePasswordReset = async (email: string) => {
    setLoginError('');
    setResetMessage('');
    const emailNorm = email.trim();

    if (!emailNorm) {
      setLoginError('Digite seu e-mail no campo acima primeiro.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, emailNorm);
    } catch (err: any) {
      if (err.code === 'auth/invalid-email') {
        setLoginError('Esse e-mail não parece válido.');
        return;
      }
      // Outros erros (ex.: e-mail não cadastrado) são silenciados de propósito.
    }

    setResetMessage(
      `Se ${emailNorm} estiver cadastrado, você vai receber um link de redefinição de senha em instantes. Confira sua caixa de entrada (e o spam).`
    );
  };

  // BUG-02.2 — estado de sessão que é do próprio hook (não do App.tsx):
  // campos de formulário de login e a folha de 2FA pendente. Compartilhado
  // por "Sair" e "Trocar usuário" pra nenhum dos dois esquecer um campo que
  // o outro já limpa (a lista de campos só existe em um lugar).
  const resetLocalAuthUI = () => {
    setDoctorEmail('');
    setDoctorPassword('');
    setMasterEmail('');
    setMasterPassword('');
    setLoginCpf('');
    setLoginSenha('');
    setLoginError('');
    setResetMessage('');
    setShowPatientLoginModal(false);
    setShowDoctorLoginModal(false);
    setShowMasterLoginModal(false);
    setShowTwoFactorModal(false);
    setPendingTwoFactorUser(null);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUserRole(null);
    onResetLocalState();
    onResetNavigation();
    resetLocalAuthUI();
    setCurrentScreen('landing');
  };

  // BUG-02.2 — "Trocar usuário": mesmo mecanismo técnico do logout (encerra
  // a sessão do Firebase Auth de verdade, zera o mesmo estado), só que o
  // destino final é a tela neutra "Quem vai acessar?" em vez da landing
  // pública — pensado pra quando alguém já sabe que vai entrar com outra
  // identidade agora mesmo, sem passar pela landing de vendas.
  const handleSwitchUser = async () => {
    await signOut(auth);
    setUserRole(null);
    onResetLocalState();
    onResetNavigation();
    resetLocalAuthUI();
    setCurrentScreen('switch_user');
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
    loginSenha, setLoginSenha,
    loginError, setLoginError,
    resetMessage, setResetMessage,

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
  };
}
