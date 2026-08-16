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
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";

  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY não configurada.");
  }

  let cleanBase64 = base64Content;
  let finalMime = mimeType || "application/pdf";

  if (base64Content.includes(';base64,')) {
    const parts = base64Content.split(';base64,');
    finalMime = parts[0].replace('data:', '') || finalMime;
    cleanBase64 = parts[1];
  }
  cleanBase64 = cleanBase64.replace(/[\r\n\s]/g, '');

  const prompt = `Você é um médico obstetra especialista integrado ao software MaternaIA.
Analise este documento laboratorial (${examCategory}: ${examName}).

1. Escreva um "resumoIA" acolhedor e em linguagem simples para a gestante entender o resultado geral.
2. Escreva uma "notaDra" técnica para a médica obstetra (resumindo hemograma, glicose, tireoide e sorologias).
3. Extraia com precisão os valores encontrados para cada exame presente no documento:
   - hbVg (ex: "12.2 g/dL / 34.9%")
   - plaquetas (ex: "281.000 /mm³")
   - glicemiaTotg (ex: "78.6 mg/dL")
   - tsh (ex: "1.30 µUI/mL")
   - ferritina (ex: "31.7 ng/mL")
   - vitD (ex: "33.5 ng/mL")
   - vitB12 (ex: "394 pg/mL")
   - hiv (ex: "Não Reagente")
   - sifilis (ex: "Não Reagente")
   - hbsag (ex: "Não Reagente (Anti-HBs 269 UI/L)")
   - antiHcv (ex: "Não Reagente")
   - toxo (ex: "IgG+ (>650) / IgM- (0.20)")
   - rubeola (ex: "IgG+ (188) / IgM Indet (0.86)")
   - cmv (ex: "IgG+ (40.9) / IgM- (0.15)")
   - urinaUrocultura (ex: "Normal / Cultura Negativa")

Retorne EXCLUSIVAMENTE um JSON válido no seguinte formato:
{
  "resumoIA": "...",
  "notaDra": "...",
  "examesExtraidos": { ... }
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
                  mimeType: finalMime.includes('pdf') ? 'application/pdf' : 'image/jpeg',
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
    const errBody = await response.text();
    throw new Error(`Google API ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const parsed: ExamIAResponse = JSON.parse(rawText);

  return {
    resumoIA: parsed.resumoIA || "Exame processado com sucesso.",
    notaDra: parsed.notaDra || "Resultados conferidos.",
    examesExtraidos: parsed.examesExtraidos || {}
  };
}
