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
    console.error("VITE_GEMINI_API_KEY vazia na Vercel.");
    return "🌸 Mamãe, o serviço de IA está sendo inicializado. Qualquer dúvida urgente, fale com a Dra. Priscila!";
  }

  // Endpoint nativo com suporte total ao novo formato AQ.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const promptText = `Você é a Assistente Virtual Pré-Natal integrada à carteirinha digital da gestante acompanhada pela Dra. Priscila Gapski (CRM 24734).
Informações da gestante:
- Nome: ${patient.nome}
- Idade Gestacional: ${weeks} semanas
- Nome do Bebê: ${patient.nomeBebe || 'Bebê'}
- DUM: ${patient.dum} | DPP: ${patient.dpp}

Pergunta da gestante: "${userMessage}"

Diretrizes obrigatórias:
1. Responda em português com muito carinho, acolhimento e emojis delicados (🌸, 👶, ✨).
2. Explique de forma simples e direta o que é esperado para a ${weeks}ª semana de gestação.
3. NUNCA prescreva remédios nem altere dosagens.
4. Em caso de sangramento, perda de líquido, dor intensa ou ausência de movimentos do bebê, oriente atendimento médico de urgência com firmeza e carinho.`;

  const payload = {
    contents: [
      {
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
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } else {
      const errorJson = await response.json().catch(() => null);
      console.error("Status de erro da API Gemini:", response.status, errorJson);
    }
  } catch (error) {
    console.error("Erro de conexão no chat:", error);
  }

  return "🌸 Desculpe, mamãe! Tive uma oscilação temporária de conexão. Qualquer dúvida urgente sobre sua gestação, fale com a Dra. Priscila!";
};
