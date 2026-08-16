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
  limiteMedicos?: number; // 1 para individual, 5 para multi
  status: 'active' | 'trial' | 'past_due' | 'blocked';
  trialEndsAt: string;
  totalPacientes: number;
  dataCadastro: string;
  valorMensalidade: number;
  
  // Módulos Opcionais / Add-ons
  customDomainEnabled?: boolean; // Domínio Próprio ativo (+R$49)
  customDomain?: string;        // ex: 'drapriscila.com.br'
  autoWhatsappEnabled?: boolean;// WhatsApp automático (+R$39)
  extraDoctorsCount?: number;   // Quantidade de médicos extras (+R$29 cada)
  
  // Financeiro PIX
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
