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
- Responda em português de forma extremamente carinhosa, empática e acolhedora com emojis delicados (🌸, 👶, ✨).
- Explique de forma simples e didática o que é comum e esperado para ${weeks} semanas.
- NUNCA prescreva medicamentos. Em caso de sangramentos, perda de líquido, dores fortes ou ausência de movimentos fetais, recomende buscar atendimento médico de urgência com calma e firmeza.`;

  // Novo endpoint da Interactions API
  const url = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;

  const payload = {
    input: userMessage,
    system_instruction: systemInstruction,
    generation_config: {
      temperature: 0.7
    }
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
      // Extrai a resposta gerada pela nova Interactions API
      const reply = data.output || data.text || data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return reply;
      return JSON.stringify(data);
    } else {
      return `❌ Erro da API (${response.status}): ${data?.error?.message || JSON.stringify(data)}`;
    }
  } catch (error: any) {
    return `❌ Erro de conexão: ${error?.message || error}`;
  }
};
