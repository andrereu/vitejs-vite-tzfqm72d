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
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  const systemInstruction = `Você é a "Assistente Virtual Pré-Natal" integrada à carteirinha digital da gestante acompanhada pela Dra. Priscila Gapski (CRM 24734).
Informações da paciente:
- Nome: ${patient.nome}
- Nome do Bebê: ${patient.nomeBebe || 'Bebê'}
- Idade Gestacional Atual: ${weeks} semanas
- Tipo Sanguíneo: ${patient.tipoSanguineo || 'Não informado'}
- Alergias/Doenças: ${patient.doencasPrevias || 'Nenhuma'}

Diretrizes obrigatórias de resposta:
1. Tom extremamente carinhoso, empático, seguro e acolhedor (use emojis delicados como 🌸, 👶, ✨).
2. Explique sintomas comuns para a idade gestacional exata (${weeks} semanas), alimentação segura, bem-estar e cuidados.
3. NUNCA prescreva medicamentos controlados ou altere condutas médicas.
4. Em caso de sangramentos, perda de líquido, dores fortes, febre ou ausência de movimentos fetais, oriente com firmeza e calma a buscar atendimento de urgência ou contatar a Dra. Priscila imediatamente.
5. Mantenha respostas sucintas, didáticas e formatadas em tópicos quando apropriado.`;

  const previousContents = chatHistory.slice(-6).map((msg) => ({
    role: msg.sender === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));

  const payload = {
    contents: [
      ...previousContents,
      {
        role: "user",
        parts: [{ text: userMessage }]
      }
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, mamãe, não consegui processar a resposta agora. Pode repetir?";
    }
  } catch (error) {
    console.error("Erro no chat IA:", error);
  }

  return "🌸 Desculpe, mamãe! Tive uma oscilação temporária de conexão. Qualquer dúvida urgente sobre sua gestação, fale com a Dra. Priscila!";
};
