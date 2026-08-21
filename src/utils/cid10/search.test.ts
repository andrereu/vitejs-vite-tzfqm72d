// D2-CID-3C — testes do motor de busca de CID-10 integrado, contra a base
// real publicada em public/cid10-index.json (não um fetch — lida direto do
// disco, como o resto da suíte do projeto, ambiente 'node' sem jsdom).
// Cobre os casos pedidos na fase de integração (itens 1-12 e 18 da seção
// "TESTES"); os itens 13-17 (texto livre, seleção, edição de registro
// antigo/novo) estão em diagnostico.test.ts, que testa as funções puras de
// transição de valor usadas pelo componente.
//
// Referência de tipos do Node escopada só a este arquivo (não no
// tsconfig.app.json global, que é propositalmente só DOM/browser) — só este
// teste precisa ler o arquivo do disco.
/// <reference types="node" />
import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { construirIndice } from './search-engine';
import { buscarCid } from './index';
import type { Cid10Indice, Cid10EntradaRaw } from './types';

let indice: Cid10Indice;

beforeAll(() => {
  const raw = JSON.parse(readFileSync(resolve(__dirname, '../../../public/cid10-index.json'), 'utf8')) as Cid10EntradaRaw[];
  indice = construirIndice(raw);
});

function codigos(termo: string, limite = 8) {
  return buscarCid(indice, termo, limite).resultados.map((r) => r.codigo);
}

describe('CidAutocomplete — motor integrado (public/cid10-index.json)', () => {
  it('1. "cefaleia" acha R51', () => {
    expect(codigos('cefaleia')).toContain('R51');
  });

  it('2. "dor de cabeça" acha R51 via sinônimo', () => {
    expect(codigos('dor de cabeça')).toContain('R51');
  });

  it('3. "hipertensao" mostra contexto geral (I10) e obstétrico (O10.9) juntos', () => {
    const c = codigos('hipertensao');
    expect(c).toContain('I10');
    expect(c).toContain('O10.9');
  });

  it('4. "hipertenção" (erro de digitação) acha os mesmos códigos de "hipertensao"', () => {
    const certo = codigos('hipertensao');
    const comErro = codigos('hipertenção');
    expect(comErro.some((cod) => certo.includes(cod))).toBe(true);
    expect(comErro).toContain('I10');
  });

  it('5. "infecção urinária" acha N39.0', () => {
    expect(codigos('infecção urinária')).toContain('N39.0');
  });

  it('6. "infecao urinaria" (sem acento) acha os mesmos códigos', () => {
    expect(codigos('infecao urinaria')).toContain('N39.0');
  });

  it('7. "corrimento" não expande por sinônimo nenhum (decisão da Dra. — nunca sugerir vaginite sozinho)', () => {
    expect(codigos('corrimento')).toEqual([]);
  });

  it('8. "visão turva" não expande por sinônimo nenhum (decisão da Dra.)', () => {
    expect(codigos('visão turva')).toEqual([]);
  });

  it('9. "sangramento" não traz hemorragia intracraniana (I60-I62)', () => {
    const c = codigos('sangramento');
    expect(c.some((cod) => cod.startsWith('I6'))).toBe(false);
  });

  it('10. código "R51" busca por código exato', () => {
    expect(codigos('R51')).toEqual(['R51']);
  });

  it('11. código "I10" busca por código exato', () => {
    expect(codigos('I10')).toEqual(['I10']);
  });

  it('12. menos de 3 caracteres não retorna nada', () => {
    expect(buscarCid(indice, 'ed').resultados).toEqual([]);
    expect(buscarCid(indice, '').resultados).toEqual([]);
  });

  it('18. contexto duplo: "edema" mostra geral (R60.x) e obstétrico (O12.x) juntos', () => {
    const c = codigos('edema');
    expect(c.some((cod) => cod.startsWith('R60'))).toBe(true);
    expect(c.some((cod) => cod.startsWith('O12'))).toBe(true);
  });

  it('18. contexto duplo: "diabetes" mostra códigos gerais (E1x) e obstétricos (O24.x)', () => {
    const c = codigos('diabetes');
    expect(c.some((cod) => cod.startsWith('E1'))).toBe(true);
    expect(c.some((cod) => cod.startsWith('O24'))).toBe(true);
  });
});
