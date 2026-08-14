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
Paciente: ${patient.nome}, Gestação: ${weeks} semanas, Bebê: ${patient.nomeBebe || 'Bebê'}.
Dúvida da gestante: "${userMessage}"

Diretrizes:
- Responda em português com carinho, acolhimento e emojis delicados (🌸, 👶, ✨).
- Explique de forma simples os sintomas e cuidados para ${weeks} semanas.
- NUNCA prescreva remédios. Se houver dores fortes, perda de líquido ou sangramento, recomende ir ao pronto-atendimento com urgência.`;

  // Endpoint oficial Interactions API
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
      // Extrai o retorno da Interactions API
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
    return `❌ Erro de conexão: ${error?.message || error}`;
  }
};
