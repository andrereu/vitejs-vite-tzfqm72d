// D2-CID-3C — ponto de entrada público do motor de busca de CID-10.
// CidAutocomplete só importa daqui — não conhece normalization/synonyms/
// search-engine/search-with-language diretamente.
//
// A base (public/cid10-index.json, ~3,7 MB) fica fora do bundle principal:
// só é buscada (fetch) na primeira vez que carregarIndiceCid() é chamada —
// tipicamente quando a médica abre "Registrar Atendimento" pela primeira
// vez na sessão — e fica em memória depois disso (nunca busca de novo).
// Nenhuma chamada de rede acontece DURANTE a busca em si, só nesse
// carregamento inicial, e é sempre a mesma base local servida pelo próprio
// MaternaIA — não é uma API externa nem envolve Gemini.

import { construirIndice } from './search-engine';
import { buscarComLinguagem, TAMANHO_MINIMO_BUSCA } from './search-with-language';
import type { Cid10BuscaComLinguagem, Cid10EntradaRaw, Cid10Indice } from './types';

export type { Cid10BuscaComLinguagem, Cid10ResultadoComLinguagem, Cid10ComoApareceu, Cid10Estrategia, Cid10Indice } from './types';
export { TAMANHO_MINIMO_BUSCA };

let indicePromise: Promise<Cid10Indice> | null = null;

// Carrega e constrói o índice uma única vez por sessão (memoizado) — chamadas
// concorrentes reaproveitam a mesma promise em vez de disparar 2 fetches.
export function carregarIndiceCid(): Promise<Cid10Indice> {
  if (!indicePromise) {
    indicePromise = fetch('/cid10-index.json')
      .then((resp) => {
        if (!resp.ok) throw new Error(`Não foi possível carregar a base de CID-10 (HTTP ${resp.status})`);
        return resp.json();
      })
      .then((entradas: Cid10EntradaRaw[]) => construirIndice(entradas))
      .catch((err) => {
        // Não deixa a promise "quebrada" memoizada — uma tentativa futura
        // (ex: reabrir o modal) pode tentar de novo.
        indicePromise = null;
        throw err;
      });
  }
  return indicePromise;
}

// Busca com toda a camada de linguagem (sinônimos, normalização de gênero,
// tolerância a erro, contexto duplo) — mesmo motor validado nas fases
// D2-CID-2 até D2-CID-3B.2, sem nenhuma lógica de busca duplicada aqui.
export function buscarCid(indice: Cid10Indice, termo: string, limite = 8): Cid10BuscaComLinguagem {
  return buscarComLinguagem(indice, termo, limite);
}
