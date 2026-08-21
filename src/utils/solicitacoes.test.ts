// UX-03.1 — diagnóstico do bug "Prescrição/Exames não aparecem no card
// mobile": prova que a resolução de SolicitacaoClinica por
// consultaEvolucaoId funciona corretamente pra exatamente o caso que devia
// reproduzir o problema (seção 12 da fase: "Evolução X + Solicitacao...
// consultaEvolucaoId = X → mobile mostra Prescrição/Exames").
import { describe, expect, it } from 'vitest';
import { encontrarSolicitacaoDoAtendimento } from './solicitacoes';
import type { SolicitacaoClinica } from '../types/prenatal';

const solicitacaoBase: SolicitacaoClinica = {
  id: 'sol-1',
  data: '2026-08-17',
  prescricoes: [{ id: 'presc-1', medicamento: 'Paracetamol', posologia: '1g a cada 12h' }],
  exames: [{ id: 'exsol-1', nome: 'Hemograma', tipo: 'Laboratorial' }],
  consultaEvolucaoId: 'c-X'
};

describe('encontrarSolicitacaoDoAtendimento', () => {
  it('caso principal: encontra a solicitação vinculada ao id do atendimento', () => {
    expect(encontrarSolicitacaoDoAtendimento([solicitacaoBase], 'c-X')).toEqual(solicitacaoBase);
  });

  it('não encontra quando nenhuma solicitação aponta pra esse id', () => {
    expect(encontrarSolicitacaoDoAtendimento([solicitacaoBase], 'c-outro')).toBeUndefined();
  });

  it('lista de solicitações undefined (paciente sem nenhuma ainda) não quebra', () => {
    expect(encontrarSolicitacaoDoAtendimento(undefined, 'c-X')).toBeUndefined();
  });

  it('consultaEvolucaoId vazio/null/undefined nunca "encontra" a solicitação errada', () => {
    const solicitacaoSemVinculo: SolicitacaoClinica = { id: 'sol-2', data: '2026-08-17', prescricoes: [], exames: [] };
    expect(encontrarSolicitacaoDoAtendimento([solicitacaoSemVinculo], undefined)).toBeUndefined();
    expect(encontrarSolicitacaoDoAtendimento([solicitacaoSemVinculo], null)).toBeUndefined();
    expect(encontrarSolicitacaoDoAtendimento([solicitacaoSemVinculo], '')).toBeUndefined();
  });

  it('várias solicitações: acha só a que casa, não a primeira da lista', () => {
    const outra: SolicitacaoClinica = { ...solicitacaoBase, id: 'sol-2', consultaEvolucaoId: 'c-Y' };
    expect(encontrarSolicitacaoDoAtendimento([outra, solicitacaoBase], 'c-X')).toEqual(solicitacaoBase);
  });
});
