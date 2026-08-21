// HOTFIX — reproduz e prova a correção do bug real: um atendimento salvo
// sem diagnóstico (o caso mais comum) tinha `diagnostico: undefined` gravado
// explicitamente no objeto enviado ao setDoc, e o Firestore lança nesse
// caso — a escrita inteira do paciente falhava silenciosamente (evolução E
// solicitação vinculada, no mesmo documento), revertendo pro estado antigo
// no próximo reload. limparParaFirestore precisa eliminar qualquer
// `undefined`, em qualquer profundidade, sem alterar mais nada.
import { describe, expect, it } from 'vitest';
import { limparParaFirestore } from './firestoreSanitize';

function contemUndefinedProfundo(valor: unknown): boolean {
  if (valor === undefined) return true;
  if (Array.isArray(valor)) return valor.some(contemUndefinedProfundo);
  if (valor !== null && typeof valor === 'object') {
    return Object.values(valor as Record<string, unknown>).some(contemUndefinedProfundo);
  }
  return false;
}

describe('limparParaFirestore', () => {
  it('remove chave com valor undefined no primeiro nível', () => {
    expect(limparParaFirestore({ a: 1, b: undefined })).toEqual({ a: 1 });
  });

  it('preserva null (Firestore aceita null, só não aceita undefined)', () => {
    expect(limparParaFirestore({ a: null })).toEqual({ a: null });
  });

  it('preserva primitivos e não quebra com valores simples', () => {
    expect(limparParaFirestore('texto')).toBe('texto');
    expect(limparParaFirestore(42)).toBe(42);
    expect(limparParaFirestore(true)).toBe(true);
  });

  it('limpa recursivamente dentro de arrays de objetos', () => {
    const entrada = [{ x: 1, y: undefined }, { x: 2, y: 'ok' }];
    expect(limparParaFirestore(entrada)).toEqual([{ x: 1 }, { x: 2, y: 'ok' }]);
  });

  it('caso real: consulta sem diagnóstico (undefined) — a chave some, o resto do objeto continua intacto', () => {
    const consulta = {
      id: 'c-1',
      data: '2026-08-17',
      igSem: 24,
      peso: 68.4,
      pa: '110/70',
      diagnostico: undefined,
      conduta: 'Manter suplementação'
    };
    const limpo = limparParaFirestore(consulta);
    expect(limpo).toEqual({
      id: 'c-1',
      data: '2026-08-17',
      igSem: 24,
      peso: 68.4,
      pa: '110/70',
      conduta: 'Manter suplementação'
    });
    expect('diagnostico' in limpo).toBe(false);
  });

  it('caso real: consulta COM diagnóstico selecionado permanece intacta, código e descrição preservados', () => {
    const consulta = { id: 'c-2', diagnostico: { codigo: 'R51', descricao: 'Cefaleia' } };
    expect(limparParaFirestore(consulta)).toEqual({ id: 'c-2', diagnostico: { codigo: 'R51', descricao: 'Cefaleia' } });
  });

  it('caso real completo: Patient com consultasEvolucao + solicitacoes vinculada, uma consulta sem diagnóstico e outra com — resultado final sem nenhum undefined em nenhuma profundidade', () => {
    const paciente = {
      id: 'pac-1',
      nome: 'Maria',
      consultasEvolucao: [
        { id: 'c-1', data: '2026-08-10', igSem: 20, peso: 65, pa: '110/70', diagnostico: undefined, conduta: 'Rotina' },
        {
          id: 'c-2',
          data: '2026-08-17',
          igSem: 24,
          peso: 68.4,
          pa: '110/70',
          diagnostico: { codigo: 'R51', descricao: 'Cefaleia' },
          conduta: 'Analgesia e retorno em 2 semanas'
        }
      ],
      solicitacoes: [
        {
          id: 'sol-1',
          data: '2026-08-17',
          prescricoes: [{ id: 'presc-1', medicamento: 'Paracetamol', posologia: '1g a cada 12h' }],
          exames: [{ id: 'exsol-1', nome: 'Hemograma', tipo: 'Laboratorial' }],
          consultaEvolucaoId: 'c-2'
        }
      ]
    };

    const limpo = limparParaFirestore(paciente);

    expect(contemUndefinedProfundo(limpo)).toBe(false);
    expect('diagnostico' in limpo.consultasEvolucao[0]).toBe(false);
    expect(limpo.consultasEvolucao[1].diagnostico).toEqual({ codigo: 'R51', descricao: 'Cefaleia' });
    // A solicitação vinculada não é tocada por engano — mesmo vínculo, mesmos itens.
    expect(limpo.solicitacoes[0].consultaEvolucaoId).toBe('c-2');
    expect(limpo.solicitacoes[0].prescricoes).toHaveLength(1);
    expect(limpo.solicitacoes[0].exames).toHaveLength(1);
    // JSON.stringify nunca falha e nunca "engole" um campo por engano (undefined
    // vira ausente na serialização, o resto sobrevive) — sanity check adicional.
    expect(() => JSON.stringify(limpo)).not.toThrow();
  });

  it('não muta o objeto original', () => {
    const original = { a: 1, b: undefined as number | undefined };
    const limpo = limparParaFirestore(original);
    expect(limpo).not.toBe(original);
    expect('b' in original).toBe(true);
  });
});
