// D2-CID-3C — portado sem alteração de lógica do protótipo validado
// (scratchpad/cid10-poc/search-engine.mjs). Motor de busca puro: sem
// sinônimos, sem MaternaIA, sem React — só anotações de tipo adicionadas.
//
// Deliberadamente SEM sinônimos: o motor não sabe que "dor de cabeça" e
// "cefaleia" têm relação — quem sabe disso é a camada de linguagem
// (synonyms.ts / search-with-language.ts), que expande a consulta ANTES de
// chamar este motor. O motor nunca muda.

import { normalizarBasico, palavrasEquivalentes } from './normalization';
import type { Cid10EntradaRaw, Cid10Indice, Cid10IndiceItem, Cid10ResultadoMotor } from './types';

export const normalizar = normalizarBasico;

export function construirIndice(entradas: Cid10EntradaRaw[]): Cid10Indice {
  return entradas.map((e) => ({
    ...e,
    _codigoNorm: normalizar(e.codigo),
    _codigoExibicaoNorm: normalizar(e.codigoExibicao),
    _descricaoNorm: normalizar(e.descricao),
    _palavras: normalizar(e.descricao).split(' ').filter(Boolean),
    _naoEspecificado: normalizar(e.descricao).includes('nao especificad')
  }));
}

// Ranking determinístico, sem pontuação de IA — cada nível é uma regra
// explicável em uma frase:
//   0. código bate exatamente
//   1. descrição bate exatamente
//   2. descrição começa com o termo
//   3. TODAS as palavras digitadas aparecem na descrição (compararPalavra
//      controla se a comparação é estrita ou flexível)
//   4. o termo aparece como substring em algum lugar da descrição
//   5. código aparece como substring do código
// Menor número = mais relevante.
function calcularNivel(
  item: Cid10IndiceItem,
  termoNorm: string,
  palavrasTermo: string[],
  compararPalavra: (a: string, b: string) => boolean,
  protegerSubstringCurta: boolean
): number | null {
  if (item._codigoNorm === termoNorm || item._codigoExibicaoNorm === termoNorm) return 0;
  if (item._descricaoNorm === termoNorm) return 1;
  if (item._descricaoNorm.startsWith(termoNorm)) return 2;
  if (palavrasTermo.length > 0 && palavrasTermo.every((p) => item._palavras.some((q) => compararPalavra(p, q)))) return 3;
  if ((!protegerSubstringCurta || termoNorm.length >= 4) && item._descricaoNorm.includes(termoNorm)) return 4;
  if (item._codigoNorm.includes(termoNorm)) return 5;
  return null;
}

// Dentro do MESMO nível, prioriza descrições "não especificadas" — convenção
// da própria CID-10 (código ".9"/"NE" é o "código genérico" da família).
function pesoNaoEspecificado(item: Cid10IndiceItem): number {
  return item._naoEspecificado ? 0 : 1;
}

// TESTADO E NÃO ATIVADO POR PADRÃO — mantido documentado (não apagado) por
// registrar uma investigação real: resolvia "pressão alta"/"hipertensão"
// perdendo I10, mas quebrava "febre" (promovia códigos raros A94/A99 na
// frente do genérico R50.9). Resolvido de outro jeito, ver
// diversificarPorCapitulo. Ver histórico completo no protótipo original.
export function pesoCodigoBare(codigoExibicao: string): number {
  return codigoExibicao.includes('.') ? 1 : 0;
}

// Decisão de produto da D2-CID-3A.1 (não usada por padrão desde a D2-CID-3B
// — ver diversificarPorCapitulo). Mantida por retrocompatibilidade, opt-in
// via opcoes.priorizarCapitulo.
export function pesoCapitulo(item: Cid10IndiceItem): number {
  if (item.capituloNumero === 15) return 0;
  if (item.capituloNumero === 18) return 1;
  return 2;
}

interface OpcoesBusca {
  compararPalavra?: (a: string, b: string) => boolean;
  melhorRanking?: boolean;
  protegerSubstringCurta?: boolean;
  priorizarCapitulo?: boolean;
}

interface EncontradoComNivel {
  item: Cid10IndiceItem;
  nivel: number;
}

function compararComTiebreak(a: EncontradoComNivel, b: EncontradoComNivel, opcoes: { melhorRanking: boolean; priorizarCapitulo: boolean }): number {
  if (a.nivel !== b.nivel) return a.nivel - b.nivel;
  if (opcoes.melhorRanking) {
    const diffNE = pesoNaoEspecificado(a.item) - pesoNaoEspecificado(b.item);
    if (diffNE !== 0) return diffNE;
  }
  if (opcoes.priorizarCapitulo) {
    const diff = pesoCapitulo(a.item) - pesoCapitulo(b.item);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function buscar(indice: Cid10Indice, termoOriginal: string, limite = 8, opcoes: OpcoesBusca = {}): Cid10ResultadoMotor[] {
  const {
    compararPalavra = (a: string, b: string) => a === b,
    melhorRanking = false,
    protegerSubstringCurta = false,
    priorizarCapitulo = false
  } = opcoes;

  const termoNorm = normalizar(termoOriginal);
  if (!termoNorm) return [];
  const palavrasTermo = termoNorm.split(' ').filter(Boolean);

  const encontrados: EncontradoComNivel[] = [];
  for (const item of indice) {
    const nivel = calcularNivel(item, termoNorm, palavrasTermo, compararPalavra, protegerSubstringCurta);
    if (nivel !== null) encontrados.push({ item, nivel });
  }

  encontrados.sort((a, b) => compararComTiebreak(a, b, { melhorRanking, priorizarCapitulo }));

  // Formato de retorno NÃO ganha nenhum campo novo (nem capituloNumero,
  // usado só internamente pra desempate) — preserva a mesma forma de
  // sempre, byte-a-byte compatível com a D2-CID-2.
  return encontrados.slice(0, limite).map(({ item, nivel }) => ({
    codigo: item.codigoExibicao,
    descricao: item.descricao,
    capitulo: item.capitulo,
    nivelRanking: nivel
  }));
}

export { palavrasEquivalentes };

// ---------------------------------------------------------------------------
// D2-CID-3B, seções 3/4/9 — substitui a regra "Capítulo XV sempre primeiro"
// da D2-CID-3A.1. A Dra. foi explícita: não decidir sozinho qual CID é
// "melhor" quando existe contexto geral E obstétrico — mostrar os dois.
//
// Passada 1 — pega o melhor item de cada capítulo distinto, restrito ao
// melhor nível de ranking encontrado (correção achada testando "pressão
// alta" — sem essa restrição, ruído de nível pior "gastava" vagas de
// capítulo antes da Passada 2 conseguir incluir o segundo contexto real).
// Passada 2 — preenche o resto respeitando um teto por capítulo.
export function diversificarPorCapitulo<T extends { nivelRanking: number; capituloNumero: number | null }>(
  itensOrdenados: T[],
  limite = 8,
  tetoPorCapitulo = 3
): T[] {
  const contagem = new Map<number | null, number>();
  const resultado: T[] = [];
  const jaIncluidos = new Set<T>();
  const melhorNivel = itensOrdenados.length > 0 ? itensOrdenados[0].nivelRanking : null;

  for (const item of itensOrdenados) {
    if (resultado.length >= limite) break;
    if (item.nivelRanking !== melhorNivel) continue;
    const cap = item.capituloNumero;
    if (contagem.has(cap)) continue;
    contagem.set(cap, 1);
    resultado.push(item);
    jaIncluidos.add(item);
  }

  for (const item of itensOrdenados) {
    if (resultado.length >= limite) break;
    if (jaIncluidos.has(item)) continue;
    const cap = item.capituloNumero;
    const atual = contagem.get(cap) || 0;
    if (atual >= tetoPorCapitulo) continue;
    contagem.set(cap, atual + 1);
    resultado.push(item);
    jaIncluidos.add(item);
  }

  return resultado;
}
