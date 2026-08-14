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
    return "🌸 Mamãe, o serviço de IA está sendo inicializado. Qualquer dúvida urgente, fale com a Dra. Priscila!";
  }

  const promptText = `Você é a Assistente Virtual Pré-Natal integrada à carteirinha digital da Dra. Priscila Gapski (CRM 24734).
Informações da gestante:
- Nome: ${patient.nome}
- Idade Gestacional: ${weeks} semanas
- Nome do Bebê: ${patient.nomeBebe || 'Bebê'}

Dúvida da gestante: "${userMessage}"

Diretrizes obrigatórias:
- Responda em português com muito carinho, acolhimento e emojis delicados (🌸, 👶, ✨).
- Dê orientações práticas e seguras para a gestação na ${weeks}ª semana.
- NUNCA prescreva remédios nem altere condutas médicas.
- Em caso de sangramentos, perda de líquido, dor intensa ou ausência de movimentos fetais, oriente atendimento médico de urgência com calma e firmeza.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;

  // Modelos suportados pela Interactions API
  const candidateModels = [
    "gemini-3.5-flash",
    "gemini-3-flash",
    "gemini-2.5-flash"
  ];

  for (const modelName of candidateModels) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          model: modelName,
          input: promptText
        })
      });

      if (response.ok) {
        const data = await response.json();
        const reply =
          data.output?.text ||
          data.output ||
          (Array.isArray(data.outputs) ? data.outputs.map((o: any) => o.text || o.content || JSON.stringify(o)).join("\n") : null) ||
          data.text ||
          data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (reply && typeof reply === "string") return reply;
        if (typeof reply === "object") return JSON.stringify(reply);
      }
    } catch (err) {
      console.warn(`Tentativa com ${modelName} falhou:`, err);
    }
  }

  return "🌸 Desculpe, mamãe! Tive uma oscilação temporária de conexão. Qualquer dúvida urgente sobre sua gestação, fale com a Dra. Priscila!";
};
