export interface ExameOficialOption {
  id: string;
  label: string;
}

// Abaixo disso o campo não mostra nada — evita despejar a lista inteira de
// exames oficiais assim que o campo ganha foco (UX-05.1, seção 10).
export const MIN_CARACTERES_BUSCA = 2;

// Faixa Unicode das marcas diacríticas combinantes (acentos separados pelo
// normalize('NFD')) — construída via fromCharCode para não depender de
// caracteres de combinação literais dentro do código-fonte.
const REMOVER_ACENTOS = new RegExp(
  '[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']',
  'g'
);

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(REMOVER_ACENTOS, '')
    .toLowerCase()
    .trim();
}

// Busca local usada pelo ExamAutocomplete — sem rede, sem IA, só filtra a
// LISTA_EXAMES_OFICIAIS já embutida no app. Ignora acento (ex: "rubeola"
// encontra "RUBÉOLA") pra não exigir que quem digita acerte a acentuação.
export function filtrarExamesOficiais(
  busca: string,
  lista: ExameOficialOption[]
): ExameOficialOption[] {
  const termo = normalizar(busca);
  if (termo.length < MIN_CARACTERES_BUSCA) return [];
  return lista.filter((ex) => normalizar(ex.label).includes(termo));
}
