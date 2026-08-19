import type { Patient, AgendaConsulta, ConsultaEvolucao } from '../types/prenatal';
import { formatDateBR } from './formatters';

// Limpa caracteres especiais do telefone deixando apenas números com DDI 55
export const cleanPhoneNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  // Se não tiver o DDI 55 (Brasil), adiciona automaticamente
  if (digits.length <= 11) {
    return `55${digits}`;
  }
  return digits;
};

// Gera link de lembrete de consulta para o WhatsApp
export const generateAppointmentReminderLink = (patient: Patient, agenda: AgendaConsulta): string => {
  const phone = cleanPhoneNumber(patient.telefone || '');
  
  const text = `🌸 *Olá, ${patient.nome}!*

Lembramos da sua próxima consulta de Pré-Natal:
🗓️ *Data:* ${formatDateBR(agenda.data)} às ${agenda.horario}
📍 *Local:* ${agenda.local}
🩺 *Tipo:* ${agenda.tipo}
${agenda.observacoes ? `\n💡 *Orientações:* ${agenda.observacoes}` : ''}

Por favor, lembre-se de trazer sua carteirinha e exames recentes.
_Consultório Dra. Priscila Gapski_`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
};

// Gera link com resumo da consulta realizada
export const generateConsultationSummaryLink = (patient: Patient, consulta: ConsultaEvolucao): string => {
  const phone = cleanPhoneNumber(patient.telefone || '');

  const text = `🩺 *Resumo da Consulta de Pré-Natal*
👶 *Gestante:* ${patient.nome} (${patient.nomeBebe ? `Bebê ${patient.nomeBebe}` : ''})
📅 *Data:* ${formatDateBR(consulta.data)}

📊 *Evolução Clínica:*
• *Idade Gestacional:* ${consulta.igSem} semanas
• *Peso:* ${consulta.peso} kg
• *Pressão Arterial:* ${consulta.pa}
• *Altura Uterina:* ${consulta.au}
• *BCF / Mov. Fetal:* ${consulta.bcfMf}

📝 *Conduta & Recomendações:*
${consulta.conduta || 'Rotina de pré-natal mantida com sucesso.'}

_Dra. Priscila Gapski • CRM 24734_`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
};

// Compartilhamento geral da carteirinha (para a paciente mandar para a família)
export const sharePatientCard = async (patient: Patient) => {
  const shareData = {
    title: `Carteirinha Pré-Natal • ${patient.nome}`,
    text: `Acompanhe a gestação de ${patient.nome} (Bebê: ${patient.nomeBebe || 'Arthur'}) pela carteirinha digital!`,
    url: window.location.href,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (err) {
      // Compartilhamento cancelado ou não suportado
    }
  } else {
    // Fallback WhatsApp Web/App
    const msg = `🌸 *Carteirinha de Pré-Natal Digital*\nAcompanhe a gestação de *${patient.nome}* no link:\n${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }
};
