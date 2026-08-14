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
    return "❌ Erro: Chave VITE_GEMINI_API_KEY não encontrada nas variáveis de ambiente da Vercel.";
  }

  const promptText = `Você é a Assistente Virtual Pré-Natal da Dra. Priscila Gapski (CRM 24734).
Informações da paciente:
- Nome: ${patient.nome}
- Gestação: ${weeks} semanas
- Nome do Bebê: ${patient.nomeBebe || 'Bebê'}

Dúvida da gestante: "${userMessage}"

Diretrizes de resposta:
1. Responda em português com muito carinho, acolhimento e emojis delicados (🌸, 👶, ✨).
2. Explique de forma simples e didática o que é esperado para a fase de ${weeks} semanas.
3. NUNCA prescreva medicamentos. Se houver sangramentos, dor forte ou perda de líquido, oriente atendimento médico de urgência com calma e firmeza.`;

  // Endpoint oficial da Interactions API com chave na URL
  const url = `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`;

  const payload = {
    model: "models/gemini-2.5-flash",
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
      // Extração resiliente do texto da Interactions API
      const textOutput =
        data.output?.text ||
        data.output ||
        (Array.isArray(data.outputs) ? data.outputs.map((o: any) => o.text || o.content || JSON.stringify(o)).join("\n") : null) ||
        data.text ||
        data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (textOutput && typeof textOutput === "string") return textOutput;
      if (typeof textOutput === "object") return JSON.stringify(textOutput);
      return JSON.stringify(data);
    } else {
      return `❌ [v-interactions] Erro da API (${response.status}): ${data?.error?.message || JSON.stringify(data)}`;
    }
  } catch (error: any) {
    return `❌ [v-interactions] Erro de rede: ${error?.message || error}`;
  }
};
