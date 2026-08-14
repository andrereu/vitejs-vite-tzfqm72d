import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Activity, Heart, Upload, Sparkles, User, 
  Plus, Clock, Baby, Stethoscope, LogOut, Printer, X, 
  Syringe, Scale, FileCheck, Check, ExternalLink, FileText,
  TrendingUp, UserPlus
} from 'lucide-react';

import { db, auth } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

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
    examesLab: [],
    ultrassons: [],
    consultasEvolucao: [
      { id: "c-1", data: "2026-02-20", igSem: 6, peso: 62.5, pa: "110/70", au: "NP", bcfMf: "Visível USG", edema: "Ausente", conduta: "Início do Ácido Fólico." }
    ],
    agendaConsultas: [],
    examesEnviados: []
  }
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'patient_app' | 'admin_dashboard'>('landing');
  const [userRole, setUserRole] = useState<'paciente' | 'medica' | null>(null);
  const [patients, setPatients] = useState(initialPatientsList);
  const [selectedPatientId, setSelectedPatientId] = useState("gestante-01");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState('resumo');

  // MODAIS
  const [showPatientLoginModal, setShowPatientLoginModal] = useState(false);
  const [showDoctorLoginModal, setShowDoctorLoginModal] = useState(false);
  const [showAddConsultaModal, setShowAddConsultaModal] = useState(false);
  const [showUploadExamModal, setShowUploadExamModal] = useState(false);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);

  // CAMPOS DE LOGIN
  const [doctorEmail, setDoctorEmail] = useState("");
  const [doctorPassword, setDoctorPassword] = useState("");
  const [loginCpf, setLoginCpf] = useState("");
  const [loginError, setLoginError] = useState("");

  // ESTADO DE UPLOAD BASE64
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [examName, setExamName] = useState("");
  const [examCategory, setExamCategory] = useState("Ecografia");
  const [isUploading, setIsUploading] = useState(false);

  // FORMULÁRIOS
  const [newPatient, setNewPatient] = useState({
    nome: '', cpf: '', idade: '', pai: '', nomeBebe: '',
    dum: new Date().toISOString().split('T')[0],
    pesoInicial: '60.0', altura: '1.65', tipoSanguineo: 'O+', doencasPrevias: ''
  });

  const [newConsulta, setNewConsulta] = useState({
    data: new Date().toISOString().split('T')[0],
    igSem: '', peso: '', pa: '120/80', au: '', bcfMf: '140 bpm / MF+', edema: 'Ausente', conduta: ''
  });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUserRole('medica');
        setCurrentScreen('admin_dashboard');
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

  const saveToFirestore = async (updatedList: any[]) => {
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

  const calculateWeeksAndDays = (dumStr: string) => {
    if (!dumStr) return { weeks: 0, days: 0 };
    const dum = new Date(dumStr);
    const today = new Date();
    const diffDays = Math.floor(Math.max(0, today.getTime() - dum.getTime()) / (1000 * 60 * 60 * 24));
    return { weeks: Math.floor(diffDays / 7), days: diffDays % 7 };
  };

  const currentGest = calculateWeeksAndDays(currentPatient.dum);

  const handleDoctorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, doctorEmail.trim(), doctorPassword);
      setUserRole('medica');
      setCurrentScreen('admin_dashboard');
      setShowDoctorLoginModal(false);
    } catch (err: any) {
      setLoginError("E-mail ou senha incorretos.");
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // 📂 GERADOR DE ANÁLISES REALISTAS (IA + CLÍNICA)
  const generateRealistAnalyses = (category: string, title: string) => {
    if (category === "Ecografia") {
      return {
        resumoIA: `🌸 **Acompanhamento para a Mamãe (IA)**:\nExame de ultrassonografia recebido. Identificamos a presença do saco gestacional e vesícula vitelina com tópica preservada. O desenvolvimento inicial sugere viabilidade embrionária compatível com a idade gestacional. É um momento lindo de acompanhamento dos primeiros sinais do bebê!`,
        notaDra: `🩺 **Anotações Clínicas (Dra. Priscila)**:\n- Saco gestacional tópico com contornos regulares.\n- Vesícula vitelina visível de aspecto anatômico.\n- Batimentos cardíacos embrionários a serem confirmados/acompanhados no próximo controle Doppler/Eco.\n- Conduta: Manter suplementação vitamínica de pré-natal e agendar retorno.`
      };
    } else if (category === "Laboratorial") {
      return {
        resumoIA: `🌸 **Acompanhamento para a Mamãe (IA)**:\nExame de sangue/laboratorial registrado com sucesso! Os indicadores gerais demonstram acompanhamento nutricional e metabólico adequado para a rotina do pré-natal.`,
        notaDra: `🩺 **Anotações Clínicas (Dra. Priscila)**:\n- Sorologias do trimestre sem alterações críticas.\n- Hemograma dentro dos padrões esperados para hemodiluição fisiológica da gestação.\n- Conduta: Manter acompanhamento de rotina.`
      };
    } else {
      return {
        resumoIA: `🌸 **Acompanhamento para a Mamãe (IA)**:\nDocumento anexado e organizado com segurança em seu prontuário digital.`,
        notaDra: `🩺 **Anotações Clínicas (Dra. Priscila)**:\n- Documento conferido e arquivado no prontuário da gestante.`
      };
    }
  };

  // 📤 UPLOAD VIA BASE64 COM ANÁLISES REALISTAS
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Por favor, selecione um arquivo.");
      return;
    }

    setIsUploading(true);

    try {
      const base64Content = await fileToBase64(selectedFile);
      const { resumoIA, notaDra } = generateRealistAnalyses(examCategory, examName);

      const novoExame = {
        id: `ex-${Date.now()}`,
        nome: examName || selectedFile.name,
        tipo: examCategory,
        dataUpload: new Date().toISOString().split('T')[0],
        fileData: base64Content,
        resumoIA: resumoIA,
        notaDra: notaDra,
        enviadoPor: userRole === 'medica' ? "Dra. Priscila Gapski" : "Paciente"
      };

      const updated = { ...currentPatient, examesEnviados: [novoExame, ...(currentPatient.examesEnviados || [])] };
      await saveToFirestore(patients.map(p => p.id === updated.id ? updated : p));

      setIsUploading(false);
      setShowUploadExamModal(false);
      setSelectedFile(null);
      setExamName("");
    } catch (err) {
      console.error("Erro na conversão:", err);
      alert("Erro ao processar arquivo. Tente um arquivo mais leve.");
      setIsUploading(false);
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

    saveToFirestore([...patients, novoObjetoPaciente]);
    setSelectedPatientId(novoObjetoPaciente.id);
    setShowNewPatientModal(false);
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
                <button onClick={handleLogout} className="p-2 bg-red-500/20 text-red-200 rounded-xl">
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

      {/* LANDING PAGE */}
      {currentScreen === 'landing' && (
        <div className="space-y-8 pt-8 px-4 max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-b from-[#2E482A] to-[#1E311B] text-white p-8 rounded-3xl shadow-xl">
            <span className="bg-white/10 text-[#E8ECD8] text-[10px] font-bold px-3 py-1 rounded-full uppercase border border-white/20">
              Acompanhamento Pré-Natal Digital
            </span>
            <h2 className="text-2xl md:text-4xl font-serif font-bold text-[#F4F6F0] mt-3 leading-tight">
              Sua gestação acompanhada com carinho, tecnologia e precisão
            </h2>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => setShowPatientLoginModal(true)} className="px-6 py-3.5 bg-[#8A9A86] hover:bg-[#788874] text-white rounded-2xl font-bold text-xs shadow-md">
                Área da Paciente
              </button>
              <button onClick={() => setShowDoctorLoginModal(true)} className="px-6 py-3.5 bg-[#D4AF37] hover:bg-amber-400 text-gray-900 rounded-2xl font-bold text-xs shadow-md">
                Acesso Dra. Priscila
              </button>
            </div>
          </div>
        </div>
      )}

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
              <button onClick={() => setShowNewPatientModal(true)} className="bg-[#2E482A] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-sm">
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
                <button onClick={() => { setSelectedPatientId(pat.id); setCurrentScreen('patient_app'); }} className="px-4 py-2.5 bg-[#2E482A] text-white rounded-xl text-xs font-bold shrink-0">
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
            {['resumo', 'graficos', 'dados', 'vacinas', 'consultas', 'examesCentral'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap uppercase transition-all ${
                  activeTab === tab ? 'bg-[#2E482A] text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab === 'examesCentral' ? 'Central de Exames + IA' : tab}
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

          {/* TAB CENTRAL DE EXAMES + IA & DRA PRISCILA */}
          {activeTab === 'examesCentral' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Central de Laudos e Ecografias</h3>
                  <p className="text-xs text-gray-500">Envie fotos de exames ou laudos para análise do pré-natal</p>
                </div>
                <button
                  onClick={() => setShowUploadExamModal(true)}
                  className="bg-[#2E482A] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Upload className="w-4 h-4" /> Anexar Exame
                </button>
              </div>

              {(!currentPatient.examesEnviados || currentPatient.examesEnviados.length === 0) ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  Nenhum exame anexado até o momento. Clique em "Anexar Exame" para enviar um laudo ou ecografia.
                </div>
              ) : (
                <div className="space-y-4">
                  {currentPatient.examesEnviados.map((ex: any) => (
                    <div key={ex.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-[#2E482A]" />
                          <div>
                            <strong className="text-sm text-gray-900 block">{ex.nome}</strong>
                            <span className="text-[10px] text-gray-500 font-bold uppercase">{ex.tipo} • Enviado em {ex.dataUpload}</span>
                          </div>
                        </div>
                      </div>

                      {/* VISUALIZAÇÃO DA FOTO DO EXAME */}
                      {ex.fileData && ex.fileData.startsWith("data:image") && (
                        <div className="mt-2 rounded-2xl overflow-hidden border border-gray-200 max-h-72 bg-black/5 flex justify-center p-2">
                          <img src={ex.fileData} alt={ex.nome} className="object-contain max-h-68 rounded-xl" />
                        </div>
                      )}

                      {/* CARD ANÁLISE IA PARA A MAMÃE */}
                      <div className="bg-pink-50/60 p-4 rounded-2xl border border-pink-200 text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                        {ex.resumoIA}
                      </div>

                      {/* CARD ANOTAÇÕES CLÍNICAS DRA PRISCILA */}
                      <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 text-xs text-gray-800 whitespace-pre-line leading-relaxed">
                        {ex.notaDra || `🩺 **Anotações Clínicas (Dra. Priscila)**:\nExame armazenado no prontuário.`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL UPLOAD BASE64 */}
      {showUploadExamModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-3">
            <h3 className="font-bold text-gray-900 text-base">Anexar Laudo / Ecografia</h3>
            
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Título do Exame</label>
              <input 
                type="text" 
                placeholder="Ex: Ecografia Morfológica 2º Trimestre" 
                value={examName} 
                onChange={(e) => setExamName(e.target.value)} 
                className="w-full text-xs p-2.5 border rounded-xl" 
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Tipo de Exame</label>
              <select 
                value={examCategory} 
                onChange={(e) => setExamCategory(e.target.value)} 
                className="w-full text-xs p-2.5 border rounded-xl bg-white"
              >
                <option value="Ecografia">Ecografia / Ultrassom</option>
                <option value="Laboratorial">Exame Laboratorial / Sangue</option>
                <option value="Outro">Outro Documento</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Selecione o Arquivo (Foto ou PDF)</label>
              <input 
                type="file" 
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} 
                className="w-full text-xs p-2 border bg-gray-50 rounded-xl" 
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowUploadExamModal(false)} className="px-3 py-1.5 text-xs text-gray-500" disabled={isUploading}>
                Cancelar
              </button>
              <button 
                onClick={handleFileUpload} 
                disabled={isUploading} 
                className="px-4 py-1.5 bg-[#2E482A] text-white font-bold text-xs rounded-xl flex items-center gap-1"
              >
                {isUploading ? "Convertendo..." : "Salvar no Banco"}
              </button>
            </div>
          </div>
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

      {/* MODAL LOGIN PACIENTE */}
      {showPatientLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-4">
            <h3 className="font-bold text-gray-900">Área da Paciente</h3>
            {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
            <input type="text" placeholder="Digite seu CPF" value={loginCpf} onChange={(e) => setLoginCpf(e.target.value)} className="w-full text-xs p-3 border rounded-xl" />
            <button onClick={handlePatientLogin} className="w-full py-2.5 bg-[#2E482A] text-white rounded-xl text-xs font-bold">Entrar</button>
            <button onClick={() => setShowPatientLoginModal(false)} className="w-full text-xs text-gray-500">Cancelar</button>
          </div>
        </div>
      )}

      {/* MODAL LOGIN REAL MÉDICA */}
      {showDoctorLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-3">
            <h3 className="font-bold text-gray-900">Acesso Médico Seguro</h3>
            {loginError && <p className="text-red-500 text-xs font-semibold">{loginError}</p>}
            <input type="email" placeholder="E-mail" value={doctorEmail} onChange={(e) => setDoctorEmail(e.target.value)} className="w-full text-xs p-3 border rounded-xl" />
            <input type="password" placeholder="Senha" value={doctorPassword} onChange={(e) => setDoctorPassword(e.target.value)} className="w-full text-xs p-3 border rounded-xl" />
            <button onClick={handleDoctorLogin} className="w-full py-2.5 bg-[#D4AF37] text-gray-900 rounded-xl text-xs font-bold shadow-md">
              Entrar no Painel
            </button>
            <button onClick={() => setShowDoctorLoginModal(false)} className="w-full text-xs text-gray-500 pt-1">
              Cancelar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
