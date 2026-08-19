import type { Patient } from '../types/prenatal';

export type MarcoCategoria = 'consulta' | 'exame' | 'vacina' | 'ultrassom';
export type MarcoStatus = 'realizado' | 'proximo' | 'atrasado' | 'futuro';

export interface MarcoDefinicao {
  id: string;
  categoria: MarcoCategoria;
  titulo: string;
  descricao: string;
  semanaInicio: number;
  semanaFim: number;
  // Aba do app onde esse dado é editado de verdade — clicar no marco leva
  // pra lá, em vez de duplicar o campo de edição dentro da própria linha do
  // tempo. Ausente só nos marcos que não têm campo próprio (ecografias).
  tabAlvo?: string;
  // Cada marco sabe checar sozinho, a partir dos dados que já existem no
  // prontuário, se já foi feito — e quando. Só cai no marcosTimeline (marca
  // manual) quando não existe nenhum campo estruturado equivalente.
  checarFeito: (patient: Patient) => { feito: boolean; em?: string };
}

// Protocolo padrão do pré-natal (mesmas janelas de semana já usadas nos
// alertas de "Exames Recomendados para esta Fase" em App.tsx), reorganizado
// aqui como marcos com data de início/fim e checagem automática de status.
export const MARCOS_GESTACAO: MarcoDefinicao[] = [
  {
    id: 'primeira-consulta',
    categoria: 'consulta',
    titulo: 'Primeira Consulta / Início do Pré-natal',
    descricao: 'Anamnese inicial, cálculo da DPP e solicitação dos primeiros exames.',
    semanaInicio: 0,
    semanaFim: 13,
    tabAlvo: 'consultas',
    checarFeito: (p) => {
      const primeira = p.consultasEvolucao?.[0];
      return { feito: !!primeira, em: primeira?.data };
    }
  },
  {
    id: 'exames-1a-coleta',
    categoria: 'exame',
    titulo: 'Exames de Rotina — 1ª Coleta',
    descricao: 'Hemograma, glicemia, sorologias (HIV, sífilis, toxoplasmose) e tipagem sanguínea.',
    semanaInicio: 6,
    semanaFim: 13,
    tabAlvo: 'examesTabela',
    checarFeito: (p) => ({ feito: !!p.examesTabela?.hiv?.d1, em: p.examesTabela?.hiv?.d1 })
  },
  {
    id: 'usg-morfologica-1',
    categoria: 'ultrassom',
    titulo: 'Ecografia Morfológica do 1º Trimestre',
    descricao: 'Medição da Translucência Nucal (TN) e osso nasal.',
    semanaInicio: 11,
    semanaFim: 14,
    checarFeito: (p) => ({ feito: !!p.marcosTimeline?.['usg-morfologica-1'], em: p.marcosTimeline?.['usg-morfologica-1']?.concluidoEm })
  },
  {
    id: 'usg-morfologica-2',
    categoria: 'ultrassom',
    titulo: 'Ecografia Morfológica do 2º Trimestre',
    descricao: 'Avaliação detalhada da anatomia fetal e do coração.',
    semanaInicio: 20,
    semanaFim: 24,
    checarFeito: (p) => ({ feito: !!p.marcosTimeline?.['usg-morfologica-2'], em: p.marcosTimeline?.['usg-morfologica-2']?.concluidoEm })
  },
  {
    id: 'totg',
    categoria: 'exame',
    titulo: 'TOTG (Teste de Glicose)',
    descricao: 'Rastreio de Diabetes Gestacional.',
    semanaInicio: 24,
    semanaFim: 28,
    tabAlvo: 'examesTabela',
    checarFeito: (p) => ({ feito: !!p.examesTabela?.glicemiaTotg?.d1, em: p.examesTabela?.glicemiaTotg?.d1 })
  },
  {
    id: 'vacina-dtpa',
    categoria: 'vacina',
    titulo: 'Vacina dTPa',
    descricao: 'Imunização contra coqueluche (protege o bebê nos primeiros meses).',
    semanaInicio: 20,
    semanaFim: 36,
    tabAlvo: 'vacinas',
    checarFeito: (p) => ({ feito: !!p.vacinas?.dtpa?.realizada, em: p.vacinas?.dtpa?.data })
  },
  {
    id: 'sorologias-3-tri',
    categoria: 'exame',
    titulo: 'Sorologias do 3º Trimestre',
    descricao: 'Repetição de VDRL, HIV, Toxoplasmose e Hemograma.',
    semanaInicio: 28,
    semanaFim: 34,
    tabAlvo: 'examesTabela',
    checarFeito: (p) => ({ feito: !!p.examesTabela?.hiv?.d2, em: p.examesTabela?.hiv?.d2 })
  },
  {
    id: 'gbs',
    categoria: 'exame',
    titulo: 'Estreptococo do Grupo B (GBS)',
    descricao: 'Swab vaginal/retal de prevenção neonatal.',
    semanaInicio: 35,
    semanaFim: 37,
    tabAlvo: 'examesTabela',
    checarFeito: (p) => ({ feito: !!p.examesTabela?.gbs?.d1, em: p.examesTabela?.gbs?.d1 })
  }
];

export interface MarcoComStatus extends MarcoDefinicao {
  status: MarcoStatus;
  em?: string;
}

export function getTimelineForPatient(patient: Patient, semanaAtual: number): MarcoComStatus[] {
  return MARCOS_GESTACAO.map((marco) => {
    const { feito, em } = marco.checarFeito(patient);
    let status: MarcoStatus;
    if (feito) status = 'realizado';
    else if (semanaAtual > marco.semanaFim) status = 'atrasado';
    else if (semanaAtual >= marco.semanaInicio) status = 'proximo';
    else status = 'futuro';
    return { ...marco, status, em };
  });
}

export function getTimelineSummary(patient: Patient, semanaAtual: number) {
  const marcos = getTimelineForPatient(patient, semanaAtual);
  return {
    total: marcos.length,
    realizados: marcos.filter((m) => m.status === 'realizado').length,
    atrasados: marcos.filter((m) => m.status === 'atrasado').length,
    proximos: marcos.filter((m) => m.status === 'proximo').length
  };
}
