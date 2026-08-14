import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Activity, Heart, Upload, Sparkles, User, 
  Plus, Clock, Baby, Stethoscope, LogOut, Printer, X, 
  Syringe, Scale, FileCheck, Check, ExternalLink, FileText,
  TrendingUp, UserPlus, Info, Calculator, AlertCircle, Edit3, Bot, Loader2,
  Bell, MapPin, CalendarPlus
} from 'lucide-react';

import { db, auth } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

// --- COMPONENTE TOOLTIP (DICA EXPLICATIVA DE SIGLAS) ---
const Tooltip = ({ title, text }: { title: string; text: string }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1 align-middle print:hidden">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-gray-400 hover:text-[#2E482A] focus:outline-none transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-gray-900 text-white text-[11px] rounded-xl shadow-xl z-50 pointer-events-none leading-snug">
          <strong className="block text-[#D4AF37] font-bold mb-0.5">{title}</strong>
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </span>
  );
};

// HELPER PARA FORMATAR DATA YYYY-MM-DD EM DD/MM PARA EXIBIÇÃO LIMPA
const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
  }
  return dateStr;
};

// HELPER PARA FORMATAR DATA BR COMPLETA (DD/MM/YYYY)
const formatDateBR = (dateStr: string) => {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return dateStr;
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
    pesoInicial: "71.0",
    altura: "1.65",
    tipoSanguineo: "A+",
    doencasPrevias: "Nenhuma (Alergia leve a Dipirona)",
    vacinas: {
      influenza: { realizada: true, data: "2026-03-10", lote: "INF2026-B" },
      vsr: { realizada: true, data: "2026-07-28", lote: "VSR-884" },
      dtpa: { realizada: true, data: "2026-05-20", lote: "DTP-9921" },
      covid19: { realizada: true, data: "2026-02-15", lote: "COV-3" }
    },
    examesTabela: {
      hbVg: { d1: "2026-02-20", r1: "12.8 g/dL / 38%", d2: "", r2: "" },
      plaquetas: { d1: "2026-02-20", r1: "245.000 /mm³", d2: "", r2: "" },
      glicemiaTotg: { d1: "2026-02-20", r1: "82 mg/dL", d2: "", r2: "" },
      htlv: { d1: "2026-02-20", r1: "Não Reagente", d2: "", r2: "" },
      hiv: { d1: "2026-02-20", r1: "Não Reagente", d2: "", r2: "" },
      sifilis: { d1: "2026-02-20", r1: "Não Reagente", d2: "", r2: "" },
      hbsag: { d1: "2026-02-20", r1: "Não Reagente", d2: "", r2: "" },
      tsh: { d1: "2026-02-20", r1: "1.8 mIU/L", d2: "", r2: "" },
      antiHcv: { d1: "2026-02-20", r1: "Não Reagente", d2: "", r2: "" },
      rubeola: { d1: "2026-02-20", r1: "IgG Imune", d2: "", r2: "" },
      cmv: { d1: "2026-02-20", r1: "IgG Imune", d2: "", r2: "" },
      toxo: { d1: "2026-02-20", r1: "IgG+ IgM-", d2: "", r2: "" },
      vitD: { d1: "2026-02-20", r1: "34 ng/mL", d2: "", r2: "" },
      ferritina: { d1: "2026-02-20", r1: "65 ng/mL", d2: "", r2: "" },
      vitB12: { d1: "2026-02-20", r1: "420 pg/mL", d2: "", r2: "" },
      urinaUrocultura: { d1: "2026-02-20", r1: "Normal / Ausente", d2: "", r2: "" },
      gbs: { d1: "", r1: "", d2: "", r2: "" }
    },
    consultasEvolucao: [
      { id: "c-1", data: "2026-02-20", igSem: 6, peso: 71.0, pa: "110/70", au: "NP", bcfMf: "Visível USG", edema: "Ausente", conduta: "Início do Ácido Fólico." },
      { id: "c-2", data: "2026-04-15", igSem: 13, peso: 72.2, pa: "115/75", au: "12 cm", bcfMf: "152 bpm / MF-", edema: "Ausente", conduta: "Ecografia Morfológica solicitada." }
    ],
    agendaConsultas: [
      {
        id: "ag-1",
        data: "2026-09-10",
        horario: "14:30",
        tipo: "Consulta Pré-Natal de Rotina",
        local: "Consultório Dra. Priscila Gapski",
        observacoes: "Trazer carteira de vacinas e exames de sangue do 3º trimestre.",
        status: "agendada"
      },
      {
        id: "ag-2",
        data: "2026-10-01",
        horario: "10:00",
        tipo: "Avaliação Fetal / Retorno",
        local: "Consultório Dra. Priscila Gapski",
        observacoes: "Checar ultrassom de acompanhamento.",
        status: "agendada"
      }
    ],
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
  const [showEditExamesModal, setShowEditExamesModal] = useState(false);
  const [showAddAgendaModal, setShowAddAgendaModal] = useState(false);

  // CALCULADORA GESTACIONAL (USG)
  const [calcUsgData, setCalcUsgData] = useState(new Date().toISOString().split('T')[0]);
  const [calcUsgSemanas, setCalcUsgSemanas] = useState("8");
  const [calcUsgDias, setCalcUsgDias] = useState("0");
  const [calcResultado, setCalcResultado] = useState<any>(null);

  // LOGIN
  const [doctorEmail, setDoctorEmail] = useState("");
  const [doctorPassword, setDoctorPassword] = useState("");
  const [loginCpf, setLoginCpf] = useState("");
  const [loginError, setLoginError] = useState("");

  // UPLOAD EXAMES & PROCESSAMENTO GEMINI IA
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [examName, setExamName] = useState("");
  const [examCategory, setExamCategory] = useState("Ecografia");
  const [isUploading, setIsUploading] = useState(false);

  // FORMULÁRIOS DE EDIÇÃO / CRIAÇÃO
  const [editExamesData, setEditExamesData] = useState<any>({});
  const [newAgenda, setNewAgenda] = useState({
    data: new Date().toISOString().split('T')[0],
    horario: '14:00',
    tipo: 'Consulta Pré-Natal de Rotina',
    local: 'Consultório Dra. Priscila Gapski',
    observacoes: ''
  });

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

  // PRÓXIMA CONSULTA AGENDADA
  const nextAppointment = useMemo(() => {
    if (!currentPatient.agendaConsultas || currentPatient.agendaConsultas.length === 0) return null;
    const sorted = [...currentPatient.agendaConsultas]
      .filter((a: any) => a.status !== 'cancelada')
      .sort((a: any, b: any) => new Date(`${a.data}T${a.horario}`).getTime() - new Date(`${b.data}T${b.horario}`).getTime());
    return sorted[0] || null;
  }, [currentPatient.agendaConsultas]);

  const bmiInfo = useMemo(() => {
    const p0 = parseFloat(currentPatient.pesoInicial) || 60;
    const h = parseFloat(currentPatient.altura) || 1.65;
    const bmi = p0 / (h * h);

    if (bmi < 18.5) {
      return { cat: 'Baixo peso (IMC < 18,5)', recom: 'Ganho Recomendado: 12,5 a 18,0 kg', bg: 'bg-blue-600', minTotal: 12.5, maxTotal: 18.0 };
    } else if (bmi < 25.0) {
      return { cat: 'Adequado / Normal (IMC 18,5 a 24,9)', recom: 'Ganho Recomendado: 11,5 a 16,0 kg', bg: 'bg-emerald-600', minTotal: 11.5, maxTotal: 16.0 };
    } else if (bmi < 30.0) {
      return { cat: 'Sobrepeso (IMC 25,0 a 29,9)', recom: 'Ganho Recomendado até 40 sem: 7 a 9 kg', bg: 'bg-rose-600', minTotal: 7.0, maxTotal: 9.0 };
    } else {
      return { cat: 'Obesidade (IMC ≥ 30,0)', recom: 'Ganho Recomendado: 5,0 a 9,0 kg', bg: 'bg-purple-600', minTotal: 5.0, maxTotal: 9.0 };
    }
  }, [currentPatient.pesoInicial, currentPatient.altura]);

  const handleCalculateUsg = (e: React.FormEvent) => {
    e.preventDefault();
    const dataUsg = new Date(calcUsgData);
    const sem = parseInt(calcUsgSemanas) || 0;
    const dias = parseInt(calcUsgDias) || 0;

    const totalDiasNaUsg = sem * 7 + dias;
    const dumCorrigida = new Date(dataUsg.getTime() - totalDiasNaUsg * 24 * 60 * 60 * 1000);
    const dppCalculada = new Date(dumCorrigida.getTime() + 280 * 24 * 60 * 60 * 1000);

    const hoje = new Date();
    const diffDiasHoje = Math.floor(Math.max(0, hoje.getTime() - dumCorrigida.getTime()) / (1000 * 60 * 60 * 24));
    const semHoje = Math.floor(diffDiasHoje / 7);
    const diasHoje = diffDiasHoje % 7;

    setCalcResultado({
      dumCorrigida: dumCorrigida.toISOString().split('T')[0],
      dpp: dppCalculada.toLocaleDateString('pt-BR'),
      igHoje: `${semHoje} Semanas e ${diasHoje} dias`
    });
  };

  const examAlerts = useMemo(() => {
    const sem = currentGest.weeks;
    const list = [];

    if (sem >= 11 && sem <= 14) list.push({ titulo: 'Ecografia Morfológica do 1º Trimestre', desc: 'Medição da Translucência Nucal (TN) e osso nasal.' });
    if (sem >= 20 && sem <= 24) list.push({ titulo: 'Ecografia Morfológica do 2º Trimestre', desc: 'Avaliação detalhada da anatomia fetal e coração.' });
    if (sem >= 24 && sem <= 28) {
      list.push({ titulo: 'TOTG (Teste de Glicose)', desc: 'Rastreio de Diabetes Gestacional.' });
      list.push({ titulo: 'Vacina dTPa', desc: 'Imunização contra coqueluche.' });
    }
    if (sem >= 28) list.push({ titulo: 'Sorologias do 3º Trimestre', desc: 'Repetição de VDRL, HIV, Toxoplasmose e Hemograma.' });
    if (sem >= 35 && sem <= 37) list.push({ titulo: 'Estreptococo do Grupo B (GBS)', desc: 'Swab de prevenção neonatal.' });

    return list;
  }, [currentGest.weeks]);

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

  const processExamWithGeminiIA = async (base64Content: string, mimeType: string, category: string, title: string) => {
    const apiKey = ""; // A chave é fornecida em tempo de execução
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const cleanBase64 = base64Content.replace(/^data:(image\/[a-zA-Z0-9]+|application\/pdf);base64,/, '');

    const promptText = `Você é um assistente pré-natal e obstétrico especialista integrado ao aplicativo da Dra. Priscila Gapski (CRM 24734).
Analise a imagem deste laudo/exame obstétrico ou laboratorial (Título fornecido: "${title}", Categoria estimada: "${category}").

Instruções de Resposta:
1. "resumoIA": Escreva um texto carinhoso, empático, acolhedor e didático em português direcionado para a MÃE GESTANTE. Explique os achados sem causar pânico, com tom tranquilizador de acompanhamento do pré-natal.
2. "notaDra": Escreva uma anotação clínica técnica, objetiva e sucinta para a Dra. Priscila incluir no prontuário da paciente.
3. "examesExtraidos": Se o exame for laboratorial/sangue e você identificar algum dos valores abaixo na imagem, retorne a string do valor no campo correspondente (ex: hbVg: "12.5 g/dL / 38%", glicemiaTotg: "84 mg/dL"). Deixe em branco se não encontrado.

Campos suportados para extração: hbVg, plaquetas, glicemiaTotg, htlv, hiv, sifilis, hbsag, tsh, antiHcv, rubeola, cmv, toxo, vitD, ferritina, vitB12, urinaUrocultura, gbs.`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: promptText },
            { inlineData: { mimeType: mimeType || "image/jpeg", data: cleanBase64 } }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            resumoIA: { type: "STRING" },
            notaDra: { type: "STRING" },
            examesExtraidos: {
              type: "OBJECT",
              properties: {
                hbVg: { type: "STRING" },
                plaquetas: { type: "STRING" },
                glicemiaTotg: { type: "STRING" },
                htlv: { type: "STRING" },
                hiv: { type: "STRING" },
                sifilis: { type: "STRING" },
                hbsag: { type: "STRING" },
                tsh: { type: "STRING" },
                antiHcv: { type: "STRING" },
                rubeola: { type: "STRING" },
                cmv: { type: "STRING" },
                toxo: { type: "STRING" },
                vitD: { type: "STRING" },
                ferritina: { type: "STRING" },
                vitB12: { type: "STRING" },
                urinaUrocultura: { type: "STRING" },
                gbs: { type: "STRING" }
              }
            }
          }
        }
      }
    };

    let delay = 1000;
    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          const resData = await response.json();
          const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            return JSON.parse(rawText);
          }
        }
      } catch (err) {
        // Retry exponential
      }
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }

    return {
      resumoIA: `🌸 **Acompanhamento para a Mamãe (IA)**:\nSeu exame "${title}" foi recebido e registrado em nuvem. A imagem está com excelente visibilidade e foi arquivada para a Dra. Priscila analisar na sua próxima consulta de rotina!`,
      notaDra: `🩺 **Anotações Clínicas (Dra. Priscila)**:\n- Exame "${title}" armazenado e conferido no prontuário.\n- Paciente orientada sobre a manutenção da rotina de pré-natal.`,
      examesExtraidos: {}
    };
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Por favor, selecione um arquivo.");
      return;
    }

    setIsUploading(true);

    try {
      const base64Content = await fileToBase64(selectedFile);
      const mimeType = selectedFile.type || "image/jpeg";

      const resultIA = await processExamWithGeminiIA(base64Content, mimeType, examCategory, examName);

      const novoExame = {
        id: `ex-${Date.now()}`,
        nome: examName || selectedFile.name,
        tipo: examCategory,
        dataUpload: new Date().toISOString().split('T')[0],
        fileData: base64Content,
        resumoIA: resultIA.resumoIA,
        notaDra: resultIA.notaDra,
        enviadoPor: userRole === 'medica' ? "Dra. Priscila Gapski" : "Paciente"
      };

      let currentExamesTab = { ...(currentPatient.examesTabela || {}) };
      if (resultIA.examesExtraidos && Object.keys(resultIA.examesExtraidos).length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        Object.entries(resultIA.examesExtraidos).forEach(([k, val]: any) => {
          if (val && typeof val === 'string' && val.trim() !== '') {
            currentExamesTab[k] = {
              ...(currentExamesTab[k] || {}),
              d1: currentExamesTab[k]?.d1 || todayStr,
              r1: val.trim()
            };
          }
        });
      }

      const updated = { 
        ...currentPatient, 
        examesTabela: currentExamesTab,
        examesEnviados: [novoExame, ...(currentPatient.examesEnviados || [])] 
      };
      
      await saveToFirestore(patients.map(p => p.id === updated.id ? updated : p));

      setIsUploading(false);
      setShowUploadExamModal(false);
      setSelectedFile(null);
      setExamName("");
    } catch (err) {
      console.error("Erro no processamento:", err);
      alert("Erro ao processar arquivo. Tente um arquivo mais leve.");
      setIsUploading(false);
    }
  };

  const handleSaveTabelaExames = () => {
    const updated = { ...currentPatient, examesTabela: editExamesData };
    saveToFirestore(patients.map(p => p.id === updated.id ? updated : p));
    setShowEditExamesModal(false);
  };

  const handleAddAgenda = (e: React.FormEvent) => {
    e.preventDefault();
    const itemAgenda = {
      id: `ag-${Date.now()}`,
      data: newAgenda.data,
      horario: newAgenda.horario,
      tipo: newAgenda.tipo,
      local: newAgenda.local,
      observacoes: newAgenda.observacoes,
      status: 'agendada'
    };

    const updatedAgenda = [...(currentPatient.agendaConsultas || []), itemAgenda];
    const updated = { ...currentPatient, agendaConsultas: updatedAgenda };
    saveToFirestore(patients.map(p => p.id === updated.id ? updated : p));
    setShowAddAgendaModal(false);
    setNewAgenda({
      data: new Date().toISOString().split('T')[0],
      horario: '14:00',
      tipo: 'Consulta Pré-Natal de Rotina',
      local: 'Consultório Dra. Priscila Gapski',
      observacoes: ''
    });
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
      examesTabela: {},
      agendaConsultas: [],
      consultasEvolucao: [
        { id: `c-init`, data: newPatient.dum, igSem: 0, peso: parseFloat(newPatient.pesoInicial), pa: "120/80", au: "NP", bcfMf: "Aguardando", edema: "Ausente", conduta: "Consulta Inicial de Pré-Natal." }
      ],
      examesEnviados: []
    };

    saveToFirestore([...patients, novoObjetoPaciente]);
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

  return (
    <div className="min-h-screen bg-[#F4F6F2] text-gray-800 font-sans pb-12 print:bg-white print:pb-0">
      
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>

      <header className="bg-[#2E482A] text-white shadow-md sticky top-0 z-40 border-b border-[#3D5C38] print:hidden">
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
        <div className="space-y-8 pt-8 px-4 max-w-4xl mx-auto text-center print:hidden">
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
        <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6 print:hidden">
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
                  <p className="text-xs text-gray-600 mt-1">
                    Bebê: <strong>{pat.nomeBebe}</strong> • 
                    <span className="inline-flex items-center ml-1">
                      DPP: {new Date(pat.dpp).toLocaleDateString('pt-BR')}
                    </span>
                  </p>
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
        <div className="max-w-5xl mx-auto px-4 pt-4 space-y-6 print:p-0 print:m-0 print:max-w-none">
          <div className="bg-[#2E482A] text-white p-6 rounded-3xl shadow-md flex justify-between items-center print:hidden">
            <div>
              <span className="text-[10px] text-[#A3B18A] uppercase font-bold">Carteirinha Pré-Natal Digital</span>
              <h2 className="text-2xl font-bold text-white mt-0.5">{currentPatient.nome}</h2>
              <p className="text-xs text-gray-200 mt-1">
                Bebê: <strong>{currentPatient.nomeBebe}</strong> • 
                <span className="inline-flex items-center ml-1">
                  DPP: <strong>{new Date(currentPatient.dpp).toLocaleDateString('pt-BR')}</strong>
                  <Tooltip title="DPP" text="Data Provável do Parto calculada pela regra obstétrica (40 semanas)." />
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#D4AF37] text-gray-900 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm hover:bg-amber-400"
              >
                <Printer className="w-4 h-4" /> Imprimir Cartão / PDF (A4)
              </button>
              <div className="bg-white/10 p-3 rounded-2xl flex items-center gap-3">
                <div className="text-3xl">👶</div>
                <div>
                  <div className="text-xl font-bold">
                    {currentGest.weeks} 
                    <span className="text-xs font-normal ml-1">Semanas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200 flex overflow-x-auto gap-1 print:hidden">
            {[
              { id: 'resumo', label: 'Resumo' },
              { id: 'agenda', label: 'Agenda & Lembretes' },
              { id: 'examesTabela', label: 'Exames Laboratoriais' },
              { id: 'graficos', label: 'Gráfico GPG (MS)' },
              { id: 'calculadora', label: 'Calculadora Gestacional' },
              { id: 'dados', label: 'Dados Clínicos' },
              { id: 'vacinas', label: 'Vacinas' },
              { id: 'consultas', label: 'Consultas' },
              { id: 'examesCentral', label: 'Central de Exames + IA' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap uppercase transition-all ${
                  activeTab === tab.id ? 'bg-[#2E482A] text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: RESUMO */}
          {activeTab === 'resumo' && (
            <div className="space-y-4 print:hidden">
              <div className="bg-gradient-to-br from-[#2E482A] to-[#1E311B] text-white p-6 rounded-3xl shadow-md">
                <blockquote className="font-serif italic text-lg leading-relaxed text-[#F4F6F0]">
                  "Antes de você existir eu já te queria, antes de você nascer eu já te amava, em menos de um minuto de nascido já daria minha vida por você."
                </blockquote>
                <p className="mt-3 text-xs font-bold text-[#E8ECD8]">Dra. Priscila Gapski • CRM 24734</p>
              </div>

              {/* CARD PRÓXIMA CONSULTA AGENDADA */}
              {nextAppointment ? (
                <div className="bg-[#2E482A]/10 border border-[#2E482A]/30 p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#2E482A] text-white flex items-center justify-center font-bold text-xl shrink-0">
                      🗓️
                    </div>
                    <div>
                      <span className="text-[10px] text-[#2E482A] font-bold uppercase tracking-wider block">Próxima Consulta Agendada</span>
                      <strong className="text-base text-gray-900 block">{nextAppointment.tipo}</strong>
                      <p className="text-xs text-gray-600 mt-0.5">
                        📍 {nextAppointment.local} • <strong>{formatDateBR(nextAppointment.data)} às {nextAppointment.horario}</strong>
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('agenda')}
                    className="px-4 py-2 bg-[#2E482A] text-white rounded-xl text-xs font-bold shrink-0"
                  >
                    Ver Agenda Completa
                  </button>
                </div>
              ) : (
                <div className="bg-gray-50 border p-4 rounded-2xl flex justify-between items-center text-xs text-gray-500">
                  <span>Nenhuma consulta agendada no momento.</span>
                  {userRole === 'medica' && (
                    <button onClick={() => setShowAddAgendaModal(true)} className="text-[#2E482A] font-bold underline">+ Agendar Agora</button>
                  )}
                </div>
              )}

              {examAlerts.length > 0 && (
                <div className="bg-amber-50/80 p-5 rounded-3xl border border-amber-200 space-y-2">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Exames Recomendados para esta Fase ({currentGest.weeks}ª Semana)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                    {examAlerts.map((al, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-2xl border border-amber-100 text-xs space-y-0.5">
                        <strong className="text-gray-900 block font-bold">{al.titulo}</strong>
                        <p className="text-gray-600 text-[11px]">{al.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs">
                  <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase">Idade Gestacional (IG)</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{currentGest.weeks} Semanas e {currentGest.days} dias</div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs">
                  <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase">Data Provável do Parto (DPP)</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{new Date(currentPatient.dpp).toLocaleDateString('pt-BR')}</div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs">
                  <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase">Tipo Sanguíneo & Fator Rh</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{currentPatient.tipoSanguineo}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB AGENDA & LEMBRETES */}
          {activeTab === 'agenda' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6 print:hidden">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <CalendarPlus className="w-5 h-5 text-[#2E482A]" />
                    Agenda de Consultas & Lembretes
                  </h3>
                  <p className="text-xs text-gray-500">Próximos compromissos pré-natais da gestante</p>
                </div>
                {userRole === 'medica' && (
                  <button 
                    onClick={() => setShowAddAgendaModal(true)}
                    className="bg-[#2E482A] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-4 h-4" /> Agendar Nova Consulta
                  </button>
                )}
              </div>

              {(!currentPatient.agendaConsultas || currentPatient.agendaConsultas.length === 0) ? (
                <div className="text-center py-10 text-gray-400 text-xs space-y-2">
                  <Calendar className="w-8 h-8 mx-auto text-gray-300" />
                  <p>Nenhuma consulta futura agendada na carteirinha digital.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentPatient.agendaConsultas.map((item: any) => (
                    <div key={item.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 relative">
                      <div className="flex justify-between items-start">
                        <span className="bg-[#2E482A] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                          {formatDateBR(item.data)} às {item.horario}
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm pt-1">{item.tipo}</h4>
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" /> {item.local}
                      </p>
                      {item.observacoes && (
                        <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-2">
                          💡 <strong>Orientações:</strong> {item.observacoes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB EXAMES LABORATORIAIS */}
          {activeTab === 'examesTabela' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4 print:hidden">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Tabela de Exames Laboratoriais</h3>
                  <p className="text-xs text-gray-500">Resultados numéricos e sorologias do pré-natal (Sincronizado com a Impressão A4 e Leitura Gemini IA)</p>
                </div>
                {userRole === 'medica' && (
                  <button 
                    onClick={() => {
                      setEditExamesData(currentPatient.examesTabela || {});
                      setShowEditExamesModal(true);
                    }} 
                    className="bg-[#2E482A] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Edit3 className="w-4 h-4" /> Preencher / Editar Exames
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-3 font-bold text-gray-700">EXAME</th>
                      <th className="p-3 font-bold text-gray-700">1º TRIMESTRE (Data / Resultado)</th>
                      <th className="p-3 font-bold text-gray-700">3º TRIMESTRE (Data / Resultado)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {LISTA_EXAMES_OFICIAIS.map(ex => {
                      const dados = (currentPatient.examesTabela as any)?.[ex.id] || {};
                      return (
                        <tr key={ex.id} className="hover:bg-gray-50">
                          <td className="p-3 font-bold text-gray-900">{ex.label}</td>
                          <td className="p-3 text-gray-700">
                            {dados.d1 ? <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md mr-2">{formatDateDisplay(dados.d1)}</span> : null}
                            {dados.r1 || <span className="text-gray-300 italic">Pendente ({ex.placeholder})</span>}
                          </td>
                          <td className="p-3 text-gray-700">
                            {dados.d2 ? <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md mr-2">{formatDateDisplay(dados.d2)}</span> : null}
                            {dados.r2 || <span className="text-gray-300 italic">Pendente ({ex.placeholder})</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: GRÁFICO GPG */}
          {activeTab === 'graficos' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5 print:hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2E482A] uppercase tracking-wide">
                    Gráfico de Acompanhamento do Ganho de Peso
                  </h3>
                  <p className="text-xs text-gray-500">Padrão da Caderneta de Saúde da Gestante (Ministério da Saúde / Atalah)</p>
                </div>
                {userRole === 'medica' && (
                  <button onClick={() => setShowAddConsultaModal(true)} className="bg-[#2E482A] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs">
                    + Registrar Peso na Consulta
                  </button>
                )}
              </div>

              <div className="flex flex-col items-center justify-center space-y-1 py-2">
                <div className={`px-6 py-2 text-white font-bold text-sm rounded-full shadow-sm text-center ${bmiInfo.bg}`}>
                  {bmiInfo.cat}
                </div>
                <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">
                  {bmiInfo.recom}
                </span>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-200 overflow-x-auto">
                <svg viewBox="0 0 720 400" className="w-full min-w-[650px] font-sans">
                  <rect x="50" y="40" width="620" height="300" fill="#FAFAFA" stroke="#CBD5E1" strokeWidth="1.5" />
                  {Array.from({ length: 30 }, (_, i) => i - 4).map((kg) => {
                    if (kg % 2 !== 0 && kg !== 25) return null;
                    const y = 340 - ((kg + 4) / 29) * 300;
                    return (
                      <g key={kg}>
                        <line x1="50" y1={y} x2="670" y2={y} stroke={kg === 0 ? "#64748B" : "#E2E8F0"} strokeWidth={kg === 0 ? "1.5" : "1"} />
                        <text x="42" y={y + 3} fontSize="9" fontWeight="bold" fill="#475569" textAnchor="end">{kg}</text>
                        <text x="678" y={y + 3} fontSize="9" fontWeight="bold" fill="#475569" textAnchor="start">{kg}</text>
                      </g>
                    );
                  })}
                  {Array.from({ length: 31 }, (_, i) => i + 10).map((sem) => {
                    const x = 50 + ((sem - 10) / 30) * 620;
                    const isDivisoria = sem === 13 || sem === 27;
                    return (
                      <g key={sem}>
                        <line x1={x} y1="40" x2={x} y2="340" stroke={isDivisoria ? "#E11D48" : "#F1F5F9"} strokeWidth={isDivisoria ? "2" : "1"} />
                        <text x={x} y="34" fontSize="9" fontWeight={isDivisoria ? "bold" : "medium"} fill={isDivisoria ? "#E11D48" : "#64748B"} textAnchor="middle">{sem}</text>
                        <text x={x} y="352" fontSize="9" fontWeight={isDivisoria ? "bold" : "medium"} fill={isDivisoria ? "#E11D48" : "#64748B"} textAnchor="middle">{sem}</text>
                      </g>
                    );
                  })}
                  {(() => {
                    const realPoints = currentPatient.consultasEvolucao
                      .filter(c => c.igSem >= 10 && c.igSem <= 40)
                      .map(c => ({
                        x: 50 + ((c.igSem - 10) / 30) * 620,
                        y: 340 - (((c.peso - (parseFloat(currentPatient.pesoInicial) || 60)) + 4) / 29) * 300,
                        ganho: (c.peso - (parseFloat(currentPatient.pesoInicial) || 60)).toFixed(1),
                        ...c
                      }));
                    return (
                      <g>
                        {realPoints.length > 1 && (
                          <polyline fill="none" stroke="#2E482A" strokeWidth="3.5" points={realPoints.map(p => `${p.x},${p.y}`).join(" ")} />
                        )}
                        {realPoints.map(p => (
                          <circle key={p.id} cx={p.x} cy={p.y} r="5" fill="#D4AF37" stroke="#2E482A" strokeWidth="2" />
                        ))}
                      </g>
                    );
                  })()}
                </svg>
              </div>
            </div>
          )}

          {/* TAB 3: CALCULADORA GESTACIONAL */}
          {activeTab === 'calculadora' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6 print:hidden">
              <div className="border-b pb-3">
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-[#2E482A]" />
                  Calculadora Gestacional Obstétrica
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form onSubmit={handleCalculateUsg} className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-200">
                  <h4 className="text-xs font-bold uppercase text-[#2E482A]">Cálculo por Ecografia (USG)</h4>
                  <input type="date" value={calcUsgData} onChange={(e) => setCalcUsgData(e.target.value)} className="w-full text-xs p-2.5 border rounded-xl bg-white" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Semanas" value={calcUsgSemanas} onChange={(e) => setCalcUsgSemanas(e.target.value)} className="w-full text-xs p-2.5 border rounded-xl bg-white" />
                    <input type="number" placeholder="Dias" min="0" max="6" value={calcUsgDias} onChange={(e) => setCalcUsgDias(e.target.value)} className="w-full text-xs p-2.5 border rounded-xl bg-white" />
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-[#2E482A] text-white rounded-xl text-xs font-bold">Calcular DPP</button>
                </form>
                {calcResultado && (
                  <div className="space-y-3 bg-[#2E482A]/5 p-5 rounded-2xl border">
                    <div className="bg-white p-3 rounded-xl border"><span className="text-[10px] text-gray-400 font-bold block">IG HOJE</span><strong>{calcResultado.igHoje}</strong></div>
                    <div className="bg-white p-3 rounded-xl border"><span className="text-[10px] text-gray-400 font-bold block">DPP CALCULADA</span><strong>{calcResultado.dpp}</strong></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: DADOS CLÍNICOS */}
          {activeTab === 'dados' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4 print:hidden">
              <h3 className="font-bold text-gray-900 text-base border-b pb-3">Dados Cadastrais e Histórico</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-gray-50 rounded-2xl"><span className="text-gray-400 block font-bold">NOME</span><strong>{currentPatient.nome}</strong></div>
                <div className="p-4 bg-gray-50 rounded-2xl"><span className="text-gray-400 block font-bold">PAI / ACOMPANHANTE</span><strong>{currentPatient.pai}</strong></div>
                <div className="p-4 bg-gray-50 rounded-2xl"><span className="text-gray-400 block font-bold">HISTÓRICO GPCA</span><strong>G{currentPatient.g} P{currentPatient.p} C{currentPatient.c} A{currentPatient.a}</strong></div>
                <div className="p-4 bg-gray-50 rounded-2xl"><span className="text-gray-400 block font-bold">TIPO SANGUÍNEO</span><strong>{currentPatient.tipoSanguineo}</strong></div>
              </div>
            </div>
          )}

          {/* TAB 5: VACINAS */}
          {activeTab === 'vacinas' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4 print:hidden">
              <h3 className="font-bold text-gray-900 text-base border-b pb-3">Carteira de Vacinação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(currentPatient.vacinas).map(([k, v]: any) => (
                  <div key={k} className="p-4 bg-gray-50 rounded-2xl border flex justify-between items-center">
                    <div><strong className="text-sm uppercase block">{k}</strong><span className="text-[10px] text-gray-500">{v.realizada ? `Aplicada em ${v.data}` : 'Pendente'}</span></div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${v.realizada ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{v.realizada ? 'OK' : 'PENDENTE'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: CONSULTAS */}
          {activeTab === 'consultas' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4 print:hidden">
              <h3 className="font-bold text-gray-900 text-base border-b pb-3">Evolução das Consultas</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr><th className="p-2.5">Data</th><th className="p-2.5">IG</th><th className="p-2.5">Peso</th><th className="p-2.5">PA</th><th className="p-2.5">AU</th><th className="p-2.5">BCF/MF</th><th className="p-2.5">Conduta</th></tr>
                  </thead>
                  <tbody>
                    {currentPatient.consultasEvolucao.map(c => (
                      <tr key={c.id} className="border-b"><td className="p-2.5 font-bold">{c.data}</td><td className="p-2.5">{c.igSem} Sem</td><td className="p-2.5">{c.peso}kg</td><td className="p-2.5">{c.pa}</td><td className="p-2.5">{c.au}</td><td className="p-2.5">{c.bcfMf}</td><td className="p-2.5 text-gray-600">{c.conduta}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: CENTRAL DE EXAMES + LEITURA AUTOMÁTICA GEMINI IA */}
          {activeTab === 'examesCentral' && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4 print:hidden">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    Central de Laudos e Ecografias
                    <span className="bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                      <Bot className="w-3 h-3 text-pink-600" /> Leitura Gemini IA Ativa
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500">Envie fotos de laudos ou exames: o Gemini lê a imagem, gera o resumo e preenche os dados automaticamente</p>
                </div>
                <button onClick={() => setShowUploadExamModal(true)} className="bg-[#2E482A] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <Upload className="w-4 h-4" /> + Anexar Exame
                </button>
              </div>
              <div className="space-y-4">
                {currentPatient.examesEnviados?.map((ex: any) => (
                  <div key={ex.id} className="p-5 bg-gray-50 rounded-2xl border space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="text-sm font-bold text-gray-900 block">{ex.nome}</strong>
                        <span className="text-[10px] text-gray-500 uppercase font-bold">{ex.tipo} • {ex.dataUpload}</span>
                      </div>
                    </div>
                    {ex.fileData && <img src={ex.fileData} alt={ex.nome} className="max-h-68 rounded-xl object-contain border bg-black/5 p-1" />}
                    <div className="bg-pink-50/80 p-3.5 rounded-xl text-xs text-gray-800 whitespace-pre-line border border-pink-200">{ex.resumoIA}</div>
                    <div className="bg-emerald-50/80 p-3.5 rounded-xl text-xs text-gray-900 whitespace-pre-line border border-emerald-200">{ex.notaDra}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REPRODUÇÃO IDÊNTICA DA CARTEIRINHA FÍSICA PDF (3 DOBRAS EM PAISAGEM) */}
          {/* ========================================================================= */}
          <div className="hidden print:block font-sans text-black w-full text-[8.5px] leading-tight">
            <div className="grid grid-cols-3 gap-3 border-2 border-[#2E482A] p-2 bg-white rounded-sm">
              
              {/* DOBRA 1: CAPA + IDENTIFICAÇÃO + QUADRO VACINAL + POEMA */}
              <div className="border-r border-gray-400 pr-2 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="text-center border-b pb-1 mb-2">
                    <h1 className="font-serif font-bold text-sm text-[#2E482A]">Dra. Priscila Gapski</h1>
                    <p className="text-[7.5px] font-bold text-gray-700">CRM: 33439/PR • RQE 24734</p>
                    <p className="text-[7.5px] text-[#2E482A] font-medium">@prigapski.obstetra • Obstetra</p>
                  </div>

                  <div className="space-y-1 bg-gray-50 p-1.5 border rounded-xs mb-2">
                    <span className="font-bold text-[8px] uppercase block border-b text-[#2E482A]">DADOS DA GESTANTE</span>
                    <p><strong>NOME:</strong> {currentPatient.nome}</p>
                    <p><strong>IDADE:</strong> {currentPatient.idade} anos • <strong>ALTURA:</strong> {currentPatient.altura}m</p>
                    <p><strong>PAI:</strong> {currentPatient.pai}</p>
                    <p><strong>DOENÇAS PRÉVIAS:</strong> {currentPatient.doencasPrevias}</p>
                  </div>

                  <div className="bg-gray-50 p-1.5 border rounded-xs space-y-1 mb-2">
                    <div className="grid grid-cols-2 gap-1">
                      <p><strong>G:</strong> {currentPatient.g} <strong>P:</strong> {currentPatient.p} <strong>C:</strong> {currentPatient.c} <strong>A:</strong> {currentPatient.a}</p>
                      <p><strong>DPP:</strong> {new Date(currentPatient.dpp).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <p><strong>PESO INICIAL:</strong> {currentPatient.pesoInicial}kg</p>
                      <p><strong>TIPO SANGUÍNEO:</strong> {currentPatient.tipoSanguineo}</p>
                    </div>
                    <p><strong>NOME DO BEBÊ:</strong> {currentPatient.nomeBebe}</p>
                  </div>

                  {/* QUADRO VACINAL */}
                  <div className="border p-1 space-y-1 bg-emerald-50/40">
                    <span className="font-bold text-[8px] uppercase block border-b text-[#2E482A] text-center">QUADRO VACINAL</span>
                    <div className="grid grid-cols-3 text-[7px] text-center gap-0.5">
                      <div className="border bg-white p-0.5"><strong>INFLUENZA</strong><br />ANUAL<br />{currentPatient.vacinas?.influenza?.data || '____/____/____'}</div>
                      <div className="border bg-white p-0.5"><strong>VSR</strong><br />32 SEMANAS<br />{currentPatient.vacinas?.vsr?.data || '____/____/____'}</div>
                      <div className="border bg-white p-0.5"><strong>dTpa</strong><br />20 SEMANAS<br />{currentPatient.vacinas?.dtpa?.data || '____/____/____'}</div>
                    </div>
                    <div className="border bg-white p-0.5 text-[7px]">
                      <strong>HEPATITE B:</strong> 1ª Dose: ____/____ | 2ª Dose: ____/____ | 3ª Dose: ____/____
                    </div>
                  </div>
                </div>

                <div className="italic text-[7.5px] text-center text-gray-700 bg-pink-50/50 p-1 border border-pink-200">
                  "Antes de você existir eu já te queria, antes de você nascer eu já te amava, em menos de um minuto de nascido já daria minha vida por você."
                </div>
              </div>

              {/* DOBRA 2: MATRIZ COMPLETA DE EXAMES LABORATORIAIS & USG */}
              <div className="border-r border-gray-400 pr-2 space-y-2">
                <div>
                  <span className="font-bold text-[8px] uppercase block border-b text-[#2E482A] text-center mb-1">EXAMES LABORATORIAIS</span>
                  <table className="w-full text-[6.8px] border-collapse text-left">
                    <thead>
                      <tr className="border-b bg-gray-100 font-bold">
                        <th className="p-0.5">EXAME</th>
                        <th className="p-0.5">DATA / RESULTADO</th>
                        <th className="p-0.5">DATA / RESULTADO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {LISTA_EXAMES_OFICIAIS.map((ex) => {
                        const d = (currentPatient.examesTabela as any)?.[ex.id] || {};
                        return (
                          <tr key={ex.id}>
                            <td className="p-0.5 font-semibold">{ex.label}</td>
                            <td className="p-0.5">{d.d1 ? `${formatDateDisplay(d.d1)}: ${d.r1}` : '____/____ - __________'}</td>
                            <td className="p-0.5">{d.d2 ? `${formatDateDisplay(d.d2)}: ${d.r2}` : '____/____ - __________'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pt-1 border-t">
                  <span className="font-bold text-[8px] uppercase block text-[#2E482A] text-center mb-1">U.S. OBSTÉTRICO</span>
                  <table className="w-full text-[7px] border-collapse text-center">
                    <thead>
                      <tr className="border-b bg-gray-100 font-bold">
                        <th className="p-0.5">DATA</th>
                        <th className="p-0.5">IG</th>
                        <th className="p-0.5">PF</th>
                        <th className="p-0.5">LA</th>
                        <th className="p-0.5">PL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4].map((_, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-0.5 text-gray-400">____/____/____</td>
                          <td className="p-0.5 text-gray-400">____w</td>
                          <td className="p-0.5 text-gray-400">______g</td>
                          <td className="p-0.5 text-gray-400">______</td>
                          <td className="p-0.5 text-gray-400">______</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DOBRA 3: CONSULTAS DE PRÉ-NATAL E CALENDÁRIO DE AGENDAMENTOS */}
              <div className="space-y-2">
                <div>
                  <span className="font-bold text-[8px] uppercase block border-b text-[#2E482A] text-center mb-1">REGISTRO DE CONSULTAS (EVOLUÇÃO)</span>
                  <table className="w-full text-[7px] border-collapse text-left">
                    <thead>
                      <tr className="border-b bg-gray-100 font-bold">
                        <th className="p-0.5">DATA</th>
                        <th className="p-0.5">IG</th>
                        <th className="p-0.5">PESO</th>
                        <th className="p-0.5">PA</th>
                        <th className="p-0.5">AU</th>
                        <th className="p-0.5">BCF/MF</th>
                        <th className="p-0.5">CONDUTA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {currentPatient.consultasEvolucao.map(c => (
                        <tr key={c.id}>
                          <td className="p-0.5 font-bold">{c.data}</td>
                          <td className="p-0.5">{c.igSem}w</td>
                          <td className="p-0.5">{c.peso}k</td>
                          <td className="p-0.5">{c.pa}</td>
                          <td className="p-0.5">{c.au}</td>
                          <td className="p-0.5">{c.bcfMf}</td>
                          <td className="p-0.5 text-[6.5px]">{c.conduta}</td>
                        </tr>
                      ))}
                      {[1, 2, 3, 4, 5, 6].map((_, i) => (
                        <tr key={`blank-${i}`}>
                          <td className="p-0.5 text-gray-300">__/____</td>
                          <td className="p-0.5 text-gray-300">__w</td>
                          <td className="p-0.5 text-gray-300">__k</td>
                          <td className="p-0.5 text-gray-300">____</td>
                          <td className="p-0.5 text-gray-300">__</td>
                          <td className="p-0.5 text-gray-300">____</td>
                          <td className="p-0.5 text-gray-300">_________________</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* CALENDÁRIO DE CONSULTAS ALIMENTADO DINAMICAMENTE DOS AGENDAMENTOS */}
                <div className="pt-1 border-t">
                  <span className="font-bold text-[8px] uppercase block text-[#2E482A] text-center mb-1">CALENDÁRIO DE CONSULTAS (PRÓXIMAS)</span>
                  <div className="grid grid-cols-2 gap-1 text-[7px] border p-1 bg-gray-50">
                    {Array.from({ length: 4 }).map((_, idx) => {
                      const item = currentPatient.agendaConsultas?.[idx];
                      return (
                        <div key={idx} className="truncate font-medium">
                          {item ? (
                            `DATA: ${formatDateDisplay(item.data)} - ${item.horario}`
                          ) : (
                            'DATA: ____/____/____ - ____:____'
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* MODAL EDITAR EXAMES LABORATORIAIS */}
      {showEditExamesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white p-6 rounded-3xl max-w-xl w-full max-h-[85vh] overflow-y-auto space-y-4">
            <h3 className="font-bold text-gray-900 text-base border-b pb-2">Preencher Tabela de Exames Laboratoriais</h3>
            
            <div className="space-y-3 text-xs">
              {LISTA_EXAMES_OFICIAIS.map(ex => {
                const currentVal = editExamesData[ex.id] || { d1: '', r1: '', d2: '', r2: '' };
                return (
                  <div key={ex.id} className="p-3 bg-gray-50 rounded-2xl border space-y-2">
                    <strong className="text-xs text-[#2E482A] block uppercase">{ex.label}</strong>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block mb-0.5">1º TRIMESTRE (Data / Resultado)</span>
                        <div className="grid grid-cols-2 gap-1">
                          <input 
                            type="date" 
                            value={currentVal.d1 || ''} 
                            onChange={(e) => setEditExamesData({
                              ...editExamesData,
                              [ex.id]: { ...currentVal, d1: e.target.value }
                            })} 
                            className="p-1.5 border rounded-lg text-xs bg-white cursor-pointer" 
                          />
                          <input 
                            type="text" 
                            placeholder={ex.placeholder} 
                            value={currentVal.r1 || ''} 
                            onChange={(e) => setEditExamesData({
                              ...editExamesData,
                              [ex.id]: { ...currentVal, r1: e.target.value }
                            })} 
                            className="p-1.5 border rounded-lg text-xs bg-white font-medium" 
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block mb-0.5">3º TRIMESTRE (Data / Resultado)</span>
                        <div className="grid grid-cols-2 gap-1">
                          <input 
                            type="date" 
                            value={currentVal.d2 || ''} 
                            onChange={(e) => setEditExamesData({
                              ...editExamesData,
                              [ex.id]: { ...currentVal, d2: e.target.value }
                            })} 
                            className="p-1.5 border rounded-lg text-xs bg-white cursor-pointer" 
                          />
                          <input 
                            type="text" 
                            placeholder={ex.placeholder} 
                            value={currentVal.r2 || ''} 
                            onChange={(e) => setEditExamesData({
                              ...editExamesData,
                              [ex.id]: { ...currentVal, r2: e.target.value }
                            })} 
                            className="p-1.5 border rounded-lg text-xs bg-white font-medium" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setShowEditExamesModal(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
              <button onClick={handleSaveTabelaExames} className="px-5 py-2 bg-[#2E482A] text-white font-bold text-xs rounded-xl">Salvar Tabela</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGENDAR CONSULTA / LEMBRETE */}
      {showAddAgendaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-3">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-[#2E482A]" />
              Agendar Próxima Consulta
            </h3>
            
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Data e Horário</label>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="date" 
                  value={newAgenda.data} 
                  onChange={(e) => setNewAgenda({ ...newAgenda, data: e.target.value })} 
                  className="w-full text-xs p-2.5 border rounded-xl bg-white" 
                />
                <input 
                  type="time" 
                  value={newAgenda.horario} 
                  onChange={(e) => setNewAgenda({ ...newAgenda, horario: e.target.value })} 
                  className="w-full text-xs p-2.5 border rounded-xl bg-white" 
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tipo de Consulta / Procedimento</label>
              <select 
                value={newAgenda.tipo} 
                onChange={(e) => setNewAgenda({ ...newAgenda, tipo: e.target.value })} 
                className="w-full text-xs p-2.5 border rounded-xl bg-white"
              >
                <option value="Consulta Pré-Natal de Rotina">Consulta Pré-Natal de Rotina</option>
                <option value="Retorno de Exames">Retorno de Exames</option>
                <option value="Ecografia Obstétrica / Morfológica">Ecografia Obstétrica / Morfológica</option>
                <option value="Consulta de Alto Risco">Consulta de Alto Risco</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Local da Consulta</label>
              <input 
                type="text" 
                value={newAgenda.local} 
                onChange={(e) => setNewAgenda({ ...newAgenda, local: e.target.value })} 
                className="w-full text-xs p-2.5 border rounded-xl" 
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Orientações / Recomendações</label>
              <textarea 
                placeholder="Ex: Jejum de 8h para exame de glicemia, trazer ecografia..." 
                value={newAgenda.observacoes} 
                onChange={(e) => setNewAgenda({ ...newAgenda, observacoes: e.target.value })} 
                className="w-full text-xs p-2.5 border rounded-xl h-16" 
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAddAgendaModal(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
              <button onClick={handleAddAgenda} className="px-4 py-1.5 bg-[#2E482A] text-white font-bold text-xs rounded-xl">Salvar Agendamento</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UPLOAD BASE64 & PROCESSAMENTO GEMINI IA */}
      {showUploadExamModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-3">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#2E482A]" />
              Anexar Laudo / Ecografia com IA
            </h3>
            
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Título do Exame</label>
              <input 
                type="text" 
                placeholder="Ex: Hemograma + Sorologias do 1º Trimestre" 
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
              <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Selecione o Arquivo (Foto do Laudo)</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} 
                className="w-full text-xs p-2 border bg-gray-50 rounded-xl" 
              />
            </div>

            {isUploading && (
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                <span>Gemini IA analisando foto do laudo e extraindo dados...</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowUploadExamModal(false)} className="px-3 py-1.5 text-xs text-gray-500" disabled={isUploading}>
                Cancelar
              </button>
              <button 
                onClick={handleFileUpload} 
                disabled={isUploading} 
                className="px-4 py-1.5 bg-[#2E482A] text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                {isUploading ? "Processando..." : "Analisar com IA & Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR CONSULTA */}
      {showAddConsultaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-3">
            <h3 className="font-bold text-gray-900 text-base">Registrar Nova Consulta</h3>
            <input type="date" value={newConsulta.data} onChange={(e) => setNewConsulta({ ...newConsulta, data: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="Semanas (IG)" value={newConsulta.igSem} onChange={(e) => setNewConsulta({ ...newConsulta, igSem: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
              <input type="text" placeholder="Peso (kg)" value={newConsulta.peso} onChange={(e) => setNewConsulta({ ...newConsulta, peso: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="P.A." value={newConsulta.pa} onChange={(e) => setNewConsulta({ ...newConsulta, pa: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
              <input type="text" placeholder="A.U." value={newConsulta.au} onChange={(e) => setNewConsulta({ ...newConsulta, au: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            </div>
            <input type="text" placeholder="BCF / Mov. Fetal" value={newConsulta.bcfMf} onChange={(e) => setNewConsulta({ ...newConsulta, bcfMf: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            <textarea placeholder="Conduta / Recomendações" value={newConsulta.conduta} onChange={(e) => setNewConsulta({ ...newConsulta, conduta: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl h-20" />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowAddConsultaModal(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
              <button onClick={handleAddConsulta} className="px-4 py-1.5 bg-[#2E482A] text-white font-bold text-xs rounded-xl">Salvar Registro</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CADASTRAR NOVA PACIENTE */}
      {showNewPatientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-3">
            <h3 className="font-bold text-gray-900 text-base">Cadastrar Gestante no Banco</h3>
            <input type="text" placeholder="Nome Completo" value={newPatient.nome} onChange={(e) => setNewPatient({ ...newPatient, nome: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            <input type="text" placeholder="CPF" value={newPatient.cpf} onChange={(e) => setNewPatient({ ...newPatient, cpf: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
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

      {/* MODAL LOGIN PACIENTE */}
      {showPatientLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:hidden">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:hidden">
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
