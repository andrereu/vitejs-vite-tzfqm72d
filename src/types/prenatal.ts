export interface VacinaItem {
  realizada?: boolean;
  data?: string;
  lote?: string;
  d1?: string;
  d2?: string;
  d3?: string;
}

export interface ExameItem {
  d1: string;
  r1: string;
  d2: string;
  r2: string;
}

export interface ConsultaEvolucao {
  id: string;
  data: string;
  igSem: number;
  peso: number;
  pa: string;
  au: string;
  bcfMf: string;
  edema: string;
  conduta: string;
}

export interface AgendaConsulta {
  id: string;
  data: string;
  horario: string;
  tipo: string;
  local: string;
  observacoes: string;
  status: 'agendada' | 'concluida' | 'cancelada';
}

export interface Patient {
  id: string;
  cpf: string;
  telefone?: string;
  senhaAcc?: string;
  nome: string;
  idade: string;
  pai: string;
  nomeBebe: string;
  dum: string;
  dpp: string;
  g: string;
  p: string;
  c: string;
  a: string;
  pesoInicial: string;
  altura: string;
  tipoSanguineo: string;
  doencasPrevias: string;
  vacinas: Record<string, VacinaItem>;
  examesTabela: Record<string, ExameItem>;
  consultasEvolucao: ConsultaEvolucao[];
  agendaConsultas: AgendaConsulta[];
  examesEnviados?: any[];
}

export const initialPatientsList: Patient[] = [
  {
    id: "gestante-01",
    cpf: "123.456.789-00",
    telefone: "(41) 99999-8888",
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
      covid19: { realizada: true, data: "2026-02-15", lote: "COV-3" },
      hepatiteB: { d1: "2026-01-20", d2: "2026-02-20", d3: "" }
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
