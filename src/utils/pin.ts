// Senha de acesso da gestante ao app: um PIN numérico curto (fácil de digitar
// no celular), não uma senha forte — a proteção real vem do CPF + PIN
// combinados, verificados só no servidor (api/patient-login.ts).
export function generatePatientPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}
