import type { VercelRequest, VercelResponse } from '@vercel/node';

// Esta função roda no servidor da Vercel, não no navegador — por isso a chave
// do Gemini (GEMINI_API_KEY) fica guardada aqui e nunca é enviada ao cliente.
// Antes, o navegador chamava a Google diretamente com a chave embutida no
// código, o que deixava a chave visível para qualquer visitante do site.

interface ExamIAResponse {
  resumoIA: string;
  notaDra: string;
  examesExtraidos?: Record<string, string>;
}

function buildPrompt(examCategory: string, examName: string) {
  return `
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
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });
  }

  const { base64Content, mimeType, examCategory, examName } = req.body || {};
  if (!base64Content) {
    return res.status(400).json({ error: 'Arquivo do exame não foi enviado.' });
  }

  let cleanBase64 = String(base64Content);
  if (cleanBase64.includes(',')) {
    cleanBase64 = cleanBase64.split(',')[1];
  }
  cleanBase64 = cleanBase64.replace(/[\r\n\s]/g, '');

  const modelName = 'gemini-3.6-flash';

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
                { text: buildPrompt(examCategory || '', examName || '') },
                { inlineData: { mimeType: mimeType || 'application/pdf', data: cleanBase64 } }
              ]
            }
          ],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro Gemini:', { status: response.status, model: modelName, error: errorText });
      return res.status(502).json({ error: `Gemini API retornou ${response.status}: ${errorText}` });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.error('Resposta inesperada do Gemini:', data);
      return res.status(502).json({ error: 'O Gemini não retornou conteúdo válido.' });
    }

    const parsed: ExamIAResponse = JSON.parse(rawText);

    return res.status(200).json({
      resumoIA: parsed.resumoIA || 'Exame analisado com sucesso.',
      notaDra: parsed.notaDra || 'Resultados conferidos.',
      examesExtraidos: parsed.examesExtraidos || {}
    });
  } catch (error: any) {
    console.error('Erro ao processar exame com Gemini:', error);
    return res.status(500).json({ error: error?.message || 'Não foi possível processar o exame.' });
  }
}
