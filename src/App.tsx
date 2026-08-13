import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, FileText, Activity, Heart, Upload, Download, Sparkles, User, 
  Plus, Trash2, Edit3, CheckCircle2, Clock, ShieldCheck, Baby, Stethoscope, 
  LogOut, Share2, Printer, Eye, X, ChevronRight, AlertCircle, Syringe, Scale,
  Lock, ArrowRight, FileCheck, RefreshCw, ChevronDown, Check, Search, Users,
  TrendingUp, Info, UserPlus, LogIn, ChevronLeft, Award
} from 'lucide-react';

// --- CURVAS REFERENCIAIS DE GANHO DE PESO MATERNO (ATALAH / MINISTÉRIO DA SAÚDE) ---
const WEIGHT_CURVES = {
  baixoPeso: { label: 'Baixo Peso (IMC < 18,5)', targetMin: 12.5, targetMax: 18.0, color: '#3B82F6' },
  normal: { label: 'Peso Normal (IMC 18,5 - 24,9)', targetMin: 11.5, targetMax: 16.0, color: '#10B981' },
  sobrepeso: { label: 'Sobrepeso (IMC 25,0 - 29,9)', targetMin: 7.0, targetMax: 11.5, color: '#F59E0B' },
  obesidade: { label: 'Obesidade (IMC ≥ 30,0)', targetMin: 5.0, targetMax: 9.0, color: '#EF4444' }
};

// --- DATASET INICIAL DE PACIENTES DEMO ---
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
    doencasPrevias: "Nenhuma (Alergia a Dipirona)",
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
        gbs: "Pendente"
      }
    ],
    ultrassons: [
      { id: "us-1", data: "2026-02-25", igSem: 6, pfGrams: 0, la: "Normal", pl: "Trofoblasto", laudo: "Saco gestacional único com BCF visível (124 bpm)." },
      { id: "us-2", data: "2026-04-10", igSem: 12, pfGrams: 62, la: "Normal", pl: "Anterior", laudo: "TN 1.2mm, osso nasal presente. Risco baixo." },
      { id: "us-3", data: "2026-06-18", igSem: 22, pfGrams: 480, la: "Normal", pl: "Posterior", laudo: "Morfológico do 2º Trimestre sem anomalias." },
      { id: "us-4", data: "2026-07-28", igSem: 28, pfGrams: 1210, la: "Normal", pl: "Posterior G1", laudo: "Feto em P50 para peso, Doppler mantido normal." }
    ],
    consultasEvolucao: [
      { id: "c-1", data: "2026-02-20", igSem: 6, peso: 62.5, pa: "110/70", au: "NP", bcfMf: "Visível USG", edema: "Ausente", conduta: "Início do Ácido Fólico." },
      { id: "c-2", data: "2026-03-24", igSem: 10, peso: 63.1, pa: "115/75", au: "NP", bcfMf: "152 bpm", edema: "Ausente", conduta: "Solicitado Morfológico 1º Trim." },
      { id: "c-3", data: "2026-04-28", igSem: 15, peso: 64.2, pa: "110/70", au: "14 cm", bcfMf: "148 bpm", edema: "Ausente", conduta: "Suplementação mantida." },
      { id: "c-4", data: "2026-05-26", igSem: 19, peso: 65.8, pa: "120/75", au: "18 cm", bcfMf: "144 bpm", edema: "Ausente", conduta: "Prescrito Ferro elementar." },
      { id: "c-5", data: "2026-06-30", igSem: 24, peso: 67.3, pa: "115/70", au: "23 cm", bcfMf: "140 bpm", edema: "Leve", conduta: "TOTG 75g solicitado." },
      { id: "c-6", data: "2026-07-28", igSem: 28, peso: 69.0, pa: "118/76", au: "27 cm", bcfMf: "142 bpm", edema: "Leve", conduta: "Vacina VSR aplicada." }
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
        arquivoNome: "morfológico_juliana_22w.pdf",
        resumoIA: "🌸 **Para a Mamãe**: O Arthur está crescendo muito bem! O exame de 22 semanas confirmou boa formação cardíaca e movimentos ativos.\n\n🩺 **Para Dra. Priscila**: PF 480g (P50), ILA 14cm. Placenta posterior sem grau avançado.",
        enviadoPor: "Dra. Priscila Gapski"
      }
    ]
  },
  {
    id: "gestante-02",
    cpf: "987.654.321-11",
    senhaAcc: "1234",
    nome: "Camila Guimarães Rocha",
    idade: "32",
    pai: "Eduardo Rocha",
    nomeBebe: "Beatriz",
    dum: "2026-02-10",
    dpp: "2026-11-17",
    g: "2", p: "1", c: "1", a: "0",
    pesoInicial: "78.0",
    altura: "1.62",
    tipoSanguineo: "O+",
    doencasPrevias: "Hipotireoidismo controlado com Levotiroxina",
    vacinas: {
      influenza: { realizada: true, data: "2026-04-05", lote: "INF-02" },
      vsr: { realizada: false, data: "", lote: "" },
      dtpa: { realizada: true, data: "2026-06-15", lote: "DTP-88" },
      hepatiteB_1: { realizada: true, data: "2026-03-01", lote: "HEP-1" },
      hepatiteB_2: { realizada: true, data: "2026-04-02", lote: "HEP-2" },
      hepatiteB_3: { realizada: true, data: "2026-06-02", lote: "HEP-3" },
      covid19: { realizada: true, data: "2026-03-10", lote: "COV" },
      outras: ""
    },
    examesLab: [],
    ultrassons: [
      { id: "us-c1", data: "2026-03-20", igSem: 6, pfGrams: 0, la: "Normal", pl: "Anterior", laudo: "Gesta única, BCF 130 bpm." },
      { id: "us-c2", data: "2026-05-10", igSem: 13, pfGrams: 75, la: "Normal", pl: "Anterior", laudo: "Morfológico 1º Trimestre normal." }
    ],
    consultasEvolucao: [
      { id: "cc-1", data: "2026-03-15", igSem: 5, peso: 78.0, pa: "120/80", au: "NP", bcfMf: "Visível", edema: "Ausente", conduta: "Ajuste de dose Levotiroxina." },
      { id: "cc-2", data: "2026-04-20", igSem: 10, peso: 78.8, pa: "118/78", au: "NP", bcfMf: "150 bpm", edema: "Ausente", conduta: "Rotina 1º Trim sem alterações." },
      { id: "cc-3", data: "2026-05-25", igSem: 15, peso: 80.1, pa: "122/80", au: "15 cm", bcfMf: "145 bpm", edema: "Ausente", conduta: "Encaminhado retorno TSH." }
    ],
    agendaConsultas: [
      { id: "ag-c1", data: "2026-08-18", horario: "16:00", tipo: "Consulta de Rotina", status: "Agendada" }
    ],
    examesEnviados: []
  }
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [userRole, setUserRole] = useState(null);
  const [patients, setPatients] = useState(initialPatientsList);
  const [selectedPatientId, setSelectedPatientId] = useState("gestante-01");
  const [searchQuery, setSearchQuery] = useState("");

  const [showPatientLoginModal, setShowPatientLoginModal] = useState(false);
  const [showDoctorLoginModal, setShowDoctorLoginModal] = useState(false);
  const [loginCpf, setLoginCpf] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");

  const currentPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId) || patients[0];
  }, [patients, selectedPatientId]);

  const [activeTab, setActiveTab] = useState('resumo');
  const [graphMode, setGraphMode] = useState('pesoMaterno');

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showAddConsultaModal, setShowAddConsultaModal] = useState(false);
  const [showAddUSModal, setShowAddUSModal] = useState(false);
  const [showUploadExamModal, setShowUploadExamModal] = useState(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);

  const [newConsulta, setNewConsulta] = useState({
    data: new Date().toISOString().split('T')[0],
    igSem: '', peso: '', pa: '120/80', au: '', bcfMf: '140 bpm / MF+', edema: 'Ausente', conduta: ''
  });

  const [newUS, setNewUS] = useState({
    data: new Date().toISOString().split('T')[0],
    igSem: '', pfGrams: '', la: 'Normal', pl: 'Normoinserida', laudo: ''
  });

  const [newPatientData, setNewPatientData] = useState({
    cpf: '', senhaAcc: '1234', nome: '', idade: '', pai: '', nomeBebe: '',
    dum: new Date().toISOString().split('T')[0], dpp: '', g: '1', p: '0', c: '0', a: '0',
    pesoInicial: '60.0', altura: '1.65', tipoSanguineo: 'O+', doencasPrevias: ''
  });

  const [newExamUpload, setNewExamUpload] = useState({
    nome: '', tipo: 'Ecografia', arquivoNome: '', textoLaudo: ''
  });

  const calculateWeeksAndDays = (dumStr) => {
    if (!dumStr) return { weeks: 0, days: 0, text: "Não calculada" };
    const dum = new Date(dumStr);
    const today = new Date();
    const diffTime = Math.max(0, today - dum);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;
    return { weeks, days, text: `${weeks} sem e ${days} d` };
  };

  const currentGest = calculateWeeksAndDays(currentPatient.dum);

  const bmiInfo = useMemo(() => {
    const p = parseFloat(currentPatient.pesoInicial) || 0;
    const a = parseFloat(currentPatient.altura) || 0;
    if (!p || !a) return { bmi: 0, categoryKey: 'normal', categoryLabel: 'Normal' };
    const bmi = p / (a * a);
    let categoryKey = 'normal';
    if (bmi < 18.5) categoryKey = 'baixoPeso';
    else if (bmi >= 18.5 && bmi < 25.0) categoryKey = 'normal';
    else if (bmi >= 25.0 && bmi < 30.0) categoryKey = 'sobrepeso';
    else categoryKey = 'obesidade';
    
    return {
      bmi: bmi.toFixed(1),
      categoryKey,
      categoryLabel: WEIGHT_CURVES[categoryKey].label,
      targetMin: WEIGHT_CURVES[categoryKey].targetMin,
      targetMax: WEIGHT_CURVES[categoryKey].targetMax,
      color: WEIGHT_CURVES[categoryKey].color
    };
  }, [currentPatient.pesoInicial, currentPatient.altura]);

  const handlePatientLogin = (e) => {
    e.preventDefault();
    setLoginError("");
    const matched = patients.find(p => p.cpf.replace(/\D/g, '') === loginCpf.replace(/\D/g, ''));
    if (matched) {
      setSelectedPatientId(matched.id);
      setUserRole('paciente');
      setCurrentScreen('patient_app');
      setShowPatientLoginModal(false);
    } else {
      setLoginError("CPF não encontrado na base do consultório.");
    }
  };

  const handleDoctorLogin = (e) => {
    e.preventDefault();
    setLoginError("");
    if (loginPass === "1234" || loginPass === "admin") {
      setUserRole('medica');
      setCurrentScreen('admin_dashboard');
      setShowDoctorLoginModal(false);
    } else {
      setLoginError("Senha incorreta. Tente '1234'.");
    }
  };

  const handleDemoPatientLogin = (patientId) => {
    setSelectedPatientId(patientId);
    setUserRole('paciente');
    setCurrentScreen('patient_app');
  };

  const handleDemoDoctorLogin = () => {
    setUserRole('medica');
    setCurrentScreen('admin_dashboard');
  };

  const handleAddConsulta = (e) => {
    e.preventDefault();
    const sem = parseInt(newConsulta.igSem) || currentGest.weeks || 1;
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

  const filteredPatients = useMemo(() => {
    if (!searchQuery) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(p => 
      p.nome.toLowerCase().includes(q) || 
      p.cpf.includes(q)
    );
  }, [patients, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F4F6F2] text-gray-800 font-sans pb-12">
      
      {/* HEADER */}
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
                  onClick={() => { setCurrentScreen('landing'); setUserRole(null); }}
                  className="p-2 bg-red-500/20 text-red-200 rounded-xl"
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

      {/* LANDING SCREEN */}
      {currentScreen === 'landing' && (
        <div className="space-y-8 pt-8 px-4 max-w-4xl mx-auto text-center">
          <div className="bg-[#2E482A] text-white p-8 rounded-3xl shadow-lg">
            <h2 className="text-2xl md:text-4xl font-serif font-bold text-[#F4F6F0]">
              Carteirinha Pré-Natal Digital
            </h2>
            <p className="text-xs md:text-sm text-[#A3B18A] mt-2">
              Acompanhamento de gestação, curvas de peso e laudos com inteligência artificial.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => handleDemoPatientLogin('gestante-01')}
                className="px-6 py-3 bg-[#8A9A86] text-white rounded-2xl font-bold text-xs"
              >
                Entrar como Paciente (Demo)
              </button>
              <button
                onClick={handleDemoDoctorLogin}
                className="px-6 py-3 bg-[#D4AF37] text-gray-900 rounded-2xl font-bold text-xs"
              >
                Entrar como Dra. Priscila (Demo)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN DASHBOARD */}
      {currentScreen === 'admin_dashboard' && (
        <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Gestantes Cadastradas</h2>
              <p className="text-xs text-gray-500">Selecione para abrir o cartão</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPatients.map(pat => (
              <div key={pat.id} className="bg-white p-5 rounded-2xl border border-gray-200 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-900">{pat.nome}</h3>
                  <p className="text-xs text-gray-500">Bebê: {pat.nomeBebe} • DPP: {pat.dpp}</p>
                </div>
                <button
                  onClick={() => { setSelectedPatientId(pat.id); setCurrentScreen('patient_app'); }}
                  className="px-4 py-2 bg-[#2E482A] text-white rounded-xl text-xs font-bold"
                >
                  Abrir Cartão
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PATIENT APP SCREEN */}
      {currentScreen === 'patient_app' && (
        <div className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
          
          <div className="bg-[#2E482A] text-white p-6 rounded-3xl flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">{currentPatient.nome}</h2>
              <p className="text-xs text-[#A3B18A]">Bebê: {currentPatient.nomeBebe} • DPP: {currentPatient.dpp}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold">{currentGest.weeks}</span>
              <span className="text-xs block text-[#A3B18A]">Semanas</span>
            </div>
          </div>

          {/* GRÁFICO SVG SIMPLIFICADO */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 space-y-4">
            <h3 className="font-bold text-gray-900 text-sm">Curva de Ganho de Peso Materno</h3>
            <div className="w-full overflow-x-auto">
              <svg viewBox="0 0 500 200" className="w-full min-w-[400px]">
                <rect x="30" y="10" width="450" height="150" fill="#F9FAFB" stroke="#E5E7EB" />
                {currentPatient.consultasEvolucao.map((c, i) => {
                  const x = 30 + (c.igSem / 40) * 450;
                  const y = 160 - ((c.peso - 50) / 40) * 150;
                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r="4" fill="#2E482A" />
                      <text x={x} y={y - 8} fontSize="8" textAnchor="middle">{c.peso}kg</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

        </div>
      )}

      {/* MODAL DE LOGIN DA PACIENTE */}
      {showPatientLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-4">
            <h3 className="font-bold text-gray-900">Login da Paciente</h3>
            <input
              type="text"
              placeholder="Digite seu CPF"
              value={loginCpf}
              onChange={(e) => setLoginCpf(e.target.value)}
              className="w-full text-xs p-3 border rounded-xl"
            />
            <button
              onClick={handlePatientLogin}
              className="w-full py-2.5 bg-[#2E482A] text-white rounded-xl text-xs font-bold"
            >
              Entrar
            </button>
            <button onClick={() => setShowPatientLoginModal(false)} className="w-full text-xs text-gray-500">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE LOGIN DA MÉDICA */}
      {showDoctorLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-4">
            <h3 className="font-bold text-gray-900">Área Médica</h3>
            <input
              type="password"
              placeholder="Senha (1234)"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              className="w-full text-xs p-3 border rounded-xl"
            />
            <button
              onClick={handleDoctorLogin}
              className="w-full py-2.5 bg-[#D4AF37] text-gray-900 rounded-xl text-xs font-bold"
            >
              Entrar no Painel
            </button>
            <button onClick={() => setShowDoctorLoginModal(false)} className="w-full text-xs text-gray-500">
              Cancelar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

