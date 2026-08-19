import { describe, it, expect } from 'vitest';
import {
  compararAgendamentos,
  horarioEstaBloqueado,
  algumBloqueioAtivo,
  encontrarBloqueioConflitante,
  mensagemBloqueioAgenda,
  consultasEmConflitoComBloqueio
} from './agendaScheduling';
import type { HorarioBloqueado, AgendaConsulta } from '../types/prenatal';

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

describe('encontrarBloqueioConflitante / mensagemBloqueioAgenda', () => {
  const bloqueioDiaInteiro: HorarioBloqueado = { id: 'blk-1', data: '2026-08-25', diaInteiro: true, motivo: 'Folga' };
  const bloqueioParcial: HorarioBloqueado = {
    id: 'blk-2', data: '2026-08-26', diaInteiro: false, horarioInicio: '14:00', horarioFim: '18:00', motivo: 'Compromisso'
  };

  it('encontra o bloqueio que colide e devolve undefined quando não há conflito', () => {
    expect(encontrarBloqueioConflitante('2026-08-25', '09:00', [bloqueioDiaInteiro, bloqueioParcial])).toBe(bloqueioDiaInteiro);
    expect(encontrarBloqueioConflitante('2026-08-27', '09:00', [bloqueioDiaInteiro, bloqueioParcial])).toBeUndefined();
  });

  it('usa mensagem de dia bloqueado pra bloqueio de dia inteiro', () => {
    expect(mensagemBloqueioAgenda(bloqueioDiaInteiro)).toBe('Esta data está bloqueada na agenda.');
  });

  it('usa mensagem de horário bloqueado pra bloqueio parcial', () => {
    expect(mensagemBloqueioAgenda(bloqueioParcial)).toBe('Este horário está bloqueado na agenda.');
  });
});

describe('consultasEmConflitoComBloqueio', () => {
  type ConsultaMinima = Pick<AgendaConsulta, 'data' | 'horario' | 'status'>;

  const bloqueioParcial: HorarioBloqueado = {
    id: 'blk-1', data: '2026-08-25', diaInteiro: false, horarioInicio: '14:00', horarioFim: '18:00', motivo: 'Compromisso'
  };
  const bloqueioDiaInteiro: HorarioBloqueado = { id: 'blk-2', data: '2026-08-25', diaInteiro: true, motivo: 'Folga' };

  it('1. consulta confirmada dentro do bloqueio parcial gera conflito', () => {
    const consulta: ConsultaMinima = { data: '2026-08-25', horario: '15:00', status: 'confirmada' };
    expect(consultasEmConflitoComBloqueio([consulta], bloqueioParcial)).toEqual([consulta]);
  });

  it('2. consulta exatamente no início do bloqueio gera conflito', () => {
    const consulta: ConsultaMinima = { data: '2026-08-25', horario: '14:00', status: 'confirmada' };
    expect(consultasEmConflitoComBloqueio([consulta], bloqueioParcial)).toEqual([consulta]);
  });

  it('3. consulta exatamente no fim do bloqueio não gera conflito', () => {
    const consulta: ConsultaMinima = { data: '2026-08-25', horario: '18:00', status: 'confirmada' };
    expect(consultasEmConflitoComBloqueio([consulta], bloqueioParcial)).toEqual([]);
  });

  it('4. encaixe urgente dentro do bloqueio gera conflito', () => {
    const consulta: ConsultaMinima = { data: '2026-08-25', horario: '16:00', status: 'encaixe_urgente' };
    expect(consultasEmConflitoComBloqueio([consulta], bloqueioParcial)).toEqual([consulta]);
  });

  it('5. consulta cancelada dentro do bloqueio não gera conflito', () => {
    const consulta: ConsultaMinima = { data: '2026-08-25', horario: '16:00', status: 'cancelada' };
    expect(consultasEmConflitoComBloqueio([consulta], bloqueioParcial)).toEqual([]);
  });

  it('6. consulta realizada dentro do bloqueio não gera conflito', () => {
    const consulta: ConsultaMinima = { data: '2026-08-25', horario: '16:00', status: 'realizada' };
    expect(consultasEmConflitoComBloqueio([consulta], bloqueioParcial)).toEqual([]);
  });

  it('7. solicitação sem horário não gera conflito', () => {
    const consulta: ConsultaMinima = { data: '2026-08-25', horario: '', status: 'solicitada' };
    expect(consultasEmConflitoComBloqueio([consulta], bloqueioParcial)).toEqual([]);
  });

  it('8. bloqueio de dia inteiro gera conflito com consulta confirmada em qualquer horário', () => {
    const consulta: ConsultaMinima = { data: '2026-08-25', horario: '09:00', status: 'confirmada' };
    expect(consultasEmConflitoComBloqueio([consulta], bloqueioDiaInteiro)).toEqual([consulta]);
  });

  it('9. novo bloqueio parcial sobre consulta existente é barrado (lista não-vazia)', () => {
    const consulta: ConsultaMinima = { data: '2026-08-25', horario: '15:00', status: 'confirmada' };
    const novoBloqueio: HorarioBloqueado = { id: 'blk-novo', data: '2026-08-25', diaInteiro: false, horarioInicio: '14:00', horarioFim: '18:00', motivo: 'Compromisso' };
    expect(consultasEmConflitoComBloqueio([consulta], novoBloqueio).length).toBe(1);
  });

  it('10. novo bloqueio parcial sem sobreposição é permitido (lista vazia)', () => {
    const consulta: ConsultaMinima = { data: '2026-08-25', horario: '18:00', status: 'confirmada' };
    const novoBloqueio: HorarioBloqueado = { id: 'blk-novo', data: '2026-08-25', diaInteiro: false, horarioInicio: '14:00', horarioFim: '18:00', motivo: 'Compromisso' };
    expect(consultasEmConflitoComBloqueio([consulta], novoBloqueio)).toEqual([]);
  });
});
