import React, { useState, useMemo } from 'react';
import { 
  Heart, LogOut
} from 'lucide-react';

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
    examesLab: [],
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
    agendaConsultas: [],
    examesEnviados: []
  }
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'patient_app' | 'admin_dashboard'>('landing');
  const [userRole, setUserRole] = useState<'paciente' | 'medica' | null>(null);
  const [patients] = useState(initialPatientsList);
  const [selectedPatientId, setSelectedPatientId] = useState("gestante-01");
  const [searchQuery] = useState("");

  const [showPatientLoginModal, setShowPatientLoginModal] = useState(false);
  const [showDoctorLoginModal, setShowDoctorLoginModal] = useState(false);
  const [loginCpf, setLoginCpf] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const currentPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId) || patients[0];
  }, [patients, selectedPatientId]);

  const calculateWeeksAndDays = (dumStr: string) => {
    if (!dumStr) return { weeks: 0, days: 0, text: "Não calculada" };
    const dum = new Date(dumStr);
    const today = new Date();
    const diffTime = Math.max(0, today.getTime() - dum.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;
    return { weeks, days, text: `${weeks} sem e ${days} d` };
  };

  const currentGest = calculateWeeksAndDays(currentPatient.dum);

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

  const handleDemoPatientLogin = (patientId: string) => {
    setSelectedPatientId(patientId);
    setUserRole('paciente');
    setCurrentScreen('patient_app');
  };

  const handleDemoDoctorLogin = () => {
    setUserRole('medica');
    setCurrentScreen('admin_dashboard');
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

      {currentScreen === 'landing' && (
        <div className="space-y-8 pt-8 px-4 max-w-4xl mx-auto text-center">
          <div className="bg-[#2E482A] text-white p-8 rounded-3xl shadow-lg">
            <h2 className="text-2xl md:text-4xl font-serif font-bold text-[#F4F6F0]">
              Carteirinha Pré-Natal Digital
            </h2>
            <p className="text-xs md:text-sm text-[#A3B18A] mt-2">
              Acompanhamento de gestação, curvas de peso e laudos.
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
