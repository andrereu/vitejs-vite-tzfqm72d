import type { DoctorTenant } from '../types/saas';

// Verdadeiro quando a assinatura do médico está vencida ou bloqueada — usado
// pra travar o acesso tanto da médica quanto da paciente dela, até
// regularizar. Mantido num só lugar pra não desalinhar entre as duas telas.
export const isDoctorBlocked = (doctor: DoctorTenant): boolean => {
  if (doctor.status === 'blocked' || doctor.status === 'past_due') return true;
  if (doctor.status === 'trial' && doctor.trialEndsAt) {
    return new Date(doctor.trialEndsAt) < new Date();
  }
  return false;
};
