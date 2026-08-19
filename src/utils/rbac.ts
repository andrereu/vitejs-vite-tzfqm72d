import type { UserRole } from '../types/prenatal';

export type Permission = 
  | 'canManageSchedule'           // Agendamentos, lembretes, confirmar horários
  | 'canManageFinancial'          // Lançar pagamentos, convênios, dar baixa
  | 'canManageBasicPatientData'   // Cadastrar nova gestante (nome, CPF, telefone)
  | 'canViewClinicalHistory'      // Prontuário, anamnese, GPCA, evolução médica
  | 'canViewExamReports'          // Exames laboratoriais, laudos e ecografias
  | 'canUseMedicalAI'             // Chatbot clínico obstétrico
  | 'canEditDoctorSettings';      // Configurações do consultório, equipe e logo

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Obstetra / Médico(a): Acesso total a tudo
  medica: [
    'canManageSchedule',
    'canManageFinancial',
    'canManageBasicPatientData',
    'canViewClinicalHistory',
    'canViewExamReports',
    'canUseMedicalAI',
    'canEditDoctorSettings'
  ],
  // Secretária / Recepção: Acesso estrito a Agendas, Financeiro e Cadastro Básico
  secretaria: [
    'canManageSchedule',
    'canManageFinancial',
    'canManageBasicPatientData'
  ],
  // Gestante / Paciente: Acesso de visualização pessoal da sua carteirinha
  // (as abas de edição dentro de cada tela continuam travadas só pra médica,
  // então dar essas permissões de "ver" aqui não abre nenhum botão de editar).
  paciente: [
    'canManageSchedule',
    'canViewClinicalHistory',
    'canViewExamReports',
    'canUseMedicalAI'
  ],
  // Super Admin: mesmo acesso total de uma médica (hoje o app sempre usa o
  // papel 'medica' para o Super Admin, mas o tipo UserRole também permite
  // 'master_admin' — sem essa entrada, hasPermission() falhava silenciosamente
  // para esse papel).
  master_admin: [
    'canManageSchedule',
    'canManageFinancial',
    'canManageBasicPatientData',
    'canViewClinicalHistory',
    'canViewExamReports',
    'canUseMedicalAI',
    'canEditDoctorSettings'
  ]
};

export const hasPermission = (role: UserRole | null, permission: Permission): boolean => {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
};
