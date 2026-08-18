import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatDateDisplay, formatDateBR, calculateWeeksAndDays } from './formatters';

describe('formatDateDisplay', () => {
  it('retorna vazio quando não há data', () => {
    expect(formatDateDisplay('')).toBe('');
  });

  it('converte AAAA-MM-DD para DD/MM', () => {
    expect(formatDateDisplay('2026-03-15')).toBe('15/03');
  });

  it('devolve a string original se não tiver o formato esperado', () => {
    expect(formatDateDisplay('15/03/2026')).toBe('15/03/2026');
  });
});

describe('formatDateBR', () => {
  it('retorna vazio quando não há data', () => {
    expect(formatDateBR('')).toBe('');
  });

  it('converte AAAA-MM-DD para DD/MM/AAAA', () => {
    expect(formatDateBR('2026-03-15')).toBe('15/03/2026');
  });

  it('devolve a string original se não tiver o formato esperado', () => {
    expect(formatDateBR('15/03/2026')).toBe('15/03/2026');
  });
});

describe('calculateWeeksAndDays', () => {
  beforeEach(() => {
    // Fixa a data de "hoje" para o teste não depender do dia em que roda
    // (UTC explícito, para o resultado não variar com o fuso da máquina).
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retorna zero quando não há DUM', () => {
    expect(calculateWeeksAndDays('')).toEqual({ weeks: 0, days: 0 });
  });

  it('calcula semanas e dias completos a partir da DUM', () => {
    // 2026-06-01 menos 70 dias (10 semanas exatas) = 2026-03-23
    expect(calculateWeeksAndDays('2026-03-23')).toEqual({ weeks: 10, days: 0 });
  });

  it('calcula dias restantes que não completam uma semana', () => {
    // 2026-06-01 menos 73 dias = 10 semanas e 3 dias
    expect(calculateWeeksAndDays('2026-03-20')).toEqual({ weeks: 10, days: 3 });
  });

  it('nunca retorna semanas negativas quando a DUM está no futuro', () => {
    expect(calculateWeeksAndDays('2026-12-25')).toEqual({ weeks: 0, days: 0 });
  });
});
