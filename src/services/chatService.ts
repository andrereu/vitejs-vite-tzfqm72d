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
    return "❌ Erro: VITE_GEMINI_API_KEY não foi encontrada nas variáveis de ambiente da Vercel.";
  }

  // Modelo oficial universal ativo
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const promptText = `Você é a Assistente Virtual Pré-Natal da Dra. Priscila Gapski (CRM 24734).
Informações da gestante:
- Nome: ${patient.nome}
- Idade Gestacional: ${weeks} semanas
- Nome do Bebê: ${patient.nomeBebe || 'Bebê'}

Dúvida da gestante: "${userMessage}"

Diretrizes:
- Responda em português com muito carinho, acolhimento e emojis delicados (🌸, 👶, ✨).
- Explique de forma simples o que é esperado para a ${weeks}ª semana de gestação.
- NUNCA prescreva remédios. Se houver dores fortes, sangramento ou perda de líquido, oriente com firmeza e calma a buscar atendimento de urgência.`;

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
