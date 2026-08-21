import { describe, expect, it } from 'vitest';
import { construirTabelaGPG } from './gpgTabela';
import type { ConsultaEvolucao } from '../types/prenatal';

const consultas: ConsultaEvolucao[] = [
  { id: 'c-1', data: '2026-07-10', igSem: 20, peso: 65, pa: '110/70', au: '', bcfMf: '', edema: '', conduta: '' },
  { id: 'c-2', data: '2026-08-17', igSem: 24, peso: 68.4, pa: '110/70', au: '', bcfMf: '', edema: '', conduta: '' }
];

describe('construirTabelaGPG', () => {
  it('10. calcula o ganho acumulado (peso atual - peso inicial) quando o peso inicial existe', () => {
    const linhas = construirTabelaGPG(consultas, '60');
    expect(linhas[0]).toMatchObject({ id: 'c-1', data: '2026-07-10', igSem: 20, peso: 65, ganho: 5 });
    expect(linhas[1]).toMatchObject({ id: 'c-2', data: '2026-08-17', igSem: 24, peso: 68.4, ganho: 8.4 });
  });

  it('sem peso inicial válido, o ganho vem null em vez de usar um fallback inventado', () => {
    const linhas = construirTabelaGPG(consultas, undefined);
    expect(linhas.every((l) => l.ganho === null)).toBe(true);
    const linhasComTextoInvalido = construirTabelaGPG(consultas, 'não informado');
    expect(linhasComTextoInvalido.every((l) => l.ganho === null)).toBe(true);
  });

  it('preserva a mesma ordem e quantidade de consultas recebidas', () => {
    expect(construirTabelaGPG(consultas, '60')).toHaveLength(2);
    expect(construirTabelaGPG([], '60')).toEqual([]);
  });
});
