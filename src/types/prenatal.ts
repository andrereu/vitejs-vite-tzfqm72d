export interface VacinaItem {
  realizada?: boolean;
  data?: string;
  lote?: string;
  d1?: string;
  d2?: string;
  d3?: string;
}

// Um exame pode ser repetido quantas vezes for preciso durante a gestação —
// por isso é uma lista (mais recente primeiro), não um número fixo de
// colunas. Substituiu o formato antigo (ExameItem com d1/r1/d2/r2), que só
// guardava 2 resultados por exame e perdia dado quando a paciente repetia
// um exame mais de duas vezes.
export interface ResultadoExame {
  data: string;
  resultado: string;
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
  // Vínculo opcional com a AgendaConsulta que originou este registro —
  // só existe quando o formulário foi aberto a partir da Agenda ("Registrar
  // atendimento"). Registros do fluxo antigo ("Registrar Nova Consulta" no
  // Gráfico GPG) continuam sem esse campo, sem quebra de compatibilidade.
  agendaConsultaId?: string;
}

export type UserRole = 'paciente' | 'medica' | 'secretaria' | 'master_admin';

export type AppointmentStatus = 
  | 'solicitada'       // Paciente pediu pelo app (Pendente)
  | 'confirmada'       // Secretária/Médica aprovou
  | 'cancelada'        // Cancelada por qualquer parte
  | 'encaixe_urgente'  // Encaixe prioritário criado pela clínica
  | 'realizada';       // Consulta já concluída

export interface AgendaConsulta {
  id: string;
  data: string; // YYYY-MM-DD
  // Horário efetivamente definido, HH:mm — só existe depois que a equipe
  // confirma. Numa solicitação ainda pendente (status "solicitada") fica
  // vazio; o período que a paciente prefere vai em periodoPreferido, nunca
  // aqui (esse campo nunca guarda texto como "Manhã"/"Tarde").
  horario: string; // HH:mm, ou "" enquanto não há horário confirmado
  tipo: string; // Ex: Pré-natal de Rotina, Retorno, Urgência
  local: string;
  observacoes?: string;
  status: AppointmentStatus;
  solicitadoPor?: 'paciente' | 'clinica';
  solicitadoEm?: string;
  motivoCancelamento?: string;
  notaSecretaria?: string;
  lembreteEnviadoEm?: string;
  // Período que a paciente indicou ao solicitar (antes de a equipe definir
  // um horário exato). Independente de horario — os dois podem conviver:
  // depois de confirmada, a consulta guarda tanto o período original quanto
  // o horário HH:mm que a equipe marcou de fato.
  periodoPreferido?: 'manha' | 'tarde' | 'final_do_dia';
}

// Bloqueio de agenda: dois formatos possíveis no mesmo tipo — dia inteiro
// (diaInteiro: true, sem horarioInicio/horarioFim) ou período parcial dentro
// de um dia (diaInteiro: false, com horarioInicio/horarioFim preenchidos).
// Os dois campos de horário são opcionais justamente pra não obrigar
// documentos antigos (todos "dia inteiro" até aqui) a tê-los. Persistência
// no Firestore e UI de bloqueio parcial ainda não existem — só o tipo já
// está preparado pra representar os dois casos.
export interface HorarioBloqueado {
  id: string;
  data: string;
  horarioInicio?: string; // HH:mm — só quando diaInteiro é false
  horarioFim?: string; // HH:mm — só quando diaInteiro é false
  diaInteiro: boolean;
  motivo: string; // Ex: Congresso, Feriado, Folga
}

export interface PatientFinancialRecord {
  id: string;
  data: string;
  descricao: string; // Ex: "Consulta Pré-Natal", "Procedimento / Parto", "Exame Cardiotoco"
  valor: number;
  tipoAtendimento: 'particular' | 'convenio';
  convenioNome?: string; // Ex: "Unimed", "Bradesco Saúde", "SulAmérica", "Paraná Clínicas"
  statusPagamento: 'pago' | 'pendente' | 'glosado';
  formaPagamento?: 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'faturamento_guia';
}
// Categorias da Linha do Tempo da Gestação — vive aqui (não em
// utils/gestationTimeline.ts) porque tanto o protocolo padrão quanto os
// itens personalizados por paciente (MarcoPersonalizado, logo abaixo)
// precisam dela, e Patient não pode depender de um arquivo de lógica.
export type MarcoCategoria = 'consulta' | 'exame' | 'vacina' | 'ultrassom' | 'suplementacao';

// Item que a própria médica adiciona pra uma paciente específica (ex: "consulta
// com endocrinologista" pra uma gestante diabética) — além dos marcos padrão
// do protocolo, que são iguais pra todo mundo.
export interface MarcoPersonalizado {
  id: string;
  titulo: string;
  descricao?: string;
  categoria: MarcoCategoria;
  semanaInicio: number;
  semanaFim: number;
  concluidoEm?: string;
}

export interface Patient {
  id: string;
  doctorId: string;
  cpf: string;
  telefone?: string;
  email?: string;
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
  examesTabela: Record<string, ResultadoExame[]>;
  consultasEvolucao: ConsultaEvolucao[];
  agendaConsultas: AgendaConsulta[];
  examesEnviados?: any[];
   // Novos campos financeiros da paciente
  tipoAtendimentoPadrao?: 'particular' | 'convenio';
  convenioNome?: string;
  numeroCarteirinhaConvenio?: string;
  historicoFinanceiro?: PatientFinancialRecord[];
  // LGPD: pedido da própria paciente pra remover os dados dela. Não apaga
  // nada sozinho — só avisa a médica, que decide/executa (o prontuário tem
  // obrigação legal de retenção por tempo determinado, então a exclusão
  // nem sempre pode ser imediata).
  solicitacaoExclusao?: { em: string; atendida: boolean };
  // Linha do Tempo da Gestação: só guarda os marcos que não têm nenhum campo
  // estruturado próprio pra indicar "feito" (ex: ecografias) — os que já são
  // rastreados em outro lugar (vacinas, exames, consultas) usam esses campos
  // como fonte da verdade, sem duplicar aqui.
  marcosTimeline?: Record<string, { concluidoEm: string }>;
  // Itens da Linha do Tempo criados pela médica só pra essa paciente —
  // somados aos marcos padrão do protocolo, não os substituem.
  marcosPersonalizados?: MarcoPersonalizado[];
}

export const initialPatientsList: Patient[] = [
  {
    id: "gestante-01",
    doctorId: "doc-priscila",
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
      hbVg: [{ data: "2026-02-20", resultado: "12.8 g/dL / 38%" }],
      plaquetas: [{ data: "2026-02-20", resultado: "245.000 /mm³" }],
      glicemiaTotg: [{ data: "2026-02-20", resultado: "82 mg/dL" }],
      htlv: [{ data: "2026-02-20", resultado: "Não Reagente" }],
      hiv: [{ data: "2026-02-20", resultado: "Não Reagente" }],
      sifilis: [{ data: "2026-02-20", resultado: "Não Reagente" }],
      hbsag: [{ data: "2026-02-20", resultado: "Não Reagente" }],
      tsh: [{ data: "2026-02-20", resultado: "1.8 mIU/L" }],
      antiHcv: [{ data: "2026-02-20", resultado: "Não Reagente" }],
      rubeola: [{ data: "2026-02-20", resultado: "IgG Imune" }],
      cmv: [{ data: "2026-02-20", resultado: "IgG Imune" }],
      toxo: [{ data: "2026-02-20", resultado: "IgG+ IgM-" }],
      vitD: [{ data: "2026-02-20", resultado: "34 ng/mL" }],
      ferritina: [{ data: "2026-02-20", resultado: "65 ng/mL" }],
      vitB12: [{ data: "2026-02-20", resultado: "420 pg/mL" }],
      urinaUrocultura: [{ data: "2026-02-20", resultado: "Normal / Ausente" }],
      gbs: []
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
        status: "confirmada"
      },
      {
        id: "ag-2",
        data: "2026-10-01",
        horario: "10:00",
        tipo: "Avaliação Fetal / Retorno",
        local: "Consultório Dra. Priscila Gapski",
        observacoes: "Checar ultrassom de acompanhamento.",
        status: "confirmada"
      }
    ],
    examesEnviados: []
  }
];
