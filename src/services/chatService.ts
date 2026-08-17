import type { Patient } from '../types/prenatal';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

// A conversa com o Gemini roda em api/prenatal-chat.ts (função da Vercel),
// não aqui no navegador — assim a chave da API do Gemini nunca fica exposta.
export const sendPrenatalChatMessage = async (
  userMessage: string,
  patient: Patient,
  weeks: number,
  _chatHistory: ChatMessage[]
): Promise<string> => {
  try {
    const response = await fetch('/api/prenatal-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage,
        patientNome: patient.nome,
        patientNomeBebe: patient.nomeBebe,
        weeks
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.reply) return data.reply;
    }
  } catch (error) {
    console.error('Erro ao processar resposta do chat:', error);
  }

  return '🌸 Desculpe, mamãe! Tive uma oscilação temporária de conexão. Qualquer dúvida urgente sobre sua gestação, fale com a Dra. Priscila!';
};
