// D2-CID-3C — portado sem alteração de lógica do protótipo validado
// (scratchpad/cid10-poc/normalization.mjs, D2-CID-3A até D2-CID-3B.2).
// Único ajuste em relação ao original: anotações de tipo TypeScript — o
// comportamento (toda regra, toda lista de bloqueio, toda decisão da Dra.)
// é idêntico, byte a byte, ao motor testado nas fases anteriores.

// Minúsculas + sem acento + sem pontuação de código (ponto/hífen) + espaços
// únicos.
export function normalizarBasico(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.,;:()[\]\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Normalização morfológica — DELIBERADAMENTE MÍNIMA.
//
// A única regra implementada é a troca de gênero -o/-a em palavras com mais
// de 4 letras (ex: "urinário" <-> "urinária"). Ver histórico completo da
// decisão (o que foi tentado e rejeitado) no protótipo original.
export function chaveGenero(palavra: string): string {
  if (palavra.length > 4 && (palavra.endsWith('a') || palavra.endsWith('o'))) {
    return palavra.slice(0, -1);
  }
  return palavra;
}

// ---------------------------------------------------------------------------
// D2-CID-3B.2 — bloqueio estrutural DENTRO da normalização de gênero.
//
// chaveGenero() corta a vogal final de uma palavra que termina em "a"/"o"
// pra comparar com outra — funciona bem quando o radical resultante NÃO é,
// por si só, uma palavra de verdade (ex: "urinário"/"urinária" -> radical
// "urinári", que não existe sozinho). O problema é quando o radical cai, por
// coincidência, numa palavra que já existe na base com sentido próprio e
// diferente — "nervosa" (Anorexia/Bulimia nervosa, termo psiquiátrico
// composto) perde o "a" e vira "nervos", que já é a forma plural de "nervo"
// (neurologia/oncologia).
//
// Não dá pra distinguir os casos perigosos dos seguros só pela forma das
// palavras — só pelo que cada uma significa na base real. Varredura
// sistemática de todo o vocabulário (6.223 palavras) encontrou 11 casos do
// mesmo padrão; 8 são seguros (mesmo conceito nos dois lados, ex:
// "meninge"/"meníngeo"), 3 são perigosos de verdade e ficam bloqueados aqui:
const PARES_BLOQUEADOS_GENERO = new Set<string>([
  'nervos|nervosa',  // nervos (nervos periféricos/sistema nervoso, neurologia/oncologia) x nervosa (Anorexia/Bulimia nervosa, psiquiatria)
  'caloso|calos',     // corpo caloso (estrutura cerebral) x calos/calosidades (achado dermatológico)
  'motor|motora'      // motora (função motora, neurologia) x motor (quase sempre "veículo a motor", causas externas de trânsito)
].map((par) => par.split('|').sort().join('|')));

function parBloqueadoGenero(a: string, b: string): boolean {
  return PARES_BLOQUEADOS_GENERO.has([a, b].sort().join('|'));
}

// Comparador de palavra "flexível": duas palavras são consideradas a mesma
// se forem idênticas OU se a chaveGenero delas coincidir — EXCETO os 3 pares
// acima. Usado pelo motor quando a camada de linguagem pede normalização
// gramatical, e também como primeira checagem dentro de
// palavrasEquivalentesComTolerancia().
export function palavrasEquivalentes(a: string, b: string): boolean {
  if (a === b) return true;
  // Otimização medida (não prematura): comparar chaveGenero primeiro e só
  // consultar a lista de bloqueio quando ela já bate elimina quase todo o
  // custo extra — ver histórico de performance no protótipo original.
  if (chaveGenero(a) !== chaveGenero(b)) return false;
  return !parBloqueadoGenero(a, b);
}

// ---------------------------------------------------------------------------
// D2-CID-3B, seção 7 — tolerância CONSERVADORA a erro de digitação.
// Distância de Levenshtein clássica, implementação de dicionário.
export function distanciaLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let anterior: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const atual: number[] = [i];
    for (let j = 1; j <= n; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      atual[j] = Math.min(
        anterior[j] + 1,       // remoção
        atual[j - 1] + 1,      // inserção
        anterior[j - 1] + custo // substituição
      );
    }
    anterior = atual;
  }
  return anterior[n];
}

// "≥6 letras E distância ≤1" — ver justificativa completa (testada contra os
// 6 pares de erro reais da Dra. e a varredura de segurança do vocabulário
// inteiro) no protótipo original.
export const TAMANHO_MINIMO_TOLERANCIA_TYPO = 6;
export const DISTANCIA_MAXIMA_TYPO = 1;

// ---------------------------------------------------------------------------
// D2-CID-3B / D2-CID-3B.1 / D2-CID-3B.2 — lista de pares que a tolerância a
// erro NÃO deve tratar como equivalentes, mesmo estando a distância 1 e
// tendo 6+ letras. Cada par foi confirmado com evidência real da base
// (código + descrição de cada lado) — nunca por suposição. 168 pares no
// total: 22 da auditoria inicial (D2-CID-3B), 139 da auditoria sistemática
// completa dos 326 candidatos (D2-CID-3B.1), 7 decididos pela Dra. Priscila
// sobre os casos que a auditoria não conseguiu resolver sozinha (D2-CID-3B.2).
const PARES_BLOQUEADOS_TOLERANCIA = new Set<string>([
  // ---- D2-CID-3B (22 pares originais) ----
  'toxico|topico', 'porcao|torcao', 'parotida|carotida', 'vacina|vagina',
  'vacinal|vaginal', 'normal|anormal', 'normais|anormais',
  'anormalidade|normalidade', 'malaria|mamaria', 'malarias|mamarias',
  'nefropatia|neuropatia', 'microcefalia|macrocefalia',
  'microftalmia|macroftalmia', 'macrotia|microtia',
  'macrostomia|microstomia', 'macroqueilia|microqueilia',
  'funcao|puncao', 'juncao|puncao', 'ureteral|uretral',
  'neurite|nefrite', 'vulgar|vulvar', 'cistica|ciatica',

  // ---- D2-CID-3B.1 (139 novos) ----
  'figado|ligado', 'laringe|faringe', 'miliar|biliar', 'miliar|ciliar',
  'miliares|biliares', 'faringea|laringea', 'influenzae|influenza',
  'latente|lactente', 'latente|patente', 'tardia|cardia', 'faringite|laringite',
  'plantar|plantas', 'epidemico|epidermico', 'central|ventral',
  'ocidental|acidental', 'epidemica|epidermica', 'subito|cubito',
  'graves|gravis', 'rotura|rotula', 'chagas|chamas', 'feridas|ferias',
  'externo|esterno', 'branquial|braquial', 'grande|glande', 'juncao|funcao',
  'biliar|ciliar', 'maxilar|axilar', 'conduto|condutor', 'nervos|nervosa',
  'cordao|cordas', 'retina|retida', 'retina|rotina', 'coroide|ceroide',
  'axilares|maxilares', 'deplecao|delecao', 'cadeia|cadeira',
  'articular|particular', 'essencial|essencias', 'disfagia|disfasia',
  'seletiva|eletiva', 'aplastica|plastica', 'defeitos|efeitos',
  'defeito|efeito', 'brancos|bracos', 'proximas|proximal',
  'complexo|completo', 'encurtamento|encurvamento', 'locais|vocais',
  'gastrina|gastrica', 'mancha|marcha', 'lactase|lactose', 'frutose|frutos',
  'artrite|arterite', 'atipica|atopica', 'alucinose|aluminose',
  'estado|estadio', 'labilidade|habilidade', 'mentais|metais',
  'remissao|emissao', 'mistos|cistos', 'reacao|relacao', 'reacoes|relacoes',
  'estados|estudos', 'hipersonia|hipertonia', 'afasia|afacia',
  'autismo|mutismo', 'oposicao|posicao', 'separacao|reparacao',
  'fobico|folico', 'reativo|relativo', 'cronico|clonico', 'vocais|focais',
  'distonia|distocia', 'distonia|disfonia', 'necrotica|nefrotica',
  'discos|riscos', 'ciatico|cistico', 'medial|medias',
  'compressao|compressas', 'entropio|ectropio', 'estenose|estanose',
  'enoftalmia|anoftalmia', 'estranho|estanho', 'pupilares|papilares',
  'camadas|camaras', 'aberto|aborto', 'quarto|quanto', 'refracao|retracao',
  'pupilar|papilar', 'medias|medicas', 'medias|medidas', 'patente|parente',
  'ototoxica|fototoxica', 'perdas|pernas', 'papilares|capilares',
  'juncional|funcional', 'papilar|papular', 'venosa|ventosa',
  'venoso|penoso', 'cornetos|corretos', 'tensao|tendao', 'dentes|lentes',
  'arcadas|armadas', 'papilas|papulas', 'peptica|septica',
  'neurogenico|nefrogenico', 'reativa|relativa', 'portal|mortal',
  'metais|fetais', 'corantes|cortantes', 'anidrose|anidrase',
  'poliartrite|poliarterite', 'artrites|arterites', 'imobilidade|mobilidade',
  'peroneo|perineo', 'nefritica|nefrotica', 'nefritica|nefretica',
  'focais|fecais', 'nefrotica|nefretica', 'medicas|medidas',
  'materna|materia', 'pubica|publica', 'fetais|fecais',
  'completa|complexa', 'medica|medida', 'reducao|seducao',
  'entrada|estrada', 'vulvares|valvares', 'diastrofica|distrofica',
  'sopros|sogros', 'diafise|dialise', 'diafises|dialises',
  'abdutor|adutor', 'bracos|tracos', 'etanol|metanol', 'tratos|tracos',
  'cadeira|caldeira', 'queima|queixa', 'folhas|falhas',

  // ---- D2-CID-3B.2 (7 pares — decisão da Dra. Priscila) ----
  'inferior|interior', 'anterior|interior', 'locais|focais',
  'bromidrose|cromidrose', 'pioliartrite|poliartrite',
  'incontinencia|incontinentia', 'patrao|padrao'
].map((par) => par.split('|').sort().join('|')));

function parBloqueado(a: string, b: string): boolean {
  return PARES_BLOQUEADOS_TOLERANCIA.has([a, b].sort().join('|'));
}

export function palavrasEquivalentesComTolerancia(a: string, b: string): boolean {
  if (palavrasEquivalentes(a, b)) return true;
  if (a.length < TAMANHO_MINIMO_TOLERANCIA_TYPO || b.length < TAMANHO_MINIMO_TOLERANCIA_TYPO) return false;
  // Otimização medida: a distância de Levenshtein nunca é MENOR que a
  // diferença de tamanho entre as duas strings — se já diferem em mais de
  // DISTANCIA_MAXIMA_TYPO caracteres de comprimento, não vale rodar a
  // programação dinâmica.
  if (Math.abs(a.length - b.length) > DISTANCIA_MAXIMA_TYPO) return false;
  if (parBloqueado(a, b)) return false;
  return distanciaLevenshtein(a, b) <= DISTANCIA_MAXIMA_TYPO;
}
