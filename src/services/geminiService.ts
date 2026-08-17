interface ExamIAResponse {
  resumoIA: string;
  notaDra: string;
  examesExtraidos?: Record<string, string>;
}

// A análise em si roda em api/analyze-exam.ts (função da Vercel), não aqui no
// navegador — assim a chave da API do Gemini nunca é exposta ao visitante do site.
export async function processExamWithGeminiIA(
  base64Content: string,
  mimeType: string,
  examCategory: string,
  examName: string
): Promise<ExamIAResponse> {
  const response = await fetch('/api/analyze-exam', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Content, mimeType, examCategory, examName })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Falha ao processar exame (status ${response.status}).`);
  }

  return {
    resumoIA: data.resumoIA || 'Exame analisado com sucesso.',
    notaDra: data.notaDra || 'Resultados conferidos.',
    examesExtraidos: data.examesExtraidos || {}
  };
}
