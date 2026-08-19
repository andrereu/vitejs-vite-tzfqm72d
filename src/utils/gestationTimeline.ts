import type { MarcoCategoria, MarcoPersonalizado, Patient } from '../types/prenatal';

export type { MarcoCategoria };
export type MarcoStatus = 'realizado' | 'proximo' | 'atrasado' | 'futuro';

// Mesma regra pros marcos do protocolo e pros personalizados por paciente:
// feito vale sempre; sem feito, olha se a janela de semanas já passou,
// já abriu, ou ainda nem chegou.
function calcularStatus(feito: boolean, semanaInicio: number, semanaFim: number, semanaAtual: number): MarcoStatus {
  if (feito) return 'realizado';
  if (semanaAtual > semanaFim) return 'atrasado';
  if (semanaAtual >= semanaInicio) return 'proximo';
  return 'futuro';
}

// Em que semana de gestação uma data caiu, a partir da DUM — usado pra saber
// se um resultado de exame (ou upload da Central de Exames) pertence à
// janela de um marco específico, já que agora cada exame guarda um
// histórico livre em vez de só "1º trimestre / 3º trimestre".
function semanaNaData(dum: string, data: string): number {
  if (!dum || !data) return -1;
  const diffDias = (new Date(data).getTime() - new Date(dum).getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(diffDias / 7);
}

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
    checarFeito: (p) => {
      const historico = p.examesTabela?.hiv || [];
      const maisAntigo = historico[historico.length - 1];
      return { feito: historico.length > 0, em: maisAntigo?.data };
    }
  },
  {
    id: 'usg-morfologica-1',
    categoria: 'ultrassom',
    titulo: 'Ecografia Morfológica do 1º Trimestre',
    descricao: 'Medição da Translucência Nucal (TN) e osso nasal.',
    semanaInicio: 11,
    semanaFim: 14,
    tabAlvo: 'examesCentral',
    checarFeito: (p) => checarUltrassom(p, 'usg-morfologica-1', 10, 17)
  },
  {
    id: 'usg-morfologica-2',
    categoria: 'ultrassom',
    titulo: 'Ecografia Morfológica do 2º Trimestre',
    descricao: 'Avaliação detalhada da anatomia fetal e do coração.',
    semanaInicio: 20,
    semanaFim: 24,
    tabAlvo: 'examesCentral',
    checarFeito: (p) => checarUltrassom(p, 'usg-morfologica-2', 19, 27)
  },
  {
    id: 'totg',
    categoria: 'exame',
    titulo: 'TOTG (Teste de Glicose)',
    descricao: 'Rastreio de Diabetes Gestacional.',
    semanaInicio: 24,
    semanaFim: 28,
    tabAlvo: 'examesTabela',
    checarFeito: (p) => {
      const ultimo = p.examesTabela?.glicemiaTotg?.[0];
      return { feito: !!ultimo, em: ultimo?.data };
    }
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
    checarFeito: (p) => {
      const historico = p.examesTabela?.hiv || [];
      const doTerceiroTri = historico.find((h) => semanaNaData(p.dum, h.data) >= 28);
      return { feito: !!doTerceiroTri, em: doTerceiroTri?.data };
    }
  },
  {
    id: 'gbs',
    categoria: 'exame',
    titulo: 'Estreptococo do Grupo B (GBS)',
    descricao: 'Swab vaginal/retal de prevenção neonatal.',
    semanaInicio: 35,
    semanaFim: 37,
    tabAlvo: 'examesTabela',
    checarFeito: (p) => {
      const ultimo = p.examesTabela?.gbs?.[0];
      return { feito: !!ultimo, em: ultimo?.data };
    }
  },
  {
    id: 'suplemento-acido-folico',
    categoria: 'suplementacao',
    titulo: 'Suplementação de Ácido Fólico',
    descricao: 'Prevenção de defeitos do tubo neural — do início até a 12ª/14ª semana.',
    semanaInicio: 0,
    semanaFim: 13,
    checarFeito: (p) => {
      const m = p.marcosTimeline?.['suplemento-acido-folico'];
      return { feito: !!m, em: m?.concluidoEm };
    }
  },
  {
    id: 'suplemento-sulfato-ferroso',
    categoria: 'suplementacao',
    titulo: 'Suplementação de Sulfato Ferroso',
    descricao: 'Prevenção de anemia gestacional — a partir da 20ª semana.',
    semanaInicio: 20,
    semanaFim: 40,
    checarFeito: (p) => {
      const m = p.marcosTimeline?.['suplemento-sulfato-ferroso'];
      return { feito: !!m, em: m?.concluidoEm };
    }
  }
];

// Ecografias não têm campo próprio na tabela de exames — mas quase sempre
// são enviadas pela Central de Exames + IA, então detecta sozinho ali
// (tipo "Ecografia" enviado dentro da janela do marco, com uma folga de
// ~3 semanas pra pra não perder um envio um pouco atrasado). Só cai no
// marcosTimeline (marca manual) quando não veio de nenhum upload — por
// exemplo, exame feito fora e só comentado verbalmente com a médica.
function checarUltrassom(p: Patient, marcoId: string, semanaMin: number, semanaMax: number) {
  const upload = (p.examesEnviados || []).find(
    (e: any) => e.tipo === 'Ecografia' && semanaNaData(p.dum, e.dataUpload) >= semanaMin && semanaNaData(p.dum, e.dataUpload) <= semanaMax
  );
  const manual = p.marcosTimeline?.[marcoId];
  return { feito: !!upload || !!manual, em: upload?.dataUpload || manual?.concluidoEm };
}

export interface MarcoComStatus extends MarcoDefinicao {
  status: MarcoStatus;
  em?: string;
  // true só nos itens que a médica criou pra essa paciente específica — os
  // do protocolo padrão (MARCOS_GESTACAO) não têm essa marca.
  personalizado?: boolean;
}

export function getTimelineForPatient(patient: Patient, semanaAtual: number): MarcoComStatus[] {
  const doProtocolo: MarcoComStatus[] = MARCOS_GESTACAO.map((marco) => {
    const { feito, em } = marco.checarFeito(patient);
    return { ...marco, em, status: calcularStatus(feito, marco.semanaInicio, marco.semanaFim, semanaAtual) };
  });

  const personalizados: MarcoComStatus[] = (patient.marcosPersonalizados || []).map((item) => ({
    id: item.id,
    categoria: item.categoria,
    titulo: item.titulo,
    descricao: item.descricao || 'Item adicionado pela médica para esta paciente.',
    semanaInicio: item.semanaInicio,
    semanaFim: item.semanaFim,
    checarFeito: () => ({ feito: !!item.concluidoEm, em: item.concluidoEm }),
    em: item.concluidoEm,
    status: calcularStatus(!!item.concluidoEm, item.semanaInicio, item.semanaFim, semanaAtual),
    personalizado: true
  }));

  return [...doProtocolo, ...personalizados].sort((a, b) => a.semanaInicio - b.semanaInicio);
}

export function criarMarcoPersonalizado(dados: Omit<MarcoPersonalizado, 'id'>): MarcoPersonalizado {
  return { id: `marco-${Date.now()}`, ...dados };
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
