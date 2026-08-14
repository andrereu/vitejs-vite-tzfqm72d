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

  // Usando endpoint v1 estável oficial do Google
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const promptText = `Você é a Assistente Virtual Pré-Natal da Dra. Priscila Gapski (CRM 24734).
Informações da gestante:
- Nome: ${patient.nome}
- Idade Gestacional: ${weeks} semanas
- Nome do Bebê: ${patient.nomeBebe || 'Bebê'}

Dúvida da gestante: "${userMessage}"

Diretrizes:
- Responda em português com carinho, acolhimento e emojis delicados (🌸, 👶, ✨).
- Explique de forma simples e acolhedora os sintomas comuns para ${weeks} semanas de gestação.
- NUNCA prescreva medicamentos. Em caso de dores fortes, sangramentos ou perda de líquido, oriente a procurar atendimento médico de urgência com calma e firmeza.`;

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, mamãe, não consegui processar a resposta agora.";
    } else {
      return `❌ Erro da API (${response.status}): ${data?.error?.message || JSON.stringify(data)}`;
    }
  } catch (error: any) {
    return `❌ Erro de conexão: ${error?.message || error}`;
  }
};
