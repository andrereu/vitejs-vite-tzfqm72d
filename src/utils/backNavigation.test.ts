import { describe, it, expect } from 'vitest';
import { activeKinds, depthOf, nextPopKind, type BackNavFlags } from './backNavigation';

const flags = (hasDrill: boolean, hasTab: boolean, hasOverlay: boolean): BackNavFlags => ({
  hasDrill, hasTab, hasOverlay
});

describe('activeKinds', () => {
  it('está vazio em repouso', () => {
    expect(activeKinds(flags(false, false, false))).toEqual([]);
  });

  it('lista na ordem fixa drill, aba, overlay quando os três estão ativos', () => {
    expect(activeKinds(flags(true, true, true))).toEqual(['drill', 'tab', 'overlay']);
  });

  it('inclui só os tipos ativos, mesmo fora da combinação completa', () => {
    expect(activeKinds(flags(true, false, true))).toEqual(['drill', 'overlay']);
    expect(activeKinds(flags(false, true, false))).toEqual(['tab']);
  });
});

describe('depthOf', () => {
  it('conta quantos níveis estão ativos, não quantas transições ocorreram', () => {
    expect(depthOf(flags(false, false, false))).toBe(0);
    expect(depthOf(flags(false, true, false))).toBe(1);
    expect(depthOf(flags(true, true, false))).toBe(2);
    expect(depthOf(flags(true, true, true))).toBe(3);
  });

  it('trocar de aba dentro do mesmo nível não muda a profundidade (coalescência)', () => {
    // Resumo -> GPG -> Exames -> Vacinas: em todos os pontos fora de 'resumo'
    // o estado observável é hasTab=true, hasDrill/hasOverlay iguais — a
    // aplicação nunca soma uma entrada por aba visitada.
    const emGpg = flags(false, true, false);
    const emExames = flags(false, true, false);
    const emVacinas = flags(false, true, false);
    expect(depthOf(emGpg)).toBe(depthOf(emExames));
    expect(depthOf(emExames)).toBe(depthOf(emVacinas));
  });
});

describe('nextPopKind — prioridade overlay > aba > drill', () => {
  it('resolve overlay primeiro, mesmo com drill e aba também ativos', () => {
    expect(nextPopKind(flags(true, true, true))).toBe('overlay');
  });

  it('resolve aba quando não há overlay, mesmo com drill ativo', () => {
    expect(nextPopKind(flags(true, true, false))).toBe('tab');
  });

  it('resolve drill quando só ele está ativo', () => {
    expect(nextPopKind(flags(true, false, false))).toBe('drill');
  });

  it('retorna null em repouso — Back deve sair do MaternaIA normalmente', () => {
    expect(nextPopKind(flags(false, false, false))).toBeNull();
  });

  it('resolve exatamente um nível por vez (paciente dentro do prontuário com modal aberto)', () => {
    // Cenário 5/17.5 do pedido: Resumo -> Exames -> modal -> Back -> Back.
    // Primeiro Back: só overlay cai.
    const comModalEExames = flags(false, true, true);
    expect(nextPopKind(comModalEExames)).toBe('overlay');
    // Depois de resolver o overlay, resta só a aba.
    const soExames = flags(false, true, false);
    expect(nextPopKind(soExames)).toBe('tab');
  });
});
