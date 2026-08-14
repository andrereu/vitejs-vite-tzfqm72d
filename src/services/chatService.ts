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
    return "❌ Erro: VITE_GEMINI_API_KEY não foi configurada na Vercel.";
  }

  const systemInstruction = `Você é a Assistente Virtual Pré-Natal da Dra. Priscila Gapski (CRM 24734).
Informações da gestante:
- Nome: ${patient.nome}
- Idade Gestacional: ${weeks} semanas
- Nome do Bebê: ${patient.nomeBebe || 'Bebê'}

Diretrizes de atendimento:
- Responda em português com muito carinho, empatia e acolhimento usando emojis delicados (🌸, 👶, ✨).
- Explique de forma simples o que é esperado e dicas seguras para ${weeks} semanas.
- NUNCA prescreva medicamentos. Em caso de sangramentos, perda de líquido ou dor forte, recomende atendimento médico de urgência com firmeza e calma.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;

  const payload = {
    model: "gemini-2.5-flash",
    input: userMessage,
    system_instruction: systemInstruction
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

    const data = await response.json();

    if (response.ok) {
      // Extrai o texto de resposta retornado pela Interactions API
      const reply =
        data.output?.text ||
        data.output ||
        data.text ||
        data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (reply && typeof reply === 'string') return reply;
      if (typeof reply === 'object') return JSON.stringify(reply);
      return JSON.stringify(data);
    } else {
      return `❌ Erro da API (${response.status}): ${data?.error?.message || JSON.stringify(data)}`;
    }
  } catch (error: any) {
    return `❌ Erro de conexão: ${error?.message || error}`;
  }
};
