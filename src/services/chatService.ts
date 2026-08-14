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

  // Modelo oficial estável ativo
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  const promptText = `Você é a Assistente Virtual Pré-Natal da Dra. Priscila Gapski (CRM 24734).
Informações da gestante:
- Nome: ${patient.nome}
- Idade Gestacional: ${weeks} semanas
- Nome do Bebê: ${patient.nomeBebe || 'Bebê'}

Dúvida da gestante: "${userMessage}"

Diretrizes:
- Responda em português com carinho, empatia e emojis delicados (🌸, 👶, ✨).
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
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, mamãe, não consegui processar a resposta agora. Pode repetir?";
    } else {
      const errData = await response.json().catch(() => null);
      console.error("Erro da API Gemini:", response.status, errData);
      return "🌸 Desculpe, mamãe! Tive uma oscilação temporária de conexão. Qualquer dúvida urgente, fale com a Dra. Priscila!";
    }
  } catch (error) {
    console.error("Erro de requisição fetch:", error);
    return "🌸 Desculpe, mamãe! Tive uma oscilação temporária de conexão. Qualquer dúvida urgente, fale com a Dra. Priscila!";
  }
};
