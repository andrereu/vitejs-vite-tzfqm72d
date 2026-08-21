import { describe, it, expect } from 'vitest';
import { filtrarExamesOficiais } from './examAutocomplete';

const LISTA = [
  { id: 'hbVg', label: 'HB / VG' },
  { id: 'glicemiaTotg', label: 'GLICEMIA / TOTG' },
  { id: 'rubeola', label: 'RUBÉOLA' },
  { id: 'vitB12', label: 'VITAMINA B12' }
];

describe('filtrarExamesOficiais — UX-05.1', () => {
  it('não mostra nada abaixo do mínimo de caracteres', () => {
    expect(filtrarExamesOficiais('', LISTA)).toEqual([]);
    expect(filtrarExamesOficiais('h', LISTA)).toEqual([]);
  });

  it('busca por exame — encontra por trecho parcial, sem depender de maiúscula/minúscula', () => {
    expect(filtrarExamesOficiais('vitamina', LISTA).map((e) => e.id)).toEqual(['vitB12']);
    expect(filtrarExamesOficiais('GLI', LISTA).map((e) => e.id)).toEqual(['glicemiaTotg']);
  });

  it('ignora acentuação na busca', () => {
    expect(filtrarExamesOficiais('rubeola', LISTA).map((e) => e.id)).toEqual(['rubeola']);
  });

  it('ausência de resultado — termo que não bate com nenhum exame', () => {
    expect(filtrarExamesOficiais('tomografia', LISTA)).toEqual([]);
  });

  it('lista vazia — nenhum exame oficial cadastrado', () => {
    expect(filtrarExamesOficiais('hemograma', [])).toEqual([]);
  });
});
