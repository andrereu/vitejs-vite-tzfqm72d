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

export const calculateWeeksAndDays = (dumStr: string) => {
  if (!dumStr) return { weeks: 0, days: 0 };
  const dum = new Date(dumStr);
  const today = new Date();
  const diffDays = Math.floor(Math.max(0, today.getTime() - dum.getTime()) / (1000 * 60 * 60 * 24));
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
