import { describe, it, expect } from 'vitest';
import { hasPermission } from './rbac';

describe('hasPermission', () => {
  it('médica tem acesso a tudo, inclusive configurações do consultório', () => {
    expect(hasPermission('medica', 'canManageSchedule')).toBe(true);
    expect(hasPermission('medica', 'canViewClinicalHistory')).toBe(true);
    expect(hasPermission('medica', 'canEditDoctorSettings')).toBe(true);
  });

  it('secretária só acessa agenda, financeiro e cadastro básico', () => {
    expect(hasPermission('secretaria', 'canManageSchedule')).toBe(true);
    expect(hasPermission('secretaria', 'canManageFinancial')).toBe(true);
    expect(hasPermission('secretaria', 'canManageBasicPatientData')).toBe(true);

    // Não deve enxergar prontuário clínico nem configurações do consultório.
    expect(hasPermission('secretaria', 'canViewClinicalHistory')).toBe(false);
    expect(hasPermission('secretaria', 'canEditDoctorSettings')).toBe(false);
  });

  it('paciente só consegue mexer na própria agenda', () => {
    expect(hasPermission('paciente', 'canManageSchedule')).toBe(true);
    expect(hasPermission('paciente', 'canViewClinicalHistory')).toBe(false);
    expect(hasPermission('paciente', 'canManageFinancial')).toBe(false);
  });

  it('sem papel definido (ainda não logou), nunca libera nada', () => {
    expect(hasPermission(null, 'canManageSchedule')).toBe(false);
  });

  it('master_admin tem o mesmo acesso total de uma médica', () => {
    expect(hasPermission('master_admin', 'canEditDoctorSettings')).toBe(true);
    expect(hasPermission('master_admin', 'canViewClinicalHistory')).toBe(true);
  });
});
