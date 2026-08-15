export type SubscriptionPlan = 'trial' | 'individual_pro' | 'clinica_multi';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled';

export interface DoctorTenant {
  id: string;
  nome: string;
  email: string;
  crm: string;
  telefone: string;
  clinicaNome?: string;
  especialidade?: string;
  logoUrl?: string; // Logo em Base64 ou URL
  enderecoConsultorio?: string;
  whatsappPadraoMensagem?: string;
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
export interface ClinicSecretary {
  id: string;
  nome: string;
  email: string;
  senhaHash?: string;
  doctorId: string; // ID do médico ou clínica ao qual está vinculada
  clinicaNome: string;
  ativo: boolean;
}

export interface SaaSMetrics {
  mrr: number;
  totalMedicos: number;
  medicosAtivos: number;
  trialsEmCurso: number;
  totalGestantes: number;
}
