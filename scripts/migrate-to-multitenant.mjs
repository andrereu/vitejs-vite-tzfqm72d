// Migração única do modelo antigo (um documento global com a lista de todos os
// médicos e um documento global com a lista de todas as pacientes) para o novo
// modelo multi-tenant (uma coleção "doctors", com uma subcoleção "patients" por
// médico). Veja a explicação completa em README.md.
//
// Uso:
//   1. Baixe uma chave de conta de serviço em:
//      Firebase Console > Configurações do projeto > Contas de serviço > Gerar nova chave privada
//   2. GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/chave.json node scripts/migrate-to-multitenant.mjs
//
// O script não apaga os documentos antigos — depois de conferir que os dados
// novos estão corretos, apague manualmente "prenatal/lista_pacientes" e
// "saas_config/medicos_cadastrados" no console do Firebase.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

function normalizeCpf(cpf) {
  return (cpf || '').replace(/\D/g, '');
}

function normalizeEmail(email) {
  return (email || '').toLowerCase().trim();
}

async function migrateDoctors() {
  const legacySnap = await db.doc('saas_config/medicos_cadastrados').get();
  const legacyDoctors = legacySnap.exists ? legacySnap.data().lista || [] : [];

  if (legacyDoctors.length === 0) {
    console.log('Nenhum médico encontrado em saas_config/medicos_cadastrados — nada a migrar aqui.');
    return [];
  }

  const batch = db.batch();
  for (const doctor of legacyDoctors) {
    batch.set(db.doc(`doctors/${doctor.id}`), doctor, { merge: true });
  }
  await batch.commit();
  console.log(`Migrados ${legacyDoctors.length} médico(s) para a coleção "doctors".`);
  return legacyDoctors;
}

async function migratePatients(defaultDoctorId) {
  const legacySnap = await db.doc('prenatal/lista_pacientes').get();
  const legacyPatients = legacySnap.exists ? legacySnap.data().lista || [] : [];

  if (legacyPatients.length === 0) {
    console.log('Nenhuma paciente encontrada em prenatal/lista_pacientes — nada a migrar aqui.');
    return;
  }

  let batch = db.batch();
  let count = 0;
  for (const patient of legacyPatients) {
    const doctorId = patient.doctorId || defaultDoctorId;
    if (!doctorId) {
      console.warn(`Paciente ${patient.id} sem doctorId e sem médico padrão definido — pulando.`);
      continue;
    }
    const enriched = {
      ...patient,
      doctorId,
      cpfDigits: normalizeCpf(patient.cpf),
      emailLower: normalizeEmail(patient.email)
    };
    batch.set(db.doc(`doctors/${doctorId}/patients/${patient.id}`), enriched, { merge: true });
    count++;
    // Lotes do Firestore aceitam no máximo 500 operações.
    if (count % 450 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log(`Migrados ${count} paciente(s) para as subcoleções "doctors/{doctorId}/patients".`);
}

async function main() {
  const migratedDoctors = await migrateDoctors();
  const defaultDoctorId = migratedDoctors[0]?.id || 'doc-priscila';
  await migratePatients(defaultDoctorId);
  console.log('Migração concluída. Confira os dados no console do Firebase antes de apagar os documentos antigos.');
}

main().catch((err) => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
