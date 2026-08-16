interface ExamIAResponse {
  resumoIA: string;
  notaDra: string;
  examesExtraidos?: Record<string, string>;
}

export async function processExamWithGeminiIA(
  base64Content: string,
  mimeType: string,
  examCategory: string,
  examName: string
): Promise<ExamIAResponse> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (window as any).__GEMINI_API_KEY__ || "";

  if (!apiKey) {
    console.warn("Chave VITE_GEMINI_API_KEY não configurada.");
    return {
      resumoIA: "Laudo anexado com sucesso. (Configure a chave VITE_GEMINI_API_KEY na Vercel para ativar o resumo automático por IA).",
      notaDra: `Arquivo recebido (${examName || examCategory}). Aguardando validação médica.`,
      examesExtraidos: {}
    };
  }

  // Remove qualquer prefixo data:*/*;base64, caso venha junto
  const cleanBase64 = base64Content.includes('base64,')
    ? base64Content.split('base64,')[1]
    : base64Content;

  const prompt = `Você é um assistente médico especialista em Obstetrícia e Medicina Fetal integrado à plataforma MaternaIA.
Analise este arquivo anexado (${examCategory}: ${examName}).

Identifique se é uma Ecografia/Ultrassom ou Exame de Sangue/Urina e retorne OBRIGATORIAMENTE um JSON com esta estrutura exata:

{
  "resumoIA": "Texto humanizado e acolhedor explicando para a mãe em termos simples o que foi encontrado de forma clara e reconfortante.",
  "notaDra": "Resumo técnico objetivo com termos médicos para a médica obstetra (ex: peso estimado, percentil, ILA, valores laboratoriais alterados ou normais).",
  "examesExtraidos": {
    "hbVg": "valor se presente no laudo, senão omitir",
    "plaquetas": "valor se presente",
    "glicemiaTotg": "valor se presente",
    "htlv": "valor se presente",
    "hiv": "valor se presente",
    "sifilis": "valor se presente",
    "hbsag": "valor se presente",
    "tsh": "valor se presente",
    "antiHcv": "valor se presente",
    "rubeola": "valor se presente",
    "cmv": "valor se presente",
    "toxo": "valor se presente",
    "vitD": "valor se presente",
    "ferritina": "valor se presente",
    "vitB12": "valor se presente",
    "urinaUrocultura": "valor se presente",
    "gbs": "valor se presente"
  }
}

Importante: Responda SOMENTE o JSON puro, sem textos adicionais e sem blocos markdown.`;

  try {
    const response = await fetch(
      `[https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$](https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$){apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mimeType.includes('pdf') ? 'application/pdf' : mimeType,
                    data: cleanBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro na API do Gemini:", errorText);
      throw new Error(`API Gemini respondeu com status ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // Remove eventuais tags ```json ... ``` se o modelo retornar
    const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed: ExamIAResponse = JSON.parse(cleanedText);

    return {
      resumoIA: parsed.resumoIA || "Exame analisado com sucesso.",
      notaDra: parsed.notaDra || "Exame registrado no prontuário.",
      examesExtraidos: parsed.examesExtraidos || {}
    };
  } catch (err) {
    console.error("Falha ao analisar exame com Gemini:", err);
    return {
      resumoIA: "Documento anexado à carteirinha da paciente. A análise automática por IA não pôde interpretar todos os campos.",
      notaDra: `Arquivo anexado: ${examName || examCategory}. Verificar laudo original.`,
      examesExtraidos: {}
    };
  }
}
