export type SubscriptionPlan = 'trial' | 'individual_pro' | 'clinica_multi';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled';

export interface DoctorTenant {
  id: string;
  nome: string;
  email: string;
  crm: string;
  telefone: string;
  clinicaNome?: string;
  plano: SubscriptionPlan;
  status: SubscriptionStatus;
  trialEndsAt: string;
  diasRestantes: number;
  totalPacientes: number;
  dataCadastro: string;
  valorMensalidade: number;
  metodoPagamento?: 'pix' | 'cartao' | 'boleto';
  subdomainOrSlug?: string;
}

export interface SaaSMetrics {
  mrr: number;
  totalMedicos: number;
  medicosAtivos: number;
  trialsEmCurso: number;
  totalGestantes: number;
}
