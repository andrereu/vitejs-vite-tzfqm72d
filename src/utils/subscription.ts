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

// O plano "Clínica Multi" hoje não dá acesso de múltiplas médicas na mesma
// conta (isso exigiria repensar o modelo de dados inteiro) — em vez disso,
// entrega uma equipe maior de secretárias, uma funcionalidade que já existe
// e funciona de verdade.
export const getSecretaryLimit = (doctor: DoctorTenant): number =>
  doctor.plano === 'clinica_multi' ? 5 : 1;
