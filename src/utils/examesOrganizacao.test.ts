import { describe, it, expect } from 'vitest';
import { agruparExamesTabelaPorData, pareceNomeDeArquivo } from './examesOrganizacao';

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

  it('preserva duplicidades — o mesmo exame duas vezes na mesma data não é deduplicado', () => {
    const examesTabela = {
      vitB12: [
        { data: '2026-08-20', resultado: '558 pg/mL' },
        { data: '2026-08-20', resultado: '859 pg/mL' }
      ]
    };
    const grupos = agruparExamesTabelaPorData(examesTabela, LISTA);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].itens).toHaveLength(2);
    expect(grupos[0].itens.map((i) => i.resultado)).toEqual(['558 pg/mL', '859 pg/mL']);
  });
});

describe('pareceNomeDeArquivo — UX-05.1', () => {
  it('reconhece nome de arquivo com extensão conhecida', () => {
    expect(pareceNomeDeArquivo('162524_20260711_19 (2).pdf')).toBe(true);
    expect(pareceNomeDeArquivo('IMG_20260711_192015.jpg')).toBe(true);
    expect(pareceNomeDeArquivo('scan.png')).toBe(true);
  });

  it('reconhece nome de arquivo sem extensão mas sem nenhuma letra (timestamp puro)', () => {
    expect(pareceNomeDeArquivo('162524_20260711_19 (2)')).toBe(true);
    expect(pareceNomeDeArquivo('')).toBe(true);
  });

  it('não confunde um nome clínico digitado pela médica com nome de arquivo', () => {
    expect(pareceNomeDeArquivo('Ecografia Morfológica')).toBe(false);
    expect(pareceNomeDeArquivo('Hemograma 1º Trimestre')).toBe(false);
  });
});
