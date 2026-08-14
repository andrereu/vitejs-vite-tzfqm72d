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

  const promptText = `Você é a Assistente Virtual Pré-Natal da Dra. Priscila Gapski (CRM 24734).
Informações da gestante:
- Nome: ${patient.nome}
- Gestação: ${weeks} semanas
- Nome do Bebê: ${patient.nomeBebe || 'Bebê'}

Dúvida da gestante: "${userMessage}"

Diretrizes obrigatórias:
- Responda em português com muito carinho, acolhimento e emojis delicados (🌸, 👶, ✨).
- Dê orientações práticas e seguras para a gestação na ${weeks}ª semana.
- NUNCA prescreva medicamentos nem altere condutas médicas.
- Em caso de sangramentos, perda de líquido, dor intensa ou ausência de movimentos fetais, oriente atendimento médico de urgência com calma e firmeza.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gemini-3.5-flash",
        input: promptText
      })
    });

    if (response.ok) {
      const data = await response.json();

      // 1. Extração da nova Interactions API (steps -> model_output)
      const modelOutputStep = data.steps?.find((s: any) => s.type === "model_output");
      const textFromSteps = modelOutputStep?.content?.find((c: any) => c.type === "text")?.text;

      if (textFromSteps) return textFromSteps;

      // 2. Extrações de fallback para compatibilidade
      const directText =
        data.output?.text ||
        data.output ||
        data.text ||
        data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (directText && typeof directText === "string") return directText;
    }
  } catch (error) {
    console.error("Erro ao processar resposta do chat:", error);
  }

  return "🌸 Desculpe, mamãe! Tive uma oscilação temporária de conexão. Qualquer dúvida urgente sobre sua gestação, fale com a Dra. Priscila!";
};
