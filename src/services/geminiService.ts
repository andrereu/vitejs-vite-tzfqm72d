interface ExamIAResponse {
  resumoIA: string;
  notaDra: string;
  examesExtraidos?: Record<string, string>;
}

// A análise em si roda em api/analyze-exam.ts (função da Vercel), não aqui no
// navegador — assim a chave da API do Gemini nunca é exposta ao visitante do site.
//
// UX-05.2 — doctorId aqui é só um identificador (mesma finalidade de sempre:
// achar o documento certo no Firestore), nunca a instrução da médica em si.
// É o servidor que busca a preferência salva e monta o prompt final; o
// cliente não lê nem envia esse texto.
export async function processExamWithGeminiIA(
  base64Content: string,
  mimeType: string,
  examCategory: string,
  examName: string,
  doctorId: string
): Promise<ExamIAResponse> {
  const response = await fetch('/api/analyze-exam', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Content, mimeType, examCategory, examName, doctorId })
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
