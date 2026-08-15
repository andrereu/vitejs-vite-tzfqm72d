import { UserRole } from '../types/prenatal';

export interface RolePermissions {
  canViewClinicalHistory: boolean;   // Anamnese, GPCA, Doenças prévias
  canViewExamReports: boolean;       // Laudos completos e imagens
  canUseMedicalAI: boolean;          // Chat e Leitor de Laudos Gemini
  canManageSchedule: boolean;        // Confirmar, criar encaixes, bloquear horários
  canManageBasicPatientData: boolean;// Nome, Telefone, CPF, DPP
  canEditMedicalRecords: boolean;    // Prescrições e evolução clínica
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  medica: {
    canViewClinicalHistory: true,
    canViewExamReports: true,
    canUseMedicalAI: true,
    canManageSchedule: true,
    canManageBasicPatientData: true,
    canEditMedicalRecords: true,
  },
  secretaria: {
    canViewClinicalHistory: false,   // LGPD: Sem acesso a histórico médico sensível
    canViewExamReports: false,       // LGPD: Sem acesso a laudos clínicos
    canUseMedicalAI: false,          // LGPD: Chat restrito ao médico/mãe
    canManageSchedule: true,         // Acesso total à gestão da agenda
    canManageBasicPatientData: true, // Contato, agendamento e CPF
    canEditMedicalRecords: false,    // Não edita conduta médica
  },
  paciente: {
    canViewClinicalHistory: true,
    canViewExamReports: true,
    canUseMedicalAI: true,
    canManageSchedule: false,        // Apenas solicita pré-agendamento
    canManageBasicPatientData: false,
    canEditMedicalRecords: false,
  },
  master_admin: {
    canViewClinicalHistory: false,
    canViewExamReports: false,
    canUseMedicalAI: false,
    canManageSchedule: false,
    canManageBasicPatientData: false,
    canEditMedicalRecords: false,
  },
};

export const hasPermission = (
  role: UserRole | null,
  permission: keyof RolePermissions
): boolean => {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
};
