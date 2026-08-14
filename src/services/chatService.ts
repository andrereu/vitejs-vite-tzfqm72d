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
Informações da gestante:
- Nome: ${patient.nome}
- Gestação: ${weeks} semanas
- Nome do Bebê: ${patient.nomeBebe || 'Bebê'}

Dúvida da gestante: "${userMessage}"

Diretrizes:
- Responda em português com muito carinho, acolhimento e emojis delicados (🌸, 👶, ✨).
- Dê orientações práticas e seguras para a gestação na ${weeks}ª semana.
- NUNCA prescreva medicamentos. Em caso de sangramentos, dor intensa ou perda de líquido, oriente atendimento de urgência com calma e firmeza.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;

  // Modelos para a Interactions API
  const candidateModels = [
    "gemini-3.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash"
  ];

  const errorLogs: string[] = [];

  for (const modelName of candidateModels) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelName,
          input: promptText
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Tenta capturar a resposta em diferentes formatos possíveis
        const reply =
          data.output?.text ||
          data.output ||
          (Array.isArray(data.outputs) ? data.outputs.map((o: any) => o.text || o.content || JSON.stringify(o)).join("\n") : null) ||
          data.text ||
          data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (reply && typeof reply === "string") return reply;
        if (typeof reply === "object") return JSON.stringify(reply);
        return JSON.stringify(data);
      } else {
        errorLogs.push(`[${modelName}]: ${response.status} - ${data?.error?.message || JSON.stringify(data)}`);
      }
    } catch (err: any) {
      errorLogs.push(`[${modelName} Fetch]: ${err?.message || err}`);
    }
  }

  // Se nenhum responder com sucesso, exibe o diagnóstico real
  return `❌ Falha ao conectar. Detalhes:\n${errorLogs.join("\n\n")}`;
};
