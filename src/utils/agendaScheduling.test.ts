import { describe, it, expect } from 'vitest';
import { compararAgendamentos, horarioEstaBloqueado, algumBloqueioAtivo } from './agendaScheduling';
import type { HorarioBloqueado } from '../types/prenatal';

describe('compararAgendamentos', () => {
  it('ordena por data quando as datas são diferentes', () => {
    const a = { data: '2026-08-25', horario: '10:00' };
    const b = { data: '2026-08-20', horario: '09:00' };
    expect(compararAgendamentos(a, b)).toBeGreaterThan(0);
  });

  it('dentro da mesma data, ordena por horário quando ambos têm horário definido', () => {
    const a = { data: '2026-08-25', horario: '14:00' };
    const b = { data: '2026-08-25', horario: '09:00' };
    expect(compararAgendamentos(a, b)).toBeGreaterThan(0);
  });

  it('coloca quem tem horário definido antes de quem não tem (solicitação pendente)', () => {
    const comHorario = { data: '2026-08-25', horario: '09:00' };
    const semHorario = { data: '2026-08-25', horario: '' };
    expect(compararAgendamentos(comHorario, semHorario)).toBeLessThan(0);
    expect(compararAgendamentos(semHorario, comHorario)).toBeGreaterThan(0);
  });

  it('nunca gera NaN/Invalid Date mesmo com horario vazio nos dois lados', () => {
    const a = { data: '2026-08-25', horario: '', periodoPreferido: 'tarde' as const };
    const b = { data: '2026-08-25', horario: '' };
    const resultado = compararAgendamentos(a, b);
    expect(Number.isNaN(resultado)).toBe(false);
  });

  it('usa periodoPreferido como critério secundário entre solicitações sem horário', () => {
    const manha = { data: '2026-08-25', horario: '', periodoPreferido: 'manha' as const };
    const tarde = { data: '2026-08-25', horario: '', periodoPreferido: 'tarde' as const };
    expect(compararAgendamentos(manha, tarde)).toBeLessThan(0);
  });

  it('trata datas iguais e horários iguais como empate', () => {
    const a = { data: '2026-08-25', horario: '09:00' };
    const b = { data: '2026-08-25', horario: '09:00' };
    expect(compararAgendamentos(a, b)).toBe(0);
  });
});

describe('horarioEstaBloqueado', () => {
  const bloqueioDiaInteiro: HorarioBloqueado = {
    id: 'blk-1',
    data: '2026-08-25',
    diaInteiro: true,
    motivo: 'Folga'
  };

  const bloqueioParcial: HorarioBloqueado = {
    id: 'blk-2',
    data: '2026-08-25',
    diaInteiro: false,
    horarioInicio: '14:00',
    horarioFim: '18:00',
    motivo: 'Compromisso'
  };

  it('bloqueio de dia inteiro bloqueia qualquer horário naquela data', () => {
    expect(horarioEstaBloqueado('2026-08-25', '09:00', bloqueioDiaInteiro)).toBe(true);
    expect(horarioEstaBloqueado('2026-08-25', '15:00', bloqueioDiaInteiro)).toBe(true);
  });

  it('bloqueio de dia inteiro não afeta outras datas', () => {
    expect(horarioEstaBloqueado('2026-08-26', '09:00', bloqueioDiaInteiro)).toBe(false);
  });

  it('bloqueio parcial: horário antes do início está livre', () => {
    expect(horarioEstaBloqueado('2026-08-25', '13:59', bloqueioParcial)).toBe(false);
  });

  it('bloqueio parcial: início é inclusivo', () => {
    expect(horarioEstaBloqueado('2026-08-25', '14:00', bloqueioParcial)).toBe(true);
  });

  it('bloqueio parcial: horário no meio do intervalo está bloqueado', () => {
    expect(horarioEstaBloqueado('2026-08-25', '16:00', bloqueioParcial)).toBe(true);
  });

  it('bloqueio parcial: fim é exclusivo (já está livre)', () => {
    expect(horarioEstaBloqueado('2026-08-25', '18:00', bloqueioParcial)).toBe(false);
  });
});

describe('algumBloqueioAtivo', () => {
  it('retorna true quando algum bloqueio da lista cobre o horário', () => {
    const bloqueios: HorarioBloqueado[] = [
      { id: 'blk-1', data: '2026-08-20', diaInteiro: true, motivo: 'Folga' },
      { id: 'blk-2', data: '2026-08-25', diaInteiro: false, horarioInicio: '14:00', horarioFim: '18:00', motivo: 'Compromisso' }
    ];
    expect(algumBloqueioAtivo('2026-08-25', '16:00', bloqueios)).toBe(true);
    expect(algumBloqueioAtivo('2026-08-25', '09:00', bloqueios)).toBe(false);
    expect(algumBloqueioAtivo('2026-08-30', '09:00', bloqueios)).toBe(false);
  });
});
