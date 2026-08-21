// D2-CID-3C — testes das transições de valor do campo Diagnóstico
// (CidAutocomplete) e da compatibilidade com registros antigos. Cobre os
// itens 13-17 da bateria pedida na integração.
import { describe, expect, it } from 'vitest';
import { normalizarDiagnostico, valorParaSelecao, valorParaTextoLivre } from './diagnostico';

describe('valorParaTextoLivre — texto livre sem seleção (item 13)', () => {
  it('texto não vazio vira { descricao } sem código', () => {
    expect(valorParaTextoLivre('Dor abdominal')).toEqual({ descricao: 'Dor abdominal' });
  });

  it('texto vazio vira undefined (permite apagar o campo)', () => {
    expect(valorParaTextoLivre('')).toBeUndefined();
    expect(valorParaTextoLivre('   ')).toBeUndefined();
  });
});

describe('valorParaSelecao — selecionar uma sugestão (item 14)', () => {
  it('associa código e descrição só quando a médica seleciona explicitamente', () => {
    expect(valorParaSelecao('R51', 'Cefaléia')).toEqual({ codigo: 'R51', descricao: 'Cefaléia' });
  });
});

describe('apagar/editar depois de uma seleção (item 15)', () => {
  it('editar a descrição manualmente depois de uma seleção limpa o código — nunca fica associado ao novo texto', () => {
    const selecionado = valorParaSelecao('R51', 'Cefaléia');
    // a médica edita o texto (o componente sempre chama valorParaTextoLivre
    // pra digitação manual, nunca reaproveita o código de uma seleção
    // anterior)
    const editado = valorParaTextoLivre('Cefaléia intensa');
    expect(editado).toEqual({ descricao: 'Cefaléia intensa' });
    expect(editado).not.toHaveProperty('codigo');
    expect(selecionado.codigo).toBe('R51'); // o valor anterior não foi mutado
  });

  it('apagar todo o texto depois de uma seleção volta o campo pro estado vazio', () => {
    expect(valorParaTextoLivre('')).toBeUndefined();
  });
});

describe('normalizarDiagnostico — compatibilidade com registros antigos (itens 16 e 17)', () => {
  it('16. registro antigo (string solta) carrega como texto livre, sem código', () => {
    expect(normalizarDiagnostico('Cefaleia')).toEqual({ descricao: 'Cefaleia' });
  });

  it('16. registro antigo com string vazia vira undefined', () => {
    expect(normalizarDiagnostico('')).toBeUndefined();
  });

  it('17. registro novo com código carrega os dois campos', () => {
    expect(normalizarDiagnostico({ codigo: 'R51', descricao: 'Cefaléia' })).toEqual({ codigo: 'R51', descricao: 'Cefaléia' });
  });

  it('registro novo sem código (texto livre já salvo) carrega só a descrição', () => {
    expect(normalizarDiagnostico({ descricao: 'Dor abdominal' })).toEqual({ descricao: 'Dor abdominal' });
  });

  it('registro sem diagnostico nenhum vira undefined', () => {
    expect(normalizarDiagnostico(undefined)).toBeUndefined();
    expect(normalizarDiagnostico(null)).toBeUndefined();
  });

  it('formato inesperado (nem string nem objeto com descricao) vira undefined, não quebra', () => {
    expect(normalizarDiagnostico(42)).toBeUndefined();
    expect(normalizarDiagnostico({ codigo: 'R51' })).toBeUndefined();
  });
});
