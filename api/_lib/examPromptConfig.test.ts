import { describe, it, expect } from 'vitest';
import { modalidadeDoExame, montarBlocoPreferenciaModalidade } from './examPromptConfig';

describe('modalidadeDoExame — UX-05.2', () => {
  it('mapeia Ecografia e Laboratorial para suas modalidades', () => {
    expect(modalidadeDoExame('Ecografia')).toBe('ecografia');
    expect(modalidadeDoExame('Laboratorial')).toBe('laboratorial');
  });

  it('qualquer outra categoria cai em "outros" (inclui Tomografia/Ressonância, ainda sem categoria própria)', () => {
    expect(modalidadeDoExame('Outro')).toBe('outros');
    expect(modalidadeDoExame('Tomografia')).toBe('outros');
    expect(modalidadeDoExame('')).toBe('outros');
  });
});

describe('montarBlocoPreferenciaModalidade — UX-05.2', () => {
  it('configuração ausente — fallback vazio, prompt igual ao de antes', () => {
    expect(montarBlocoPreferenciaModalidade(undefined, 'Ecografia')).toBe('');
    expect(montarBlocoPreferenciaModalidade(null, 'Ecografia')).toBe('');
  });

  it('configuração existente mas sem texto pra essa modalidade — fallback vazio', () => {
    const config = { instrucoesPorModalidade: { laboratorial: 'Destacar hemograma.' } };
    expect(montarBlocoPreferenciaModalidade(config, 'Ecografia')).toBe('');
  });

  it('modalidade Ecografia usa instrucoesPorModalidade.ecografia', () => {
    const config = {
      instrucoesPorModalidade: {
        ecografia: 'Colocar CCN, DMSG, VV, IG e DPP no resumo do 1º trimestre.'
      }
    };
    const bloco = montarBlocoPreferenciaModalidade(config, 'Ecografia');
    expect(bloco).toContain('CCN, DMSG, VV, IG e DPP');
  });

  it('modalidade Laboratorial usa instrucoesPorModalidade.laboratorial', () => {
    const config = { instrucoesPorModalidade: { laboratorial: 'Priorizar hemograma e glicemia.' } };
    const bloco = montarBlocoPreferenciaModalidade(config, 'Laboratorial');
    expect(bloco).toContain('Priorizar hemograma e glicemia.');
  });

  it('modalidade Outro (e Tomografia/Ressonância) usa instrucoesPorModalidade.outros', () => {
    const config = { instrucoesPorModalidade: { outros: 'Resumir impressão diagnóstica final.' } };
    expect(montarBlocoPreferenciaModalidade(config, 'Outro')).toContain('impressão diagnóstica final');
    expect(montarBlocoPreferenciaModalidade(config, 'Tomografia')).toContain('impressão diagnóstica final');
  });

  it('ignora instrução em branco (só espaços) como se não existisse', () => {
    const config = { instrucoesPorModalidade: { ecografia: '   ' } };
    expect(montarBlocoPreferenciaModalidade(config, 'Ecografia')).toBe('');
  });

  it('combinação — a mesma configuração serve modalidades diferentes de forma independente', () => {
    const config = {
      instrucoesPorModalidade: {
        ecografia: 'Instrução USG.',
        laboratorial: 'Instrução laboratorial.',
        outros: 'Instrução outros.'
      }
    };
    expect(montarBlocoPreferenciaModalidade(config, 'Ecografia')).toContain('Instrução USG.');
    expect(montarBlocoPreferenciaModalidade(config, 'Laboratorial')).toContain('Instrução laboratorial.');
    expect(montarBlocoPreferenciaModalidade(config, 'Outro')).toContain('Instrução outros.');
  });
});
