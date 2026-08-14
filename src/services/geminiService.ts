export const processExamWithGeminiIA = async (
  base64Content: string, 
  mimeType: string, 
  category: string, 
  title: string
) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  const cleanBase64 = base64Content.replace(/^data:(image\/[a-zA-Z0-9]+|application\/pdf);base64,/, '');

  const promptText = `Você é um assistente pré-natal e obstétrico especialista integrado ao aplicativo da Dra. Priscila Gapski (CRM 24734).
Analise a imagem deste laudo/exame obstétrico ou laboratorial (Título fornecido: "${title}", Categoria estimada: "${category}").

Instruções de Resposta:
1. "resumoIA": Escreva um texto carinhoso, empático, acolhedor e didático em português direcionado para a MÃE GESTANTE. Explique os achados sem causar pânico, com tom tranquilizador de acompanhamento do pré-natal.
2. "notaDra": Escreva uma anotação clínica técnica, objetiva e sucinta para a Dra. Priscila incluir no prontuário da paciente.
3. "examesExtraidos": Se o exame for laboratorial/sangue e você identificar algum dos valores abaixo na imagem, retorne a string do valor no campo correspondente (ex: hbVg: "12.5 g/dL / 38%", glicemiaTotg: "84 mg/dL"). Deixe em branco se não encontrado.

Campos suportados para extração: hbVg, plaquetas, glicemiaTotg, htlv, hiv, sifilis, hbsag, tsh, antiHcv, rubeola, cmv, toxo, vitD, ferritina, vitB12, urinaUrocultura, gbs.`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: promptText },
          { inlineData: { mimeType: mimeType || "image/jpeg", data: cleanBase64 } }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          resumoIA: { type: "STRING" },
          notaDra: { type: "STRING" },
          examesExtraidos: {
            type: "OBJECT",
            properties: {
              hbVg: { type: "STRING" },
              plaquetas: { type: "STRING" },
              glicemiaTotg: { type: "STRING" },
              htlv: { type: "STRING" },
              hiv: { type: "STRING" },
              sifilis: { type: "STRING" },
              hbsag: { type: "STRING" },
              tsh: { type: "STRING" },
              antiHcv: { type: "STRING" },
              rubeola: { type: "STRING" },
              cmv: { type: "STRING" },
              toxo: { type: "STRING" },
              vitD: { type: "STRING" },
              ferritina: { type: "STRING" },
              vitB12: { type: "STRING" },
              urinaUrocultura: { type: "STRING" },
              gbs: { type: "STRING" }
            }
          }
        }
      }
    }
  };

  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const data = await response.json();
        return JSON.parse(data.candidates[0].content.parts[0].text);
      }
    } catch (e) {
      console.warn(`Tentativa ${i + 1} falhou ao conectar com Gemini API`, e);
    }
  }
  throw new Error("Não foi possível analisar o exame com a IA.");
};
