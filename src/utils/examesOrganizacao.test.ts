import { describe, it, expect } from 'vitest';
import { agruparExamesTabelaPorData } from './examesOrganizacao';

const LISTA = [
  { id: 'hbVg', label: 'HB / VG' },
  { id: 'glicemiaTotg', label: 'GLICEMIA / TOTG' }
];

describe('agruparExamesTabelaPorData', () => {
  it('retorna lista vazia quando não há exames', () => {
    expect(agruparExamesTabelaPorData(undefined, LISTA)).toEqual([]);
    expect(agruparExamesTabelaPorData({}, LISTA)).toEqual([]);
  });

  it('agrupa exames de datas diferentes em grupos separados, mais recente primeiro', () => {
    const examesTabela = {
      hbVg: [{ data: '2026-04-15', resultado: '12.8 g/dL / 38%' }],
      glicemiaTotg: [{ data: '2026-02-20', resultado: '82 mg/dL' }]
    };
    const grupos = agruparExamesTabelaPorData(examesTabela, LISTA);
    expect(grupos.map((g) => g.data)).toEqual(['2026-04-15', '2026-02-20']);
    expect(grupos[0].itens).toEqual([{ exameId: 'hbVg', label: 'HB / VG', resultado: '12.8 g/dL / 38%' }]);
  });

  it('agrupa exames diferentes na MESMA data juntos', () => {
    const examesTabela = {
      hbVg: [{ data: '2026-02-20', resultado: '12.8 g/dL / 38%' }],
      glicemiaTotg: [{ data: '2026-02-20', resultado: '82 mg/dL' }]
    };
    const grupos = agruparExamesTabelaPorData(examesTabela, LISTA);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].itens).toHaveLength(2);
  });

  it('não inventa label para um exame fora da lista oficial — usa o próprio id', () => {
    const grupos = agruparExamesTabelaPorData({ examForaDaLista: [{ data: '2026-01-01', resultado: 'x' }] }, LISTA);
    expect(grupos[0].itens[0].label).toBe('examForaDaLista');
  });

  it('ignora resultados sem data (registro incompleto/legado)', () => {
    const examesTabela = { hbVg: [{ data: '', resultado: '12.8 g/dL' }] };
    expect(agruparExamesTabelaPorData(examesTabela, LISTA)).toEqual([]);
  });
});
