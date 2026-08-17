import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mesma ideia de api/analyze-exam.ts: essa chamada ao Gemini roda no servidor,
// com a chave guardada em GEMINI_API_KEY (variável de ambiente da Vercel),
// para o chat de IA da paciente não expor a chave no navegador.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });
  }

  const { userMessage, patientNome, patientNomeBebe, weeks } = req.body || {};
  if (!userMessage) {
    return res.status(400).json({ error: 'Mensagem não informada.' });
  }

  const promptText = `Você é a Assistente Virtual Pré-Natal da Dra. Priscila Gapski (CRM 24734).
Informações da gestante:
- Nome: ${patientNome || 'Gestante'}
- Gestação: ${weeks ?? 0} semanas
- Nome do Bebê: ${patientNomeBebe || 'Bebê'}

Dúvida da gestante: "${userMessage}"

Diretrizes obrigatórias:
- Responda em português com muito carinho, acolhimento e emojis delicados (🌸, 👶, ✨).
- Dê orientações práticas e seguras para a gestação na ${weeks ?? 0}ª semana.
- NUNCA prescreva medicamentos nem altere condutas médicas.
- Em caso de sangramentos, perda de líquido, dor intensa ou ausência de movimentos fetais, oriente atendimento médico de urgência com calma e firmeza.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/interactions?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gemini-3.5-flash', input: promptText })
      }
    );

    if (response.ok) {
      const data = await response.json();

      const modelOutputStep = data.steps?.find((s: any) => s.type === 'model_output');
      const textFromSteps = modelOutputStep?.content?.find((c: any) => c.type === 'text')?.text;
      if (textFromSteps) return res.status(200).json({ reply: textFromSteps });

      const directText =
        data.output?.text || data.output || data.text || data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (directText && typeof directText === 'string') return res.status(200).json({ reply: directText });
    }

    console.error('Resposta inesperada do Gemini (chat):', await response.text());
    return res.status(502).json({ error: 'O Gemini não retornou uma resposta válida.' });
  } catch (error: any) {
    console.error('Erro ao processar chat com Gemini:', error);
    return res.status(500).json({ error: error?.message || 'Falha ao falar com a IA.' });
  }
}
