import React, { useState, useMemo } from 'react';
import { 
  Calendar, FileText, Activity, Heart, Upload, Sparkles, User, 
  Plus, Edit3, Clock, Baby, Stethoscope, LogOut, Printer, X, 
  ChevronRight, Syringe, Scale, FileCheck, Check, Search, 
  TrendingUp, RefreshCw
} from 'lucide-react';

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
  const [graphMode, setGraphMode] = useState('pesoMaterno');

  const [showPatientLoginModal, setShowPatientLoginModal] = useState(false);
  const [showDoctorLoginModal, setShowDoctorLoginModal] = useState(false);
  const [showAddConsultaModal, setShowAddConsultaModal] = useState(false);
  const [showAddUSModal, setShowAddUSModal] = useState(false);
  const [showUploadExamModal, setShowUploadExamModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const [loginCpf, setLoginCpf] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const currentPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId) || patients[0];
  }, [patients, selectedPatientId]);

  const [newConsulta, setNewConsulta] = useState({
    data: new Date().toISOString().split('T')[0],
    igSem: '', peso: '', pa: '120/80', au: '', bcfMf: '140 bpm / MF+', edema: 'Ausente', conduta: ''
  });

  const [newUS, setNewUS] = useState({
    data: new Date().toISOString().split('T')[0],
    igSem: '', pfGrams: '', la: 'Normal', pl: 'Normoinserida', laudo: ''
  });

  const [newExamUpload, setNewExamUpload] = useState({
    nome: '', tipo: 'Ecografia', arquivoNome: '', textoLaudo: ''
  });

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
    setPatients(patients.map(p => p.id === updated.id ? updated : p));
    setShowAddConsultaModal(false);
  };

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
    setPatients(patients.map(p => p.id === updated.id ? updated : p));
    setShowAddUSModal(false);
  };

  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const novoExame = {
      id: `ex-${Date.now()}`,
      nome: newExamUpload.nome || "Novo Laudo Pré-Natal",
      tipo: newExamUpload.tipo,
      dataUpload: new Date().toISOString().split('T')[0],
      resumoIA: `🌸 **Análise para a Mamãe**: O laudo do exame foi recebido com sucesso e adicionado ao seu histórico de acompanhamento.\n\n🩺 **Notas Médicas**: Parâmetros analisados e arquivados no prontuário da Dra. Priscila.`,
      enviadoPor: userRole === 'medica' ? "Dra. Priscila Gapski" : "Paciente"
    };

    const updated = { ...currentPatient, examesEnviados: [novoExame, ...currentPatient.examesEnviados] };
    setPatients(patients.map(p => p.id === updated.id ? updated : p));
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
            <div className="w-full sm:w-auto">
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 text-xs p-2.5 border rounded-xl"
              />
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
              className={`px-4 py-2 rounde
