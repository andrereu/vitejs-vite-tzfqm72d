import { Patient } from '../types/prenatal';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

export const sendPrenatalChatMessage = async (
  userMessage: string,
  patient: Patient,
  weeks: number,
  chatHistory: ChatMessage[]
): Promise<string> => {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || "").trim();

  if (!apiKey) {
    return "❌ Erro: VITE_GEMINI_API_KEY não foi encontrada nas variáveis de ambiente da Vercel.";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const promptText = `Você é a Assistente Virtual Pré-Natal da Dra. Priscila Gapski (CRM 24734).
Paciente: ${patient.nome}, Gestação: ${weeks} semanas, Bebê: ${patient.nomeBebe || 'Bebê'}.
Dúvida: "${userMessage}"

Responda em português com carinho, acolhimento e emojis. Sem prescrições médicas.`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });

    const data = await response.json();

    if (response.ok) {
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Resposta vazia da IA.";
    } else {
      // Retorna o motivo exato retornado pelo Google na tela
      return `❌ Erro da API (${response.status}): ${data?.error?.message || JSON.stringify(data)}`;
    }
  } catch (error: any) {
    return `❌ Erro no fetch/rede: ${error?.message || error}`;
  }
};
