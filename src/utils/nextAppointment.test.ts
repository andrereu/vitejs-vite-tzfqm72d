import { describe, it, expect } from 'vitest';
import { selecionarProximaConsulta } from './nextAppointment';
import type { AgendaConsulta } from '../types/prenatal';

function consulta(overrides: Partial<AgendaConsulta> & Pick<AgendaConsulta, 'id' | 'data' | 'status'>): AgendaConsulta {
  return {
    horario: '',
    tipo: 'Consulta Pré-Natal de Rotina',
    local: 'Consultório',
    ...overrides
  };
}

describe('selecionarProximaConsulta', () => {
  it('retorna null quando não há agenda', () => {
    expect(selecionarProximaConsulta(undefined)).toBeNull();
    expect(selecionarProximaConsulta([])).toBeNull();
  });

  it('ignora consultas canceladas', () => {
    const agenda = [consulta({ id: 'a1', data: '2026-08-20', horario: '09:00', status: 'cancelada' })];
    expect(selecionarProximaConsulta(agenda)).toBeNull();
  });

  it('ignora consultas realizadas', () => {
    const agenda = [consulta({ id: 'a1', data: '2026-08-20', horario: '09:00', status: 'realizada' })];
    expect(selecionarProximaConsulta(agenda)).toBeNull();
  });

  it('aceita consulta confirmada', () => {
    const alvo = consulta({ id: 'a1', data: '2026-08-20', horario: '09:00', status: 'confirmada' });
    expect(selecionarProximaConsulta([alvo])).toEqual(alvo);
  });

  it('aceita encaixe_urgente', () => {
    const alvo = consulta({ id: 'a1', data: '2026-08-20', horario: '09:00', status: 'encaixe_urgente' });
    expect(selecionarProximaConsulta([alvo])).toEqual(alvo);
  });

  it('solicitação sem horário nunca vira "próxima consulta"', () => {
    const agenda = [consulta({ id: 'a1', data: '2026-08-20', horario: '', status: 'solicitada', periodoPreferido: 'manha' })];
    expect(selecionarProximaConsulta(agenda)).toBeNull();
  });

  it('solicitação com horário também não vira "próxima consulta" (ainda não confirmada)', () => {
    const agenda = [consulta({ id: 'a1', data: '2026-08-20', horario: '09:00', status: 'solicitada' })];
    expect(selecionarProximaConsulta(agenda)).toBeNull();
  });

  it('escolhe a mais próxima entre várias candidatas elegíveis, ignorando as não elegíveis', () => {
    const maisProxima = consulta({ id: 'a2', data: '2026-08-20', horario: '09:00', status: 'confirmada' });
    const agenda = [
      consulta({ id: 'a1', data: '2026-08-25', horario: '10:00', status: 'confirmada' }),
      maisProxima,
      consulta({ id: 'a3', data: '2026-08-18', horario: '08:00', status: 'realizada' }),
      consulta({ id: 'a4', data: '2026-08-19', horario: '', status: 'solicitada', periodoPreferido: 'tarde' })
    ];
    expect(selecionarProximaConsulta(agenda)).toEqual(maisProxima);
  });
});
