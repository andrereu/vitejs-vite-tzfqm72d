import type { Patient } from '../types/prenatal';

// Direito de acesso/portabilidade (LGPD): baixa o prontuário inteiro da
// paciente num arquivo que ela pode guardar ou levar pra outro serviço —
// tudo no navegador, sem passar por nenhum servidor.
export function downloadPatientData(patient: Patient) {
  const blob = new Blob([JSON.stringify(patient, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const nomeArquivo = (patient.nome || 'gestante').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const link = document.createElement('a');
  link.href = url;
  link.download = `dados-maternaia-${nomeArquivo}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
