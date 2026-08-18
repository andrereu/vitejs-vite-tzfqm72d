export type SubscriptionPlan = 'trial' | 'individual_pro' | 'clinica_multi';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled';

export interface SaasGlobalConfig {
  pixKey: string;
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';
  suporteWhatsapp: string; // Ex: '5541999999999'
  nomeRecebedor: string;
}

export interface TwoFactorConfig {
  enabled: boolean;
  method: 'whatsapp' | 'authenticator';
  secret?: string;       // Chave TOTP para Google Authenticator
  whatsappPhone?: string; // Número para envio do código
}
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
   // Configuração de Segurança A2F
  twoFactor?: TwoFactorConfig;
  
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
  twoFactor?: TwoFactorConfig;
}


// Um registro por pagamento recebido — extrato de cada médico, guardado em
// doctors/{doctorId}/payments/{id}. Diferente de "ultimoPagamento" (só o
// último), isso é o histórico completo.
export interface PaymentRecord {
  id: string;
  data: string; // ISO
  valor: number;
  metodo: 'pix_manual' | 'mercadopago';
  origem: string; // Ex: "Confirmação manual (Admin)" ou "Mercado Pago (Pix/Cartão)"
  mpPaymentId?: string; // ID do pagamento no Mercado Pago, quando aplicável
}

export interface SaaSMetrics {
  mrr: number;
  totalMedicos: number;
  medicosAtivos: number;
  trialsEmCurso: number;
  totalGestantes: number;
}
