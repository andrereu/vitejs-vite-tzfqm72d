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

  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY ||
    (window as any).__GEMINI_API_KEY__ ||
    "";

  if (!apiKey) {
    throw new Error(
      "A variável de ambiente VITE_GEMINI_API_KEY não foi encontrada."
    );
  }

  // Remove prefixo data:application/pdf;base64,...
  let cleanBase64 = base64Content;

  if (cleanBase64.includes(",")) {
    cleanBase64 = cleanBase64.split(",")[1];
  }

  cleanBase64 = cleanBase64.replace(/[\r\n\s]/g, "");

  const prompt = `
Você é um assistente especializado em análise de exames obstétricos
integrado ao software MaternaIA.

Analise cuidadosamente o laudo anexado.

Categoria do exame: ${examCategory}
Nome do exame: ${examName}

OBJETIVOS:

1. resumoIA
Explique os resultados para a gestante em linguagem simples, acolhedora
e sem alarmismo.

2. notaDra
Produza um resumo técnico objetivo para o prontuário obstétrico.

3. examesExtraidos
Extraia SOMENTE os valores efetivamente encontrados no documento.

Campos possíveis:

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

REGRAS IMPORTANTES:

- Não invente valores.
- Não preencha um campo se ele não estiver presente no exame.
- Preserve unidades.
- Preserve "Reagente", "Não Reagente", "Positivo",
  "Negativo", "Indeterminado" etc.
- Se houver dois valores para um mesmo exame, mantenha ambos.
- Leia também tabelas e imagens presentes no PDF.
- Não faça diagnóstico definitivo.
- Não altere os valores encontrados no documento.

Retorne SOMENTE JSON válido:

{
  "resumoIA": "...",
  "notaDra": "...",
  "examesExtraidos": {
    "hbVg": "...",
    "plaquetas": "...",
    "glicemiaTotg": "...",
    "tsh": "..."
  }
}
`;

  const modelName = "gemini-3.6-flash";

  try {

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                },
                {
                  inlineData: {
                    mimeType: mimeType || "application/pdf",
                    data: cleanBase64
                  }
                }
              ]
            }
          ],

          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {

      const errorText = await response.text();

      console.error("Erro Gemini:", {
        status: response.status,
        model: modelName,
        error: errorText
      });

      throw new Error(
        `Gemini API retornou ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();

    const rawText =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.error("Resposta inesperada do Gemini:", data);

      throw new Error(
        "O Gemini não retornou conteúdo válido."
      );
    }

    const parsed: ExamIAResponse = JSON.parse(rawText);

    return {
      resumoIA:
        parsed.resumoIA ||
        "Exame analisado com sucesso.",

      notaDra:
        parsed.notaDra ||
        "Resultados conferidos.",

      examesExtraidos:
        parsed.examesExtraidos || {}
    };

  } catch (error: any) {

    console.error("Erro ao processar exame com Gemini:", error);

    throw new Error(
      error?.message ||
      "Não foi possível processar o exame."
    );
  }
}
