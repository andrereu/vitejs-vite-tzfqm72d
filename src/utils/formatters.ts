export const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
};

export const formatDateBR = (dateStr: string): string => {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const MESES_ABREV = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

// UX-05 — "20 AGO 2026": formato pra cabeçalho de agrupador temporal (Central
// de Exames), mais escaneável que DD/MM/AAAA quando a data é o âncora de um
// bloco de itens, não o dado principal de uma linha. Não usada nos itens em
// si (esses continuam com formatDateBR) — só nos cabeçalhos de grupo.
export const formatarDataAgrupador = (dateStr: string): string => {
  if (!dateStr || !dateStr.includes('-')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [ano, mes, dia] = parts;
  const mesIdx = parseInt(mes, 10) - 1;
  if (mesIdx < 0 || mesIdx > 11) return dateStr;
  return `${parseInt(dia, 10)} ${MESES_ABREV[mesIdx]} ${ano}`;
};

// Data civil local (YYYY-MM-DD) a partir dos componentes locais do Date, em
// vez de new Date().toISOString().split('T')[0] — que passa por UTC antes de
// cortar a data e pode devolver o dia seguinte (ou anterior) dependendo do
// fuso e da hora do dia. Uso: datas de agenda/calendário (solicitação de
// consulta, bloqueio de agenda, "amanhã" dos lembretes) — não mexe nos
// cálculos clínicos (DUM/DPP/idade gestacional), que têm sua própria lógica.
export const getLocalDateString = (date: Date = new Date()): string => {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

// Rótulo curto de período preferido — só pra listas compactas de agenda
// (ex: painel "Solicitações Pendentes"), não o texto completo usado no
// formulário de solicitação (RequestAppointmentModal).
const LABEL_PERIODO_CURTO: Record<'manha' | 'tarde' | 'final_do_dia', string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  final_do_dia: 'Final do dia'
};

// Resumo de "quando" uma consulta/solicitação é, pra listas compactas: HH:mm
// já confirmado, se existir; senão o período que a paciente preferiu, se ela
// indicou um; senão nada — nunca um "às" pendurado no vazio. Devolve já com
// o separador (" às HH:mm" / " · Manhã"), pronto pra concatenar depois da
// data formatada.
export const formatarHorarioResumo = (horario: string, periodoPreferido?: 'manha' | 'tarde' | 'final_do_dia'): string => {
  if (horario) return ` às ${horario}`;
  if (periodoPreferido) return ` · ${LABEL_PERIODO_CURTO[periodoPreferido]}`;
  return '';
};

// Segundo parâmetro opcional (YYYY-MM-DD) — IG numa data específica em vez de
// "hoje" (ex: a data de um atendimento passado/futuro). Parseado do mesmo
// jeito que a DUM (new Date de uma string "YYYY-MM-DD", sem hora), então a
// subtração entre as duas datas nunca sofre o problema de fuso que
// toISOString() causaria. Omitido, o comportamento é idêntico ao de sempre
// (IG de hoje).
export const calculateWeeksAndDays = (dumStr: string, referenceDateStr?: string) => {
  if (!dumStr) return { weeks: 0, days: 0 };
  const dum = new Date(dumStr);
  const referencia = referenceDateStr ? new Date(referenceDateStr) : new Date();
  const diffDays = Math.floor(Math.max(0, referencia.getTime() - dum.getTime()) / (1000 * 60 * 60 * 24));
  return { weeks: Math.floor(diffDays / 7), days: diffDays % 7 };
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
