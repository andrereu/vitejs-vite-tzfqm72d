import type { Patient } from '../types/prenatal';

export interface ItemExameNaData {
  exameId: string;
  label: string;
  resultado: string;
}

export interface GrupoExamesPorData {
  data: string; // YYYY-MM-DD
  itens: ItemExameNaData[];
}

// D2.3 — agrupa a tabela de exames (hoje: um histórico de resultados por
// exame) numa lista de grupos por DATA, mais recente primeiro, do jeito
// que a Dra. pediu ("labs em tabela organizado por data"). Não decompõe
// `resultado` em valor/unidade/referência — esse campo é texto livre desde
// sempre (ex: "12.8 g/dL / 38%"), não existe estrutura pra separar isso sem
// inventar dado; cada item mostra exatamente o texto já salvo.
export function agruparExamesTabelaPorData(
  examesTabela: Patient['examesTabela'] | undefined,
  listaOficial: Array<{ id: string; label: string }>
): GrupoExamesPorData[] {
  const labelPorId = new Map(listaOficial.map((e) => [e.id, e.label]));
  const porData = new Map<string, ItemExameNaData[]>();

  for (const [exameId, historico] of Object.entries(examesTabela || {})) {
    for (const resultado of historico) {
      if (!resultado?.data) continue;
      const item: ItemExameNaData = {
        exameId,
        label: labelPorId.get(exameId) || exameId,
        resultado: resultado.resultado
      };
      const lista = porData.get(resultado.data) || [];
      lista.push(item);
      porData.set(resultado.data, lista);
    }
  }

  return Array.from(porData.entries())
    .map(([data, itens]) => ({ data, itens }))
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
}

const EXTENSAO_ARQUIVO = /\.(pdf|jpe?g|png|webp|heic|dcm)$/i;

// UX-05.1 — o campo `nome` de um documento enviado (examesEnviados) vem do
// título que quem fez o upload digitou, OU (quando ela deixa em branco) cai
// direto pro nome do arquivo do sistema operacional (App.tsx: `examName ||
// selectedFile.name`) — por isso o mesmo campo às vezes é um nome clínico
//("Ecografia Morfológica") e às vezes é algo como "162524_20260711_19
// (2).pdf". Como não existe um campo separado pra distinguir os dois casos,
// a heurística é: tem extensão de arquivo conhecida, OU não tem nenhuma
// letra (timestamp/id de câmera puro) → parece nome de arquivo, não nome
// clínico. Não tenta adivinhar qual exame é a partir do nome do arquivo.
export function pareceNomeDeArquivo(nome: string): boolean {
  if (EXTENSAO_ARQUIVO.test(nome)) return true;
  const semExtensao = nome.replace(EXTENSAO_ARQUIVO, '').trim();
  return !/[a-zà-ÿ]/i.test(semExtensao);
}
