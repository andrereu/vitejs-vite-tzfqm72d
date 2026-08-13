import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Activity, Heart, Upload, Sparkles, User, 
  Plus, Clock, Baby, Stethoscope, LogOut, Printer, X, 
  Syringe, Scale, FileCheck, Check, Search, 
  TrendingUp, UserPlus
} from 'lucide-react';

import { db } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

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
      covid19: { realizada: true, data: "2026-02-15", lote: "COV-3" }
    },
    examesLab: [
      { id: "lab-1", hbVg: "12.8 / 38%", plaquetas: "245.000", glicemia: "82 mg/dL", hiv: "Não Reativo", sifilis: "Não Reativo", tsh: "1.8 mUI/L" }
    ],
    ultrassons: [
      { id: "us-1", data: "2026-02-25", igSem: 6, pfGrams: 0, la: "Normal", pl: "Trofoblasto", laudo: "Saco gestacional único com BCF visível (124 bpm)." },
      { id: "us-2", data: "2026-04-10", igSem: 12, pfGrams: 62, la: "Normal", pl: "Anterior", laudo: "TN 1.2mm, osso nasal presente. Risco baixo." }
    ],
    consultasEvolucao: [
      { id: "c-1", data: "2026-02-20", igSem: 6, peso: 62.5, pa: "110/70", au: "NP", bcfMf: "Visível USG", edema: "Ausente", conduta: "Início do Ácido Fólico." },
      { id: "c-2", data: "2026-03-24", igSem: 10, peso: 63.1, pa: "115/75", au: "NP", bcfMf: "152 bpm", edema: "Ausente", conduta: "Solicitado Morfológico 1º Trim." },
      { id: "c-3", data: "2026-04-28", igSem: 15, peso: 64.2, pa: "110/70", au: "14 cm", bcfMf: "148 bpm", edema: "Ausente", conduta: "Exames 1º trim normais." }
    ],
    agendaConsultas: [{ id: "ag-1", data: "2026-08-25", horario: "14:30", tipo: "Consulta Pré-Natal (32 sem)" }],
    examesEnviados: []
  }
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'patient_app' | 'admin_dashboard'>('admin_dashboard');
  const [userRole, setUserRole] = useState<'paciente' | 'medica' | null>('medica');
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

  const [newExamUpload, setNewExamUpload] = useState({ nome: '', tipo: 'Ecografia' });

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
      console.warn("Offline fallback:", err);
    }
  }, []);

  const saveToFirestore = async (updatedList: any[]) => {
    setPatients(updatedList);
    try {
      const docRef = doc(db, "prenatal", "lista_pacientes");
      await setDoc(docRef, { lista: updatedList }, { merge: true });
    } catch (err) {
      console.error("Erro ao salvar no banco:", err);
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
    saveToFirestore(patients.map(p => p.id === updated.id ? updated : p));
    setShowAddConsultaModal(false);
  };

  const filteredPatients = useMemo(() => {
    if (!searchQuery) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(p => p.nome.toLowerCase().includes(q) || p.cpf.includes(q));
  }, [patients, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F4F6F2] text-gray-800 font-sans pb-12">
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
                <button onClick={() => setShowPrintModal(true)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20">
                  <Printer className="w-4 h-4 text-white" />
                </button>
                <button onClick={() => { setCurrentScreen('landing'); setUserRole(null); }} className="p-2 bg-red-500/20 text-red-200 rounded-xl">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}

            {currentScreen === 'landing' && (
              <>
                <button onClick={() => setShowPatientLoginModal(true)} className="bg-white/10 text-white px-3 py-1.5 rounded-xl text-xs font-semibold">
                  Paciente
                </button>
                <button onClick={() => setShowDoctorLoginModal(true)} className="bg-[#D4AF37] text-gray-900 px-3 py-1.5 rounded-xl text-xs font-bold">
                  Dra. Priscila
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* DASHBOARD MÉDICO */}
      {currentScreen === 'admin_dashboard' && (
        <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Gestantes Cadastradas</h2>
              <p className="text-xs text-gray-500">Acesse ou cadastre novas pacientes no banco de dados</p>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Buscar paciente por nome ou CPF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 text-xs p-2.5 border rounded-xl"
              />
              <button
                onClick={() => setShowNewPatientModal(true)}
                className="bg-[#2E482A] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                <UserPlus className="w-4 h-4" /> + Cadastrar
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
                  className="px-4 py-2.5 bg-[#2E482A] text-white rounded-xl text-xs font-bold shrink-0 hover:bg-[#1E311B]"
                >
                  Abrir Cartão
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ÁREA DA PACIENTE */}
      {currentScreen === 'patient_app' && (
        <div className="max-w-5xl mx-auto px-4 pt-4 space-y-6">
          <div className="bg-[#2E482A] text-white p-6 rounded-3xl shadow-md flex justify-between items-center">
            <div>
              <span className="text-[10px] text-[#A3B18A] uppercase font-bold">Carteirinha Pré-Natal Digital</span>
              <h2 className="text-2xl font-bold text-white mt-0.5">{currentPatient.nome}</h2>
              <p className="text-xs text-gray-200 mt-1">
                Bebê: <strong>{currentPatient.nomeBebe}</strong> • DPP: <strong>{new Date(currentPatient.dpp).toLocaleDateString('pt-BR')}</strong>
              </p>
            </div>
            <div className="bg-white/10 p-3 rounded-2xl flex items-center gap-3">
              <div className="text-3xl">👶</div>
              <div>
                <div className="text-xl font-bold">{currentGest.weeks} <span className="text-xs font-normal">Semanas</span></div>
              </div>
            </div>
          </div>

          <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200 flex overflow-x-auto gap-1">
            {['resumo', 'graficos', 'dados', 'vacinas', 'consultas'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap uppercase transition-all ${
                  activeTab === tab ? 'bg-[#2E482A] text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'resumo' && (
            <div className="bg-gradient-to-br from-[#2E482A] to-[#1E311B] text-white p-6 rounded-3xl shadow-md">
              <blockquote className="font-serif italic text-lg leading-relaxed text-[#F4F6F0]">
                "Antes de você existir eu já te queria, antes de você existir eu já te amava, em menos de um minuto de nascido já daria minha vida por você."
              </blockquote>
              <p className="mt-3 text-xs font-bold text-[#E8ECD8]">Dra. Priscila Gapski • CRM 24734</p>
            </div>
          )}

          {activeTab === 'graficos' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-bold text-gray-900 text-base">Curva de Ganho de Peso Materno</h3>
                {userRole === 'medica' && (
                  <button onClick={() => setShowAddConsultaModal(true)} className="bg-[#2E482A] text-white px-3 py-1.5 rounded-xl text-xs font-bold">+ Registrar Peso</button>
                )}
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border overflow-x-auto">
                <svg viewBox="0 0 600 260" className="w-full min-w-[500px]">
                  {[50, 60, 70, 80, 90].map((w) => (
                    <line key={w} x1="40" y1={220 - ((w - 50) / 45) * 200} x2="580" y2={220 - ((w - 50) / 45) * 200} stroke="#E5E7EB" strokeDasharray="3 3" />
                  ))}
                  {(() => {
                    const points = currentPatient.consultasEvolucao.filter(c => c.igSem >= 10).map(c => ({
                      x: 40 + ((c.igSem - 10) / 30) * 540,
                      y: 220 - ((c.peso - 50) / 45) * 200,
                      ...c
                    }));
                    return (
                      <g>
                        {points.length > 1 && <polyline fill="none" stroke="#2E482A" strokeWidth="3" points={points.map(p => `${p.x},${p.y}`).join(" ")} />}
                        {points.map(p => (
                          <g key={p.id}>
                            <circle cx={p.x} cy={p.y} r="5" fill="#D4AF37" stroke="#2E482A" strokeWidth="2" />
                            <text x={p.x} y={p.y - 8} fontSize="9" fontWeight="bold" fill="#1E311B" textAnchor="middle">{p.peso}kg</text>
                          </g>
                        ))}
                      </g>
                    );
                  })()}
                </svg>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL CADASTRAR NOVA PACIENTE */}
      {showNewPatientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-3">
            <h3 className="font-bold text-gray-900 text-base">Cadastrar Gestante no Banco</h3>
            <input type="text" placeholder="Nome Completo" value={newPatient.nome} onChange={(e) => setNewPatient({ ...newPatient, nome: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            <input type="text" placeholder="CPF (Ex: 123.456.789-00)" value={newPatient.cpf} onChange={(e) => setNewPatient({ ...newPatient, cpf: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={newPatient.dum} onChange={(e) => setNewPatient({ ...newPatient, dum: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
              <input type="text" placeholder="Peso Inicial (kg)" value={newPatient.pesoInicial} onChange={(e) => setNewPatient({ ...newPatient, pesoInicial: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
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
            <input type="number" placeholder="Semanas de Gestação" value={newConsulta.igSem} onChange={(e) => setNewConsulta({ ...newConsulta, igSem: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            <input type="text" placeholder="Peso Atual (kg)" value={newConsulta.peso} onChange={(e) => setNewConsulta({ ...newConsulta, peso: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            <input type="text" placeholder="Conduta" value={newConsulta.conduta} onChange={(e) => setNewConsulta({ ...newConsulta, conduta: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAddConsultaModal(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
              <button onClick={handleAddConsulta} className="px-4 py-1.5 bg-[#2E482A] text-white font-bold text-xs rounded-xl">Salvar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
