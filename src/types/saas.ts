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
  slug?: string; // Ex: "drapriscila" -> maternaia.com.br/drapriscila
  nome: string;
  email: string;
  crm: string;
  telefone: string;
  clinicaNome: string;
  especialidade: string;
  enderecoConsultorio: string;
  logoUrl?: string;
  corPrimaria?: string; // Hex (#2E482A). Tema por médica — sem isso, usa o verde padrão do index.css
  instagram?: string; // Ex: "drapriscila" (sem @) -> exibido como botão de cross-promote na landing
  plano: 'individual_pro' | 'clinica_multi';
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

// UX-05.2 — preferências de leitura da IA e exames adicionais, um documento
// próprio (doctors/{doctorId}/config/exames), SEPARADO de DoctorTenant de
// propósito: doctors/{doctorId} é público (allow read: if true, usado pela
// landing pessoal e pelo login com Google) — uma instrução clínica da médica
// nunca pode morar nesse documento. Ver firestore.rules para a regra
// restrita própria deste caminho.
export type ModalidadeExame = 'ecografia' | 'laboratorial' | 'outros';

export interface ExameAdicional {
  id: string;
  nome: string;
  categoria: 'Ecografia' | 'Laboratorial' | 'Outro';
  sinonimos: string[];
}

export interface ExameAIConfig {
  // Um texto por modalidade — nunca misturado com sinônimos de examesAdicionais
  // (reconhecimento de nome é uma responsabilidade; instrução de leitura da
  // IA é outra, mesmo quando os dois campos moram no mesmo documento).
  instrucoesPorModalidade?: Partial<Record<ModalidadeExame, string>>;
  examesAdicionais?: ExameAdicional[];
  atualizadoEm?: string; // ISO
}

export interface SaaSMetrics {
  mrr: number;
  totalMedicos: number;
  medicosAtivos: number;
  trialsEmCurso: number;
  totalGestantes: number;
}
