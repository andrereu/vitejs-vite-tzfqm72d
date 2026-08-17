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
    throw new Error("A variável de ambiente VITE_GEMINI_API_KEY não foi encontrada.");
  }

  // Extrai apenas a string Base64 pura
  let cleanBase64 = base64Content;
  if (cleanBase64.includes(',')) {
    cleanBase64 = cleanBase64.split(',')[1];
  }
  cleanBase64 = cleanBase64.replace(/[\r\n\s]/g, '');

  const prompt = `Você é um médico obstetra especialista integrado ao software MaternaIA.
Analise este laudo laboratorial anexado (${examCategory}: ${examName}).

1. "resumoIA": Explicação em tom acolhedor e linguagem simples para a mãe gestante sobre os resultados do laudo.
2. "notaDra": Resumo técnico para o prontuário obstétrico (hemograma, glicose, TSH, sorologias, vitaminas).
3. "examesExtraidos": Extraia com precisão os valores numéricos e resultados encontrados para cada item existente:
   - hbVg
   - plaquetas
   - glicemiaTotg
   - tsh
   - ferritina
   - vitD
   - vitB12
   - hiv
   - sifilis
   - hbsag
   - antiHcv
   - toxo
   - rubeola
   - cmv
   - urinaUrocultura
   - gbs

Retorne ESTRITAMENTE um objeto JSON válido no seguinte formato:
{
  "resumoIA": "texto explicativo para a gestante",
  "notaDra": "texto técnico para o prontuário",
  "examesExtraidos": {
    "hbVg": "12.2 g/dL / 34.9%",
    "plaquetas": "281.000 /mm³",
    "glicemiaTotg": "78.6 mg/dL",
    "tsh": "1.30 µUI/mL",
    "ferritina": "31.7 ng/mL",
    "vitD": "33.5 ng/mL",
    "vitB12": "394 pg/mL",
    "hiv": "Não Reagente",
    "sifilis": "Não Reagente",
    "hbsag": "Não Reagente",
    "antiHcv": "Não Reagente",
    "toxo": "IgG Reagente / IgM Não Reagente",
    "rubeola": "IgG Reagente / IgM Indeterminado",
    "cmv": "IgG Reagente / IgM Não Reagente",
    "urinaUrocultura": "Normal / Ausência de crescimento bacteriano"
  }
}`;

  // Lista ordenada de modelos oficiais para tentar em sequência
  const priorityModels = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro-latest'
  ];

  let lastError = '';

  for (const modelName of priorityModels) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
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
                      mimeType: mimeType.includes('pdf') ? 'application/pdf' : 'image/jpeg',
                      data: cleanBase64
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json"
            }
          })
        }
      );

      if (!response.ok) {
        lastError = await response.text();
        console.warn(`Modelo ${modelName} falhou (${response.status}), tentando próximo...`);
        continue;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed: ExamIAResponse = JSON.parse(cleanedText);

      return {
        resumoIA: parsed.resumoIA || "Exame analisado com sucesso.",
        notaDra: parsed.notaDra || "Resultados conferidos.",
        examesExtraidos: parsed.examesExtraidos || {}
      };
    } catch (err: any) {
      lastError = err.message || JSON.stringify(err);
    }
  }

  throw new Error(`Nenhum modelo respondeu com sucesso. Detalhes: ${lastError}`);
}
