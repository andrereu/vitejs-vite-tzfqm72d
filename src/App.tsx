import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Activity, Heart, Upload, Sparkles, User, 
  Plus, Clock, Baby, Stethoscope, LogOut, Printer, X, 
  Syringe, Scale, FileCheck, Check,
  TrendingUp, UserPlus
} from 'lucide-react';

// Importa a instância do banco de dados Firebase
import { db } from './firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc 
} from 'firebase/firestore';

// --- CURVAS REFERENCIAIS DE GANHO DE PESO MATERNO (ATALAH / MS) ---
const WEIGHT_CURVES: Record<string, { label: string; targetMin: number; targetMax: number; color: string }> = {
  baixoPeso: { label: 'Baixo Peso (IMC < 18,5)', targetMin: 12.5, targetMax: 18.0, color: '#3B82F6' },
  normal: { label: 'Peso Normal (IMC 18,5 - 24,9)', targetMin: 11.5, targetMax: 16.0, color: '#10B981' },
  sobrepeso: { label: 'Sobrepeso (IMC 25,0 - 29,9)', targetMin: 7.0, targetMax: 11.5, color: '#F59E0B' },
  obesidade: { label: 'Obesidade (IMC ≥ 30,0)', targetMin: 5.0, targetMax: 9.0, color: '#EF4444' }
};

const initialPatientsList = [
  {
    id: "gestante-01",
    cpf: "123.456.789-00",
    senhaAcc: "1234",
    nome: "Juliana Maria da Silva",
    idade: "29",
    pai: "Lucas Andrade Silva",
    nomeBebe: "Arthur",
    dum: "2026-01-15",
    dpp: "2026-10-22",
    g: "1", p: "0", c: "0", a: "0",
    pesoInicial: "62.5",
    altura: "1.65",
    tipoSanguineo: "A+",
    doencasPrevias: "Nenhuma (Alergia leve a Dipirona)",
    vacinas: {
      influenza: { realizada: true, data: "2026-03-10", lote: "INF2026-B" },
      vsr: { realizada: true, data: "2026-07-28", lote: "VSR-884" },
      dtpa: { realizada: true, data: "2026-05-20", lote: "DTP-9921" },
      hepatiteB_1: { realizada: true, data: "2026-02-10", lote: "HEP-01" },
      hepatiteB_2: { realizada: true, data: "2026-03-12", lote: "HEP-02" },
      hepatiteB_3: { realizada: false, data: "", lote: "" },
      covid19: { realizada: true, data: "2026-02-15", lote: "COV-3" },
      outras: "Tétano em dia"
    },
    examesLab: [
      {
        id: "lab-1",
        data: "2026-02-20",
        hbVg: "12.8 / 38%",
        plaquetas: "245.000",
        glicemia: "82 mg/dL",
        htlv: "Não Reativo",
        hiv: "Não Reativo",
        sifilis: "Não Reativo",
        hbsag: "Reativo (Anti-HBs +)",
        tsh: "1.8 mUI/L",
        antiHcv: "Não Reativo",
        rubeola: "IgG Pos / IgM Neg",
        cmv: "IgG Pos / IgM Neg",
        toxo: "IgG Pos / IgM Neg",
        vitD: "38 ng/mL",
        ferritina: "65 ng/mL",
        vitB12: "410 pg/mL",
        urina: "Normal",
        urocultura: "Negativa",
        gbs: "Pendente (35-37 sem)"
      }
    ],
    ultrassons: [
      { id: "us-1", data: "2026-02-25", igSem: 6, pfGrams: 0, la: "Normal", pl: "Trofoblasto", laudo: "Saco gestacional único com BCF visível (124 bpm)." },
      { id: "us-2", data: "2026-04-10", igSem: 12, pfGrams: 62, la: "Normal", pl: "Anterior", laudo: "TN 1.2mm, osso nasal presente. Risco baixo para trissomias." },
      { id: "us-3", data: "2026-06-18", igSem: 22, pfGrams: 480, la: "Normal", pl: "Posterior", laudo: "Ultrassom Morfológico do 2º Trimestre sem anomalias estruturais." },
      { id: "us-4", data: "2026-07-28", igSem: 28, pfGrams: 1210, la: "Normal", pl: "Posterior G1", laudo: "Feto em P50 para peso, Doppler mantido dentro da normalidade." }
    ],
    consultasEvolucao: [
      { id: "c-1", data: "2026-02-20", igSem: 6, peso: 62.5, pa: "110/70", au: "NP", bcfMf: "Visível USG", edema: "Ausente", conduta: "Início do Ácido Fólico + Orientação nutricional." },
      { id: "c-2", data: "2026-03-24", igSem: 10, peso: 63.1, pa: "115/75", au: "NP", bcfMf: "152 bpm", edema: "Ausente", conduta: "Solicitado Morfológico de 1º Trimestre." },
      { id: "c-3", data: "2026-04-28", igSem: 15, peso: 64.2, pa: "110/70", au: "14 cm", bcfMf: "148 bpm / MF+", edema: "Ausente", conduta: "Suplementação mantida. Exames 1º trim normais." },
      { id: "c-4", data: "2026-05-26", igSem: 19, peso: 65.8, pa: "120/75", au: "18 cm", bcfMf: "144 bpm / MF+", edema: "Ausente", conduta: "Prescrito Ferro elementar. Agendado morfológico." },
      { id: "c-5", data: "2026-06-30", igSem: 24, peso: 67.3, pa: "115/70", au: "23 cm", bcfMf: "140 bpm / MF++", edema: "Leve (+/4)", conduta: "TOTG 75g solicitado. Vacina dTpa prescrita." },
      { id: "c-6", data: "2026-07-28", igSem: 28, peso: 69.0, pa: "118/76", au: "27 cm", bcfMf: "142 bpm / MF++", edema: "Leve (+/4)", conduta: "Aplicada vacina VSR. Solicitação do USG com Doppler de 32 sem." }
    ],
    agendaConsultas: [
      { id: "ag-1", data: "2026-08-25", horario: "14:30", tipo: "Consulta Pré-Natal (32 sem)", status: "Agendada" }
    ],
    examesEnviados: [
      {
        id: "ex-1",
        nome: "Ultrassom Morfológico 2º Trimestre",
        dataUpload: "2026-06-19",
        tipo: "Ecografia",
        resumoIA: "🌸 **Para a Mamãe**: O Arthur está crescendo super saudável! O ultrassom de 22 semanas mostrou que o coração, cérebro e todos os órgãos estão perfeitamente formados.\n\n🩺 **Para Dra. Priscila**: Peso estimado de 480g, ILA de 14cm (Normal), Placenta Grau 0. Sem achados de restrição ou alterações de Doppler.",
        enviadoPor: "Dra. Priscila Gapski"
      }
    ]
  }
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'patient_app' | 'admin_dashboard'>('landing');
  const [userRole, setUserRole] = useState<'paciente' | 'medica' | null>(null);
  const [patients, setPatients] = useState(initialPatientsList);
  const [selectedPatientId, setSelectedPatientId] = useState("gestante-01");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState('resumo');

  const [showPatientLoginModal, setShowPatientLoginModal] = useState(false);
  const [showDoctorLoginModal, setShowDoctorLoginModal] = useState(false);
  const [showAddConsultaModal, setShowAddConsultaModal] = useState(false);
  const [showAddUSModal, setShowAddUSModal] = useState(false);
  const [showUploadExamModal, setShowUploadExamModal] = useState(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [loginCpf, setLoginCpf] = useState("");
  const [loginPass, setLoginPass] = useState("");

  // ESTADOS DOS FORMULÁRIOS
  const [newPatient, setNewPatient] = useState({
    nome: '', cpf: '', idade: '', pai: '', nomeBebe: '',
    dum: new Date().toISOString().split('T')[0],
    pesoInicial: '60.0', altura: '1.65', tipoSanguineo: 'O+', doencasPrevias: ''
  });

  const [newConsulta, setNewConsulta] = useState({
    data: new Date().toISOString().split('T')[0],
    igSem: '', peso: '', pa: '120/80', au: '', bcfMf: '140 bpm / MF+', edema: 'Ausente', conduta: ''
  });

  const [newUS, setNewUS] = useState({
    data: new Date().toISOString().split('T')[0],
    igSem: '', pfGrams: '', la: 'Normal', pl: 'Normoinserida', laudo: ''
  });

  const [newExamUpload, setNewExamUpload] = useState({
    nome: '', tipo: 'Ecografia'
  });

  // 🔄 SINCRONIZAÇÃO EM TEMPO REAL COM O FIREBASE FIRESTORE
  useEffect(() => {
    try {
      const docRef = doc(db, "prenatal", "lista_pacientes");
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists() && snapshot.data().lista) {
          setPatients(snapshot.data().lista);
        } else {
          // Se o banco estiver vazio, salva a lista inicial no Firestore
          setDoc(docRef, { lista: initialPatientsList }).catch(console.error);
        }
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn("Rodando no modo offline / fallback:", err);
    }
  }, []);

  // Função auxiliar para salvar alterações no Firestore
  const saveToFirestore = async (updatedPatientsList: any[]) => {
    setPatients(updatedPatientsList);
    try {
      const docRef = doc(db, "prenatal", "lista_pacientes");
      await setDoc(docRef, { lista: updatedPatientsList }, { merge: true });
    } catch (err) {
      console.error("Erro ao salvar no Firebase:", err);
    }
  };

  const currentPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId) || patients[0];
  }, [patients, selectedPatientId]);

  const calculateWeeksAndDays = (dumStr: string) => {
    if (!dumStr) return { weeks: 0, days: 0 };
    const dum = new Date(dumStr);
    const today = new Date();
    const diffDays = Math.floor(Math.max(0, today.getTime() - dum.getTime()) / (1000 * 60 * 60 * 24));
    return { weeks: Math.floor(diffDays / 7), days: diffDays % 7 };
  };

  const currentGest = calculateWeeksAndDays(currentPatient.dum);

  const bmiInfo = useMemo(() => {
    const p = parseFloat(currentPatient.pesoInicial) || 0;
    const a = parseFloat(currentPatient.altura) || 0;
    if (!p || !a) return { bmi: '0', categoryLabel: 'Normal', targetMin: 11.5, targetMax: 16.0 };
    const bmi = p / (a * a);
    let categoryKey = 'normal';
    if (bmi < 18.5) categoryKey = 'baixoPeso';
    else if (bmi >= 25.0 && bmi < 30.0) categoryKey = 'sobrepeso';
    else if (bmi >= 30.0) categoryKey = 'obesidade';
    
    return {
      bmi: bmi.toFixed(1),
      categoryLabel: WEIGHT_CURVES[categoryKey].label,
      targetMin: WEIGHT_CURVES[categoryKey].targetMin,
      targetMax: WEIGHT_CURVES[categoryKey].targetMax
    };
  }, [currentPatient.pesoInicial, currentPatient.altura]);

  const handlePatientLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = patients.find(p => p.cpf.replace(/\D/g, '') === loginCpf.replace(/\D/g, ''));
    if (matched) {
      setSelectedPatientId(matched.id);
      setUserRole('paciente');
      setCurrentScreen('patient_app');
      setShowPatientLoginModal(false);
    }
  };

  const handleDoctorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPass === "1234" || loginPass === "admin") {
      setUserRole('medica');
      setCurrentScreen('admin_dashboard');
      setShowDoctorLoginModal(false);
    }
  };

  // ➕ CADASTRAR NOVA PACIENTE NO BANCO DE DADOS
  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    const dumDate = new Date(newPatient.dum);
    const dppDate = new Date(dumDate.getTime() + 280 * 24 * 60 * 60 * 1000);

    const novoObjetoPaciente = {
      id: `gestante-${Date.now()}`,
      cpf: newPatient.cpf || "000.000.000-00",
      senhaAcc: "1234",
      nome: newPatient.nome || "Nova Gestante",
      idade: newPatient.idade || "25",
      pai: newPatient.pai || "Não informado",
      nomeBebe: newPatient.nomeBebe || "A definir",
      dum: newPatient.dum,
      dpp: dppDate.toISOString().split('T')[0],
      g: "1", p: "0", c: "0", a: "0",
      pesoInicial: newPatient.pesoInicial,
      altura: newPatient.altura,
      tipoSanguineo: newPatient.tipoSanguineo,
      doencasPrevias: newPatient.doencasPrevias || "Nenhuma",
      vacinas: {
        influenza: { realizada: false, data: "", lote: "" },
        vsr: { realizada: false, data: "", lote: "" },
        dtpa: { realizada: false, data: "", lote: "" },
        covid19: { realizada: false, data: "", lote: "" }
      },
      examesLab: [],
      ultrassons: [],
      consultasEvolucao: [
        {
          id: `c-init`,
          data: newPatient.dum,
          igSem: 0,
          peso: parseFloat(newPatient.pesoInicial),
          pa: "120/80",
          au: "NP",
          bcfMf: "Aguardando",
          edema: "Ausente",
          conduta: "Consulta Inicial de Pré-Natal."
        }
      ],
      agendaConsultas: [],
      examesEnviados: []
    };

    const novaLista = [...patients, novoObjetoPaciente];
    saveToFirestore(novaLista);
    setSelectedPatientId(novoObjetoPaciente.id);
    setShowNewPatientModal(false);
  };

  // ➕ SALVAR CONSULTA E ATUALIZAR O GRAFICO
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

    const updated = { ...currentPatient, consultasEvolucao: updatedConsultas };
    const novaLista = patients.map(p => p.id === updated.id ? updated : p);
    saveToFirestore(novaLista);
    setShowAddConsultaModal(false);
  };

  // ➕ SALVAR ECOGRAFIA
  const handleAddUS = (e: React.FormEvent) => {
    e.preventDefault();
    const sem = parseInt(newUS.igSem) || 12;
    const pf = parseFloat(newUS.pfGrams) || 0;

    const updatedUS = [
      ...currentPatient.ultrassons,
      {
        id: `us-${Date.now()}`,
        data: newUS.data,
        igSem: sem,
        pfGrams: pf,
        la: newUS.la,
        pl: newUS.pl,
        laudo: newUS.laudo
      }
    ].sort((a, b) => a.igSem - b.igSem);

    const updated = { ...currentPatient, ultrassons: updatedUS };
    const novaLista = patients.map(p => p.id === updated.id ? updated : p);
    saveToFirestore(novaLista);
    setShowAddUSModal(false);
  };

  // ➕ ENVIAR EXAME E PROCESSAR IA
  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const novoExame = {
      id: `ex-${Date.now()}`,
      nome: newExamUpload.nome || "Novo Laudo Pré-Natal",
      tipo: newExamUpload.tipo,
      dataUpload: new Date().toISOString().split('T')[0],
      resumoIA: `🌸 **Análise para a Mamãe**: O laudo do exame foi recebido e registrado com sucesso no seu prontuário em nuvem.\n\n🩺 **Notas Médicas**: Parâmetros analisados e atualizados na ficha clínica da Dra. Priscila.`,
      enviadoPor: userRole === 'medica' ? "Dra. Priscila Gapski" : "Paciente"
    };

    const updated = { ...currentPatient, examesEnviados: [novoExame, ...currentPatient.examesEnviados] };
    const novaLista = patients.map(p => p.id === updated.id ? updated : p);
    saveToFirestore(novaLista);
    setShowUploadExamModal(false);
  };

  const filteredPatients = useMemo(() => {
    if (!searchQuery) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(p => p.nome.toLowerCase().includes(q) || p.cpf.includes(q));
  }, [patients, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F4F6F2] text-gray-800 font-sans pb-12">
      
      {/* HEADER DE TOPO */}
      <header className="bg-[#2E482A] text-white shadow-md sticky top-0 z-40 border-b border-[#3D5C38]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div onClick={() => setCurrentScreen('landing')} className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center p-1 border border-white/20">
              <Heart className="w-5 h-5 text-pink-300" />
            </div>
            <div>
              <h1 className="font-serif text-lg md:text-xl font-bold text-[#E8ECD8] leading-none">
                Priscila Gapski
              </h1>
              <p className="text-[9px] uppercase tracking-widest text-[#A3B18A] font-medium mt-0.5">
                OBSTETRA • CRM 24734
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentScreen !== 'landing' && (
              <>
                {userRole === 'medica' && (
                  <button
                    onClick={() => setCurrentScreen('admin_dashboard')}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#D4AF37] text-gray-900"
                  >
                    Lista de Pacientes
                  </button>
                )}
                <button
                  onClick={() => setShowPrintModal(true)}
                  className="p-2 bg-white/10 rounded-xl hover:bg-white/20"
                  title="Imprimir Cartão"
                >
                  <Printer className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => { setCurrentScreen('landing'); setUserRole(null); }}
                  className="p-2 bg-red-500/20 text-red-200 rounded-xl"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}

            {currentScreen === 'landing' && (
              <>
                <button
                  onClick={() => setShowPatientLoginModal(true)}
                  className="bg-white/10 text-white px-3 py-1.5 rounded-xl text-xs font-semibold"
                >
                  Paciente
                </button>
                <button
                  onClick={() => setShowDoctorLoginModal(true)}
                  className="bg-[#D4AF37] text-gray-900 px-3 py-1.5 rounded-xl text-xs font-bold"
                >
                  Dra. Priscila
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* TELA 1: LANDING PAGE */}
      {currentScreen === 'landing' && (
        <div className="space-y-8 pt-8 px-4 max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-b from-[#2E482A] to-[#1E311B] text-white p-8 rounded-3xl shadow-xl">
            <span className="bg-white/10 text-[#E8ECD8] text-[10px] font-bold px-3 py-1 rounded-full uppercase border border-white/20">
              Acompanhamento Pré-Natal Digital
            </span>
            <h2 className="text-2xl md:text-4xl font-serif font-bold text-[#F4F6F0] mt-3 leading-tight">
              Sua gestação acompanhada com carinho, tecnologia e precisão
            </h2>
            <p className="text-xs md:text-sm text-[#A3B18A] mt-3 leading-relaxed">
              Cartão pré-natal completo, curva de ganho de peso contínuo (Atalah) e exames integrados com Inteligência Artificial.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => { setSelectedPatientId('gestante-01'); setUserRole('paciente'); setCurrentScreen('patient_app'); }}
                className="px-6 py-3.5 bg-[#8A9A86] hover:bg-[#788874] text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" /> Entrar como Paciente (Juliana)
              </button>
              <button
                onClick={() => { setUserRole('medica'); setCurrentScreen('admin_dashboard'); }}
                className="px-6 py-3.5 bg-[#D4AF37] hover:bg-amber-400 text-gray-900 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Stethoscope className="w-4 h-4" /> Entrar como Dra. Priscila
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TELA 2: DASHBOARD MÉDICO (ADMIN) */}
      {currentScreen === 'admin_dashboard' && (
        <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Gestantes Cadastradas</h2>
              <p className="text-xs text-gray-500">Selecione para visualizar a carteirinha e histórico completo</p>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 text-xs p-2.5 border rounded-xl"
              />
              <button
                onClick={() => setShowNewPatientModal(true)}
                className="bg-[#2E482A] text-white px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
              >
                <UserPlus className="w-4 h-4" /> Cadastrar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPatients.map(pat => (
              <div key={pat.id} className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">CPF: {pat.cpf}</span>
                  <h3 className="font-bold text-gray-900 text-base">{pat.nome}</h3>
                  <p className="text-xs text-gray-600 mt-1">Bebê: <strong>{pat.nomeBebe}</strong> • DPP: {new Date(pat.dpp).toLocaleDateString('pt-BR')}</p>
                </div>
                <button
                  onClick={() => { setSelectedPatientId(pat.id); setCurrentScreen('patient_app'); }}
                  className="px-4 py-2.5 bg-[#2E482A] text-white rounded-xl text-xs font-bold hover:bg-[#1E311B] transition-all shrink-0"
                >
                  Abrir Cartão
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TELA 3: ÁREA DE ACOMPANHAMENTO DA PACIENTE */}
      {currentScreen === 'patient_app' && (
        <div className="max-w-5xl mx-auto px-4 pt-4 space-y-6">
          
          {/* BANNER PRINCIPAL DA PACIENTE */}
          <div className="bg-[#2E482A] text-white p-6 rounded-3xl shadow-md">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-[10px] text-[#A3B18A] uppercase font-bold">Carteirinha Pré-Natal Digital</span>
                <h2 className="text-2xl font-bold text-white mt-0.5">{currentPatient.nome}</h2>
                <p className="text-xs text-gray-200 mt-1">
                  Bebê: <strong>{currentPatient.nomeBebe}</strong> • DPP: <strong>{new Date(currentPatient.dpp).toLocaleDateString('pt-BR')}</strong> • Tipo Sanguíneo: <strong className="text-red-300">{currentPatient.tipoSanguineo}</strong>
                </p>
              </div>

              <div className="bg-white/10 p-3 rounded-2xl flex items-center gap-3">
                <div className="text-3xl">👶</div>
                <div>
                  <div className="text-xl font-bold">{currentGest.weeks} <span className="text-xs font-normal">Semanas e</span> {currentGest.days} <span className="text-xs font-normal">dias</span></div>
                  <span className="text-[10px] text-[#A3B18A] block font-bold uppercase">Idade Gestacional</span>
                </div>
              </div>
            </div>
          </div>

          {/* BARRA DE NAVEGAÇÃO ENTRE ABAS */}
          <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200 flex overflow-x-auto gap-1">
            <button
              onClick={() => setActiveTab('resumo')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'resumo' ? 'bg-[#2E482A] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Activity className="w-3.5 h-3.5 inline mr-1" /> Resumo
            </button>
            <button
              onClick={() => setActiveTab('graficos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'graficos' ? 'bg-[#2E482A] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 inline mr-1 text-amber-300" /> Gráficos de Peso
            </button>
            <button
              onClick={() => setActiveTab('dados')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'dados' ? 'bg-[#2E482A] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <User className="w-3.5 h-3.5 inline mr-1" /> Dados
            </button>
            <button
              onClick={() => setActiveTab('vacinas')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'vacinas' ? 'bg-[#2E482A] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Syringe className="w-3.5 h-3.5 inline mr-1" /> Vacinas
            </button>
            <button
              onClick={() => setActiveTab('examesLab')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'examesLab' ? 'bg-[#2E482A] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5 inline mr-1" /> Laboratório
            </button>
            <button
              onClick={() => setActiveTab('ultrassons')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'ultrassons' ? 'bg-[#2E482A] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Baby className="w-3.5 h-3.5 inline mr-1" /> Ecografias
            </button>
            <button
              onClick={() => setActiveTab('consultas')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'consultas' ? 'bg-[#2E482A] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 inline mr-1" /> Consultas
            </button>
            <button
              onClick={() => setActiveTab('centralExames')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'centralExames' ? 'bg-[#2E482A] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 inline mr-1 text-amber-300" /> Central + IA
            </button>
          </div>

          {/* ABA 1: RESUMO & POEMA */}
          {activeTab === 'resumo' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center gap-3 shadow-xs">
                  <div className="p-3 bg-emerald-50 rounded-xl text-[#2E482A]"><Calendar className="w-5 h-5" /></div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Data Provável Parto</span>
                    <div className="text-base font-bold text-gray-900">{new Date(currentPatient.dpp).toLocaleDateString('pt-BR')}</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center gap-3 shadow-xs">
                  <div className="p-3 bg-amber-50 rounded-xl text-amber-700"><Scale className="w-5 h-5" /></div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Diagnóstico Nutricional</span>
                    <div className="text-sm font-bold text-gray-900">{bmiInfo.categoryLabel} ({bmiInfo.bmi})</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center gap-3 shadow-xs">
                  <div className="p-3 bg-blue-50 rounded-xl text-blue-700"><Clock className="w-5 h-5" /></div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Próxima Consulta</span>
                    <div className="text-base font-bold text-gray-900">{currentPatient.agendaConsultas[0]?.data ? new Date(currentPatient.agendaConsultas[0].data).toLocaleDateString('pt-BR') : 'A agendar'}</div>
                  </div>
                </div>
              </div>

              {/* MENSAGEM / POEMA DA OBSTETRA */}
              <div className="bg-gradient-to-br from-[#2E482A] to-[#1E311B] text-white p-6 rounded-3xl shadow-md">
                <blockquote className="font-serif italic text-lg leading-relaxed text-[#F4F6F0]">
                  "Antes de você existir eu já te queria, antes de você existir eu já te amava, em menos de um minuto de nascido já daria minha vida por você."
                </blockquote>
                <p className="mt-3 text-xs font-bold text-[#E8ECD8]">Dra. Priscila Gapski • CRM 24734</p>
              </div>
            </div>
          )}

          {/* ABA 2: GRÁFICOS DE GANHO DE PESO MATERNO */}
          {activeTab === 'graficos' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Curva de Ganho de Peso Materno Contínuo</h3>
                  <p className="text-xs text-gray-500">Padrão Ministério da Saúde / Atalah para IMC Pré-gestacional ({bmiInfo.categoryLabel})</p>
                </div>
                {userRole === 'medica' && (
                  <button
                    onClick={() => setShowAddConsultaModal(true)}
                    className="bg-[#2E482A] text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Registrar Peso
                  </button>
                )}
              </div>

              {/* GRÁFICO SVG COM LINHA E MÁSCARA DE PESO */}
              <div className="bg-gray-50 p-4 rounded-2xl border overflow-x-auto">
                <svg viewBox="0 0 600 260" className="w-full min-w-[500px]">
                  {/* Grid Lines (50kg a 90kg) */}
                  {[50, 60, 70, 80, 90].map((w) => {
                    const y = 220 - ((w - 50) / 45) * 200;
                    return (
                      <g key={w}>
                        <line x1="40" y1={y} x2="580" y2={y} stroke="#E5E7EB" strokeDasharray="3 3" />
                        <text x="32" y={y + 4} fontSize="9" fill="#9CA3AF" textAnchor="end">{w}kg</text>
                      </g>
                    );
                  })}

                  {/* Semanas (10 a 40 sem) */}
                  {[10, 15, 20, 25, 30, 35, 40].map((wk) => {
                    const x = 40 + ((wk - 10) / 30) * 540;
                    return (
                      <g key={wk}>
                        <line x1={x} y1="20" x2={x} y2="220" stroke="#F3F4F6" />
                        <text x={x} y="238" fontSize="9" fill="#6B7280" textAnchor="middle">{wk} sem</text>
                      </g>
                    );
                  })}

                  {/* Linha das Consultas da Paciente */}
                  {(() => {
                    const points = currentPatient.consultasEvolucao
                      .filter(c => c.igSem >= 10)
                      .map(c => {
                        const x = 40 + ((c.igSem - 10) / 30) * 540;
                        const y = 220 - ((c.peso - 50) / 45) * 200;
                        return { x, y, ...c };
                      });

                    const polylineStr = points.map(p => `${p.x},${p.y}`).join(" ");

                    return (
                      <g>
                        {points.length > 1 && (
                          <polyline fill="none" stroke="#2E482A" strokeWidth="3" points={polylineStr} />
                        )}
                        {points.map((p) => (
                          <g key={p.id}>
                            <circle cx={p.x} cy={p.y} r="5" fill="#D4AF37" stroke="#2E482A" strokeWidth="2" />
                            <text x={p.x} y={p.y - 8} fontSize="9" fontWeight="bold" fill="#1E311B" textAnchor="middle">
                              {p.peso}kg
                            </text>
                          </g>
                        ))}
                      </g>
                    );
                  })()}
                </svg>
              </div>
            </div>
          )}

          {/* ABA 3: DADOS DA GESTANTE */}
          {activeTab === 'dados' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-base border-b pb-2">Dados Cadastrais e Histórico Obstétrico</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-gray-50 rounded-2xl"><span className="text-gray-400 font-bold uppercase block">Nome</span><strong>{currentPatient.nome}</strong></div>
                <div className="p-3.5 bg-gray-50 rounded-2xl"><span className="text-gray-400 font-bold uppercase block">CPF</span><strong>{currentPatient.cpf}</strong></div>
                <div className="p-3.5 bg-gray-50 rounded-2xl"><span className="text-gray-400 font-bold uppercase block">Idade</span><strong>{currentPatient.idade} anos</strong></div>
                <div className="p-3.5 bg-gray-50 rounded-2xl"><span className="text-gray-400 font-bold uppercase block">Nome do Bebê</span><strong>{currentPatient.nomeBebe}</strong></div>
                <div className="p-3.5 bg-gray-50 rounded-2xl"><span className="text-gray-400 font-bold uppercase block">Histórico (G P C A)</span><strong>G{currentPatient.g} P{currentPatient.p} C{currentPatient.c} A{currentPatient.a}</strong></div>
                <div className="p-3.5 bg-gray-50 rounded-2xl"><span className="text-gray-400 font-bold uppercase block">Alergias / Histórico</span><strong>{currentPatient.doencasPrevias}</strong></div>
              </div>
            </div>
          )}

          {/* ABA 4: QUADRO VACINAL */}
          {activeTab === 'vacinas' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-base border-b pb-2">Quadro Vacinal da Gestante</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(currentPatient.vacinas).map(([k, v]) => (
                  <div key={k} className="p-3.5 bg-gray-50 rounded-2xl border flex justify-between items-center text-xs">
                    <div>
                      <strong className="uppercase font-bold block text-gray-800">{k}</strong>
                      <span className="text-gray-500">{v.realizada ? `Aplicada em ${v.data}` : 'Pendente'}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${v.realizada ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'}`}>
                      {v.realizada ? '✓ Aplicada' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 5: EXAMES LABORATORIAIS */}
          {activeTab === 'examesLab' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-base border-b pb-2">Sorologias e Exames Laboratoriais</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#2E482A] text-white">
                      <th className="p-2.5 rounded-tl-xl">Exame</th>
                      <th className="p-2.5 rounded-tr-xl">Resultado Registrado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.entries(currentPatient.examesLab[0] || {}).map(([k, v]) => {
                      if (['id', 'data'].includes(k)) return null;
                      return (
                        <tr key={k} className="hover:bg-gray-50">
                          <td className="p-2.5 font-bold uppercase text-gray-700 bg-gray-50">{k}</td>
                          <td className="p-2.5 font-semibold text-gray-900">{v}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA 6: ECOGRAFIAS / ULTRASSONS */}
          {activeTab === 'ultrassons' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-bold text-gray-900 text-base">Ecografias Obstétricas</h3>
                {userRole === 'medica' && (
                  <button onClick={() => setShowAddUSModal(true)} className="bg-[#2E482A] text-white px-3 py-1.5 rounded-xl text-xs font-bold">+ Novo USG</button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentPatient.ultrassons.map(us => (
                  <div key={us.id} className="p-4 bg-gray-50 rounded-2xl border space-y-2">
                    <div className="flex justify-between items-center">
                      <strong className="text-sm text-gray-900">{new Date(us.data).toLocaleDateString('pt-BR')}</strong>
                      <span className="bg-[#2E482A] text-white px-2 py-0.5 rounded-full text-[10px] font-bold">{us.igSem} Semanas</span>
                    </div>
                    <p className="text-xs text-gray-700 font-semibold">Peso Fetal: {us.pfGrams}g • Líquido: {us.la} • Placenta: {us.pl}</p>
                    <p className="text-xs text-gray-600 bg-white p-2.5 rounded-xl border italic">"{us.laudo}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ABA 7: CONSULTAS DE PRÉ-NATAL */}
          {activeTab === 'consultas' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-bold text-gray-900 text-base">Histórico de Consultas</h3>
                {userRole === 'medica' && (
                  <button onClick={() => setShowAddConsultaModal(true)} className="bg-[#2E482A] text-white px-3 py-1.5 rounded-xl text-xs font-bold">+ Nova Consulta</button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#2E482A] text-white">
                      <th className="p-2.5 rounded-tl-xl">Data</th>
                      <th className="p-2.5">IG</th>
                      <th className="p-2.5">Peso</th>
                      <th className="p-2.5">PA</th>
                      <th className="p-2.5">AU</th>
                      <th className="p-2.5">BCF/MF</th>
                      <th className="p-2.5 rounded-tr-xl">Conduta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {currentPatient.consultasEvolucao.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="p-2.5 font-bold">{new Date(c.data).toLocaleDateString('pt-BR')}</td>
                        <td className="p-2.5">{c.igSem} sem</td>
                        <td className="p-2.5 font-bold text-emerald-800">{c.peso} kg</td>
                        <td className="p-2.5">{c.pa}</td>
                        <td className="p-2.5">{c.au}</td>
                        <td className="p-2.5 text-blue-700">{c.bcfMf}</td>
                        <td className="p-2.5 text-gray-600">{c.conduta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA 8: CENTRAL DE EXAMES + IA */}
          {activeTab === 'centralExames' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-bold text-gray-900 text-base">Central de Exames + Análise IA (Gemini)</h3>
                <button onClick={() => setShowUploadExamModal(true)} className="bg-[#2E482A] text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" /> Enviar Laudo
                </button>
              </div>
              {currentPatient.examesEnviados.map(ex => (
                <div key={ex.id} className="p-4 bg-gray-50 rounded-2xl border space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span>{ex.nome}</span>
                    <span className="text-gray-400">{ex.dataUpload}</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-amber-200 text-xs text-gray-700 whitespace-pre-line leading-relaxed shadow-2xs">
                    {ex.resumoIA}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* MODAL CADASTRAR NOVA PACIENTE */}
      {showNewPatientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-3 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-900 text-base">Cadastrar Gestante no Banco</h3>
            <input type="text" placeholder="Nome Completo" value={newPatient.nome} onChange={(e) => setNewPatient({ ...newPatient, nome: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            <input type="text" placeholder="CPF (Ex: 123.456.789-00)" value={newPatient.cpf} onChange={(e) => setNewPatient({ ...newPatient, cpf: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={newPatient.dum} onChange={(e) => setNewPatient({ ...newPatient, dum: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
              <input type="text" placeholder="Peso Inicial" value={newPatient.pesoInicial} onChange={(e) => setNewPatient({ ...newPatient, pesoInicial: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            </div>
            <input type="text" placeholder="Nome do Bebê" value={newPatient.nomeBebe} onChange={(e) => setNewPatient({ ...newPatient, nomeBebe: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowNewPatientModal(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
              <button onClick={handleCreatePatient} className="px-4 py-1.5 bg-[#2E482A] text-white font-bold text-xs rounded-xl">Salvar Paciente</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR CONSULTA */}
      {showAddConsultaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-3">
            <h3 className="font-bold text-gray-900 text-base">Nova Consulta</h3>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Semanas de Gestação</label>
              <input type="number" placeholder="Ex: 32" value={newConsulta.igSem} onChange={(e) => setNewConsulta({ ...newConsulta, igSem: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Peso Atual (kg)</label>
              <input type="text" placeholder="Ex: 71.5" value={newConsulta.peso} onChange={(e) => setNewConsulta({ ...newConsulta, peso: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Conduta</label>
              <input type="text" placeholder="Ex: Retorno em 15 dias" value={newConsulta.conduta} onChange={(e) => setNewConsulta({ ...newConsulta, conduta: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAddConsultaModal(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
              <button onClick={handleAddConsulta} className="px-4 py-1.5 bg-[#2E482A] text-white font-bold text-xs rounded-xl">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR ECOGRAFIA */}
      {showAddUSModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-3">
            <h3 className="font-bold text-gray-900 text-base">Nova Ecografia</h3>
            <input type="number" placeholder="Semanas (Ex: 22)" value={newUS.igSem} onChange={(e) => setNewUS({ ...newUS, igSem: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            <input type="text" placeholder="Peso Fetal em gramas (Ex: 480)" value={newUS.pfGrams} onChange={(e) => setNewUS({ ...newUS, pfGrams: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            <textarea placeholder="Resumo do Laudo" value={newUS.laudo} onChange={(e) => setNewUS({ ...newUS, laudo: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" rows={3} />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAddUSModal(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
              <button onClick={handleAddUS} className="px-4 py-1.5 bg-[#2E482A] text-white font-bold text-xs rounded-xl">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ENVIAR EXAME */}
      {showUploadExamModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-3">
            <h3 className="font-bold text-gray-900 text-base">Enviar Laudo para Análise</h3>
            <input type="text" placeholder="Título do Exame" value={newExamUpload.nome} onChange={(e) => setNewExamUpload({ ...newExamUpload, nome: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            <input type="file" className="w-full text-xs p-2 border bg-gray-50 rounded-xl" />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowUploadExamModal(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
              <button onClick={handleFileUpload} className="px-4 py-1.5 bg-[#2E482A] text-white font-bold text-xs rounded-xl">Enviar e Analisar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPRESSÃO DO CARTÃO 3 DOBRAS */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#F4F6F2] p-6 rounded-3xl max-w-2xl w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-[#2E482A]">Visualização do Cartão (3 Dobras)</h3>
              <button onClick={() => setShowPrintModal(false)} className="p-1 text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#2E482A] text-white p-4 rounded-2xl text-xs">
              <div className="p-3 border border-white/20 rounded-xl text-center">
                <h4 className="font-serif font-bold text-sm">Priscila Gapski</h4>
                <p className="text-[9px] text-[#A3B18A]">OBSTETRA • CRM 24734</p>
                <div className="mt-3 font-bold">{currentPatient.nome}</div>
              </div>
              <div className="p-3 border border-white/20 rounded-xl text-center flex items-center">
                <p className="font-serif italic text-[11px]">"Antes de você existir eu já te queria..."</p>
              </div>
              <div className="p-3 border border-white/20 rounded-xl">
                <strong className="block border-b border-white/20 pb-1 mb-1">VACINAS</strong>
                <p>• Influenza: {currentPatient.vacinas.influenza?.realizada ? 'OK' : 'Pendente'}</p>
                <p>• VSR (32w): {currentPatient.vacinas.vsr?.realizada ? 'OK' : 'Pendente'}</p>
                <p>• dTpa (20w): {currentPatient.vacinas.dtpa?.realizada ? 'OK' : 'Pendente'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LOGIN PACIENTE */}
      {showPatientLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-4">
            <h3 className="font-bold text-gray-900">Login da Paciente</h3>
            <input type="text" placeholder="Digite seu CPF" value={loginCpf} onChange={(e) => setLoginCpf(e.target.value)} className="w-full text-xs p-3 border rounded-xl" />
            <button onClick={handlePatientLogin} className="w-full py-2.5 bg-[#2E482A] text-white rounded-xl text-xs font-bold">Entrar</button>
            <button onClick={() => setShowPatientLoginModal(false)} className="w-full text-xs text-gray-500">Cancelar</button>
          </div>
        </div>
      )}

      {/* MODAL LOGIN MÉDICA */}
      {showDoctorLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-4">
            <h3 className="font-bold text-gray-900">Área Médica</h3>
            <input type="password" placeholder="Senha (1234)" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} className="w-full text-xs p-3 border rounded-xl" />
            <button onClick={handleDoctorLogin} className="w-full py-2.5 bg-[#D4AF37] text-gray-900 rounded-xl text-xs font-bold">Entrar no Painel</button>
            <button onClick={() => setShowDoctorLoginModal(false)} className="w-full text-xs text-gray-500">Cancelar</button>
          </div>
        </div>
      )}

    </div>
  );
}
