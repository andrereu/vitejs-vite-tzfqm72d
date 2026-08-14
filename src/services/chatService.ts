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
    return "❌ Erro: VITE_GEMINI_API_KEY não encontrada nas variáveis da Vercel.";
  }

  const promptText = `Você é a Assistente Virtual Pré-Natal da Dra. Priscila Gapski (CRM 24734).
Informações da gestante:
- Nome: ${patient.nome}
- Idade Gestacional: ${weeks} semanas
- Nome do Bebê: ${patient.nomeBebe || 'Bebê'}

Dúvida da gestante: "${userMessage}"

Diretrizes:
- Responda em português com carinho, acolhimento e emojis delicados (🌸, 👶, ✨).
- Dê orientações seguras sobre sintomas comuns para ${weeks} semanas.
- NUNCA prescreva medicamentos. Se houver sangramento, dor intensa ou perda de líquido, oriente atendimento de urgência.`;

  const payload = {
    contents: [
      {
        parts: [{ text: promptText }]
      }
    ]
  };

  try {
    // 1. Descobre dinamicamente os modelos disponíveis para esta chave
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const listData = await listRes.json();

    if (!listRes.ok) {
      return `❌ Erro ao consultar modelos (${listRes.status}): ${listData?.error?.message || JSON.stringify(listData)}`;
    }

    // Filtra apenas modelos que suportam geração de conteúdo
    const availableModels: string[] = (listData.models || [])
      .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m: any) => m.name); // Ex: "models/gemini-pro", "models/gemini-1.5-pro", etc.

    if (availableModels.length === 0) {
      return `❌ Nenhum modelo de geração ativo encontrado para esta chave. Modelos retornados: ${JSON.stringify(listData.models?.map((m: any) => m.name))}`;
    }

    // Prioriza flash ou pro, senão pega o primeiro disponível
    const selectedModel =
      availableModels.find(m => m.includes("flash")) ||
      availableModels.find(m => m.includes("gemini")) ||
      availableModels[0];

    // 2. Executa a requisição no modelo descoberto
    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/${selectedModel}:generateContent?key=${apiKey}`;

    const genRes = await fetch(generateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const genData = await genRes.json();

    if (genRes.ok) {
      return genData.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui obter a resposta agora.";
    } else {
      return `❌ Erro ao gerar com ${selectedModel} (${genRes.status}): ${genData?.error?.message || JSON.stringify(genData)}`;
    }
  } catch (err: any) {
    return `❌ Erro na requisição: ${err?.message || err}`;
  }
};
