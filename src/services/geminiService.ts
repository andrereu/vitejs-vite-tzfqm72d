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
    console.error("VITE_GEMINI_API_KEY não foi encontrada nas variáveis de ambiente.");
    return {
      resumoIA: "Laudo anexado com sucesso. (Configure a chave VITE_GEMINI_API_KEY na Vercel para ativar a extração por IA).",
      notaDra: `Arquivo recebido (${examName || examCategory}). Aguardando validação médica.`,
      examesExtraidos: {}
    };
  }

  // Limpeza estrita da string Base64 e MIME type
  let cleanBase64 = base64Content;
  let finalMime = mimeType || "application/pdf";

  if (base64Content.includes(';base64,')) {
    const parts = base64Content.split(';base64,');
    finalMime = parts[0].replace('data:', '') || finalMime;
    cleanBase64 = parts[1];
  }
  cleanBase64 = cleanBase64.replace(/\s/g, '');

  const prompt = `Você é um médico obstetra especialista analisando este documento médico (${examCategory}: ${examName}).

Tarefa:
1. Leia todos os resultados de exames de sangue, sorologias, urina ou ecografia contidos no arquivo.
2. Escreva um resumo acolhedor e simples para a mãe gestante ("resumoIA").
3. Escreva um resumo técnico objetivo para a médica obstetra ("notaDra").
4. Extraia os valores encontrados para cada um destes exames (deixe em branco/omita os que não existirem no laudo):
   - hbVg (Ex: "12.4 g/dL / 37%")
   - plaquetas (Ex: "220.000 /mm³")
   - glicemiaTotg (Ex: "82 mg/dL")
   - htlv (Ex: "Não Reagente")
   - hiv (Ex: "Não Reagente")
   - sifilis (Ex: "Não Reagente (VDRL)")
   - hbsag (Ex: "Não Reagente")
   - tsh (Ex: "1.95 mIU/L")
   - antiHcv (Ex: "Não Reagente")
   - rubeola (Ex: "IgG Reagente / IgM Não Reagente")
   - cmv (Ex: "IgG+ / IgM-")
   - toxo (Ex: "IgG+ / IgM-")
   - vitD (Ex: "32 ng/mL")
   - ferritina (Ex: "45 ng/mL")
   - vitB12 (Ex: "390 pg/mL")
   - urinaUrocultura (Ex: "Normal / Cultura Negativa")
   - gbs (Ex: "Negativo")

Retorne EXCLUSIVAMENTE um objeto JSON válido com este formato:
{
  "resumoIA": "texto explicativo para a gestante",
  "notaDra": "texto técnico para o prontuário",
  "examesExtraidos": {
    "hbVg": "valor",
    "plaquetas": "valor",
    "glicemiaTotg": "valor",
    "tsh": "valor",
    "urinaUrocultura": "valor"
  }
}`;

  // Lista de modelos suportados para fallback automático
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
                      mimeType: finalMime.includes('pdf') ? 'application/pdf' : finalMime,
                      data: cleanBase64
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1
            }
          })
        }
      );

      if (!response.ok) {
        const errorDetails = await response.text();
        console.warn(`Tentativa com ${model} retornou status ${response.status}:`, errorDetails);
        continue; // Tenta o próximo modelo
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      // Limpeza de blocos de código Markdown
      const jsonText = rawText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsed: ExamIAResponse = JSON.parse(jsonText);

      return {
        resumoIA: parsed.resumoIA || "Exame analisado com sucesso pela inteligência artificial.",
        notaDra: parsed.notaDra || "Exame conferido e registrado no prontuário.",
        examesExtraidos: parsed.examesExtraidos || {}
      };
    } catch (modelError) {
      console.warn(`Erro no modelo ${model}:`, modelError);
    }
  }

  // Fallback caso todas as tentativas falhem
  return {
    resumoIA: "Documento anexado à carteirinha. Não foi possível interpretar automaticamente os dados deste arquivo no momento.",
    notaDra: `Arquivo anexado: ${examName || examCategory}. Favor conferir o laudo manualmente.`,
    examesExtraidos: {}
  };
}
