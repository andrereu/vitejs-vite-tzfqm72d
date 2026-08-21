// D2-CID-3C — portado sem alteração de lógica do protótipo validado
// (scratchpad/cid10-poc/search-with-language.mjs, D2-CID-3A até D2-CID-3B).
// Camada de orquestração — a ÚNICA peça que conhece normalization/synonyms/
// search-engine ao mesmo tempo. CidAutocomplete só chama buscarComLinguagem,
// sem saber que motor/sinônimo/normalização existem separadamente.
//
//   termo digitado
//        ↓
//   normalization.ts   (minúsculas, acento, gênero, tolerância a erro)
//        ↓
//   synonyms.ts         (esse termo tem equivalente clínico?)
//        ↓
//   search-engine.ts    (motor puro, chamado por sub-busca — nunca alterado por isto aqui)
//   resultado mesclado, com METADADOS de por que cada item apareceu

import { normalizarBasico, palavrasEquivalentesComTolerancia, TAMANHO_MINIMO_TOLERANCIA_TYPO } from './normalization';
import { buscar, palavrasEquivalentes, diversificarPorCapitulo } from './search-engine';
import { SINONIMOS } from './synonyms';
import type { Cid10BuscaComLinguagem, Cid10Indice, Cid10ResultadoComLinguagem, Cid10ComoApareceu, Cid10Sinonimo } from './types';

// D2-CID-3B, seção 6 — "a lista deve aparecer só depois de 3+ caracteres".
export const TAMANHO_MINIMO_BUSCA = 3;

function encontrarSinonimos(termoNorm: string): Cid10Sinonimo[] {
  // Comparação EXATA de termo inteiro (não substring) — evita o falso
  // positivo de "itu" batendo dentro de "situ"/"instituição".
  return SINONIMOS.filter((s) => s.termos.includes(termoNorm));
}

export function buscarComLinguagem(indice: Cid10Indice, termoOriginal: string, limite = 8): Cid10BuscaComLinguagem {
  const termoNorm = normalizarBasico(termoOriginal);
  if (!termoNorm || termoNorm.length < TAMANHO_MINIMO_BUSCA) {
    return { termoOriginal, termoNormalizado: termoNorm, sinonimosUsados: [], resultados: [] };
  }

  const limiteInterno = 30; // busca mais internamente pra não perder itens bons no merge; corta pro `limite` só no final
  const palavrasTermoOriginal = termoNorm.split(' ').filter(Boolean);

  // buscar() não devolve capituloNumero (preserva compatibilidade byte-a-byte
  // com a D2-CID-2) — recupero aqui, do índice completo, só pra diversificação.
  const capituloNumeroPorCodigo = new Map(indice.map((it) => [it.codigoExibicao, it.capituloNumero]));

  // D2-CID-3B, seções 1/2/3/9: NENHUMA sub-busca usa priorizarCapitulo — a
  // regra "Capítulo XV sempre primeiro" foi removida da orquestração (ver
  // diversificarPorCapitulo, que mostra os dois contextos em vez de fazer um
  // "vencer" o outro no ranking bruto).

  // 1) Direto — comparação estrita de palavra
  const direto = buscar(indice, termoOriginal, limiteInterno, {
    compararPalavra: (a, b) => a === b,
    melhorRanking: true,
    protegerSubstringCurta: true
  });

  // 2) Com normalização gramatical (gênero -o/-a) — só isso, sem sinônimo
  const normalizado = buscar(indice, termoOriginal, limiteInterno, {
    compararPalavra: palavrasEquivalentes,
    melhorRanking: true,
    protegerSubstringCurta: true
  });

  // 3) D2-CID-3B, seção 7 — com tolerância a erro de digitação. Passe
  // separado, pra sempre poder distinguir "achei com variação de gênero" de
  // "achei por tolerância a erro" na explicação.
  //
  // Otimização medida: rodar essa passada sem necessidade multiplicava o
  // tempo de busca por ~7x — pulamos a passada inteira quando nenhuma
  // palavra do termo tem 6+ letras (garantidamente não acharia nada).
  const valeAPenaTolerarErro = palavrasTermoOriginal.some((p) => p.length >= TAMANHO_MINIMO_TOLERANCIA_TYPO);
  const comTolerancia = valeAPenaTolerarErro
    ? buscar(indice, termoOriginal, limiteInterno, {
        compararPalavra: palavrasEquivalentesComTolerancia,
        melhorRanking: true,
        protegerSubstringCurta: true
      })
    : [];

  // 4) Por sinônimo — uma sub-busca por equivalência encontrada
  const sinonimosCasados = encontrarSinonimos(termoNorm);
  const porSinonimo = sinonimosCasados.map((s) => ({
    sinonimo: s,
    resultados: buscar(indice, s.expandePara, limiteInterno, {
      compararPalavra: palavrasEquivalentes,
      melhorRanking: true,
      protegerSubstringCurta: true
    })
  }));

  // ---- merge: por código, guarda o menor nível e TODAS as estratégias que
  // encontraram aquele código ----
  const porCodigo = new Map<string, Cid10ResultadoComLinguagem>();

  function registrar(item: { codigo: string; descricao: string; capitulo: string; nivelRanking: number }, estrategia: Cid10ComoApareceu['estrategia'], extra: Partial<Cid10ComoApareceu>) {
    const atual = porCodigo.get(item.codigo);
    const entradaEstrategia: Cid10ComoApareceu = { estrategia, ...extra };
    if (!atual) {
      porCodigo.set(item.codigo, {
        codigo: item.codigo,
        descricao: item.descricao,
        capitulo: item.capitulo,
        capituloNumero: capituloNumeroPorCodigo.get(item.codigo) ?? null,
        nivelRanking: item.nivelRanking,
        naoEspecificado: /nao especificad/.test(normalizarBasico(item.descricao)),
        comoApareceu: [entradaEstrategia]
      });
    } else {
      atual.nivelRanking = Math.min(atual.nivelRanking, item.nivelRanking);
      // Não duplica a mesma estratégia — cada estratégia distinta aparece só 1x.
      const jaTem = atual.comoApareceu.some((e) => e.estrategia === estrategia && e.expandidoPara === extra.expandidoPara);
      if (!jaTem) atual.comoApareceu.push(entradaEstrategia);
    }
  }

  const codigosDiretos = new Set(direto.map((r) => r.codigo));
  const codigosNormalizados = new Set(normalizado.map((r) => r.codigo));
  for (const r of direto) registrar(r, 'direto', {});
  for (const r of normalizado) {
    // Se já achou por comparação estrita, é "direto" de verdade — só rotula
    // "normalizacao" o que SÓ apareceu graças ao comparador flexível.
    registrar(r, codigosDiretos.has(r.codigo) ? 'direto' : 'normalizacao', {});
  }
  for (const r of comTolerancia) {
    // Só rotula "tolerancia_erro" o que NINGUÉM mais achou.
    if (codigosDiretos.has(r.codigo) || codigosNormalizados.has(r.codigo)) continue;
    registrar(r, 'tolerancia_erro', {});
  }
  for (const { sinonimo, resultados } of porSinonimo) {
    for (const r of resultados) {
      registrar(r, 'sinonimo', {
        expandidoPara: sinonimo.expandePara,
        confianca: sinonimo.confianca,
        motivo: sinonimo.motivo
      });
    }
  }

  const ordenadoPorRelevancia = [...porCodigo.values()].sort((a, b) => {
    if (a.nivelRanking !== b.nivelRanking) return a.nivelRanking - b.nivelRanking;
    if (a.naoEspecificado !== b.naoEspecificado) return a.naoEspecificado ? -1 : 1;
    return 0; // SEM desempate por capítulo aqui — ver diversificarPorCapitulo
  });

  // D2-CID-3B: seleciona os `limite` finais garantindo que contextos
  // (capítulos) diferentes e relevantes apareçam juntos.
  const resultados = diversificarPorCapitulo(ordenadoPorRelevancia, limite);

  return {
    termoOriginal,
    termoNormalizado: termoNorm,
    sinonimosUsados: sinonimosCasados.map((s) => ({ expandePara: s.expandePara, confianca: s.confianca })),
    resultados
  };
}
