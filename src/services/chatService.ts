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

  const promptText = `Você é a Assistente Virtual Pré-Natal da Dra. Priscila Gapski (CRM 24734).
Gestante: ${patient.nome}, 30 semanas de gestação do bebê ${patient.nomeBebe || 'Bebê'}.

Dúvida da gestante: "${userMessage}"

Diretrizes:
- Responda em português com muito carinho, acolhimento e emojis delicados (🌸, 👶, ✨).
- Dê orientações práticas e seguras para a gestação.
- NUNCA prescreva remédios nem altere condutas médicas.
- Em caso de sangramentos, perda de líquido, dores fortes ou ausência de movimentos fetais, oriente atendimento médico de urgência com calma e firmeza.`;

  // Endpoint oficial da nova Interactions API
  const url = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;

  const payload = {
    model: "gemini-2.5-flash",
    input: promptText
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      // Extrai a resposta gerada da Interactions API
      const reply =
        data.output?.text ||
        data.output ||
        (Array.isArray(data.outputs) ? data.outputs.map((o: any) => o.text || o.content).join("\n") : null) ||
        data.text ||
        data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (reply && typeof reply === 'string') return reply;
      if (typeof reply === 'object') return JSON.stringify(reply);
      return JSON.stringify(data);
    } else {
      return `❌ Erro da API (${response.status}): ${data?.error?.message || JSON.stringify(data)}`;
    }
  } catch (error: any) {
    return `❌ Erro de requisição: ${error?.message || error}`;
  }
};
