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
    console.error("VITE_GEMINI_API_KEY não foi encontrada.");
    return "🌸 Mamãe, o serviço de IA está sendo inicializado. Se persistir, consulte a Dra. Priscila diretamente!";
  }

  // Endpoint oficial Google Generative Language
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const promptText = `Você é a Assistente Pré-Natal da Dra. Priscila Gapski (CRM 24734).
Paciente: ${patient.nome}, Gestação: ${weeks} semanas, Bebê: ${patient.nomeBebe || 'Bebê'}.
Mensagem da Gestante: "${userMessage}"

Diretrizes:
- Responda em português com carinho, acolhimento e emojis (🌸, 👶).
- Explique de forma simples para a fase de ${weeks} semanas.
- NUNCA prescreva remédios. Em caso de dor forte, sangramento ou perda de líquido, oriente ir ao pronto-atendimento com urgência.`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: promptText }]
      }
    ]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey 
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (answer) return answer;
    } else {
      const errorJson = await response.json().catch(() => null);
      console.error("Erro da API Gemini:", response.status, errorJson);
      if (response.status === 400 || response.status === 403) {
        return "🌸 Mamãe, a chave de autenticação do assistente precisa de uma validação no painel. Qualquer dúvida urgente, fale com a Dra. Priscila!";
      }
    }
  } catch (error) {
    console.error("Erro de conexão fetch:", error);
  }

  return "🌸 Desculpe, mamãe! Tive uma oscilação temporária de conexão. Qualquer dúvida urgente sobre sua gestação, fale com a Dra. Priscila!";
};
