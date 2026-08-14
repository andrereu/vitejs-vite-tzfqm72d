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
    return "❌ Erro: VITE_GEMINI_API_KEY não encontrada na Vercel.";
  }

  const promptText = `Você é a Assistente Virtual Pré-Natal integrada à carteirinha digital da Dra. Priscila Gapski (CRM 24734).
Informações da gestante:
- Nome: ${patient.nome}
- Idade Gestacional: ${weeks} semanas
- Bebê: ${patient.nomeBebe || 'Bebê'}

Dúvida da gestante: "${userMessage}"

Diretrizes:
- Responda em português com carinho, acolhimento e emojis delicados (🌸, 👶, ✨).
- Explique de forma simples os sintomas e cuidados para ${weeks} semanas.
- NUNCA prescreva remédios. Se houver sangramentos, perda de líquido ou dor forte, recomende atendimento médico de urgência.`;

  const payload = {
    contents: [
      {
        parts: [{ text: promptText }]
      }
    ]
  };

  // Lista de modelos suportados em ordem de preferência
  const modelsToTry = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.5-flash"
  ];

  let lastError = "";

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else {
        lastError = `[Modelo ${model} - Status ${response.status}]: ${data?.error?.message || JSON.stringify(data)}`;
        console.warn(`Tentativa com ${model} falhou:`, lastError);
      }
    } catch (err: any) {
      lastError = `[Fetch Erro]: ${err?.message || err}`;
    }
  }

  // Se todos os modelos falharem, exibe o diagnóstico real na tela
  return `❌ Não foi possível conectar com a IA:\n${lastError}`;
};
