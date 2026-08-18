import { describe, it, expect } from 'vitest';
import { cleanPhoneNumber, generateAppointmentReminderLink, generateConsultationSummaryLink } from './whatsapp';
import type { Patient, AgendaConsulta, ConsultaEvolucao } from '../types/prenatal';

describe('cleanPhoneNumber', () => {
  it('retorna vazio quando não há telefone', () => {
    expect(cleanPhoneNumber('')).toBe('');
  });

  it('adiciona o DDI 55 quando o número não tem', () => {
    expect(cleanPhoneNumber('(41) 99999-8888')).toBe('5541999998888');
  });

  it('não duplica o DDI quando o número já vem completo', () => {
    expect(cleanPhoneNumber('5541999998888')).toBe('5541999998888');
  });
});

const basePatient: Patient = {
  id: 'p1',
  doctorId: 'doc-1',
  cpf: '123.456.789-00',
  telefone: '(41) 99999-8888',
  nome: 'Juliana Maria da Silva',
  idade: '29',
  pai: 'Lucas',
  nomeBebe: 'Arthur',
  dum: '2026-01-15',
  dpp: '2026-10-22',
  g: '1', p: '0', c: '0', a: '0',
  pesoInicial: '71',
  altura: '1.65',
  tipoSanguineo: 'A+',
  doencasPrevias: '',
  vacinas: {},
  examesTabela: {},
  consultasEvolucao: [],
  agendaConsultas: [],
  examesEnviados: []
};

describe('generateAppointmentReminderLink', () => {
  const agenda: AgendaConsulta = {
    id: 'ag-1',
    data: '2026-09-10',
    horario: '14:30',
    tipo: 'Consulta de Rotina',
    local: 'Consultório Dra. Priscila',
    status: 'confirmada'
  };

  it('gera um link do wa.me com o telefone da paciente e os dados da consulta', () => {
    const link = generateAppointmentReminderLink(basePatient, agenda);

    expect(link.startsWith('https://wa.me/5541999998888?text=')).toBe(true);

    const message = decodeURIComponent(link.split('?text=')[1]);
    expect(message).toContain('Juliana Maria da Silva');
    expect(message).toContain('10/09/2026');
    expect(message).toContain('14:30');
    expect(message).toContain('Consultório Dra. Priscila');
  });
});

describe('generateConsultationSummaryLink', () => {
  const consulta: ConsultaEvolucao = {
    id: 'c-1',
    data: '2026-04-15',
    igSem: 13,
    peso: 72.2,
    pa: '115/75',
    au: '12 cm',
    bcfMf: '152 bpm / MF-',
    edema: 'Ausente',
    conduta: 'Ecografia Morfológica solicitada.'
  };

  it('gera um link do wa.me com o resumo da evolução clínica', () => {
    const link = generateConsultationSummaryLink(basePatient, consulta);
    const message = decodeURIComponent(link.split('?text=')[1]);

    expect(message).toContain('Juliana Maria da Silva');
    expect(message).toContain('13 semanas');
    expect(message).toContain('72.2 kg');
    expect(message).toContain('Ecografia Morfológica solicitada.');
  });
});
