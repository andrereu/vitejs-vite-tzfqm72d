// D2-CID-3C — tipos compartilhados do motor de busca de CID-10, portado do
// protótipo validado em scratchpad/cid10-poc/ (fases D2-CID-2 até D2-CID-3B.2).
// Ver src/utils/cid10/index.ts para o ponto de entrada público.

// Formato de cada linha da base (public/cid10-index.json), igual ao gerado
// pelo parse.mjs do protótipo.
export interface Cid10EntradaRaw {
  codigo: string;
  codigoExibicao: string;
  descricao: string;
  descricaoAbreviada?: string;
  restricaoSexo?: string | null;
  capitulo: string;
  capituloNumero: number;
}

// Entrada do índice em memória, com os campos normalizados pré-calculados
// (construirIndice em search-engine.ts) — nunca serializado, só existe
// enquanto o app está aberto.
export interface Cid10IndiceItem extends Cid10EntradaRaw {
  _codigoNorm: string;
  _codigoExibicaoNorm: string;
  _descricaoNorm: string;
  _palavras: string[];
  _naoEspecificado: boolean;
}

export type Cid10Indice = Cid10IndiceItem[];

// Formato de retorno "cru" de buscar() (search-engine.ts) — sem metadados de
// estratégia, idêntico ao motor puro D2-CID-2.
export interface Cid10ResultadoMotor {
  codigo: string;
  descricao: string;
  capitulo: string;
  nivelRanking: number;
}

// Cada estratégia que encontrou um código — um resultado pode ter mais de
// uma (ex: achado tanto "direto" quanto por "sinonimo").
export type Cid10Estrategia = 'direto' | 'normalizacao' | 'tolerancia_erro' | 'sinonimo';

export interface Cid10ComoApareceu {
  estrategia: Cid10Estrategia;
  expandidoPara?: string;
  confianca?: string;
  motivo?: string;
}

// Item pronto pra exibir no autocomplete — código + descrição já mesclados
// entre as várias estratégias, com a origem preservada internamente (não
// mostrada visualmente por padrão, ver CidAutocomplete).
export interface Cid10ResultadoComLinguagem {
  codigo: string;
  descricao: string;
  capitulo: string;
  capituloNumero: number | null;
  nivelRanking: number;
  naoEspecificado: boolean;
  comoApareceu: Cid10ComoApareceu[];
}

export interface Cid10BuscaComLinguagem {
  termoOriginal: string;
  termoNormalizado: string;
  sinonimosUsados: Array<{ expandePara: string; confianca: string }>;
  resultados: Cid10ResultadoComLinguagem[];
}

export interface Cid10Sinonimo {
  termos: string[];
  expandePara: string;
  categoria: string;
  confianca: string;
  motivo: string;
}
