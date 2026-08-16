export type SubscriptionPlan = 'trial' | 'individual_pro' | 'clinica_multi';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled';

export interface DoctorTenant {
  id: string;
  nome: string;
  email: string;
  crm: string;
  telefone: string;
  clinicaNome: string;
  especialidade: string;
  enderecoConsultorio: string;
  logoUrl?: string;
  plano: 'individual_pro' | 'clinica_multi';
  status: 'active' | 'trial' | 'past_due' | 'blocked';
  trialEndsAt: string;
  diasRestantes?: number;
  totalPacientes: number;
  dataCadastro: string;
  valorMensalidade: number;
  metodoPagamento?: 'pix' | 'cartao';
  customDomain?: string;
  slug?: string;
  ultimoPagamento?: string;
  validadeAssinatura?: string;
}

export interface ClinicSecretary {
  id: string;
  doctorId: string;
  nome: string;
  email: string;
  telefone?: string;
  status: 'active' | 'inactive';
  criadoEm: string;
}


export interface SaaSMetrics {
  mrr: number;
  totalMedicos: number;
  medicosAtivos: number;
  trialsEmCurso: number;
  totalGestantes: number;
}
