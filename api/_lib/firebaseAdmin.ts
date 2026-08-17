import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Inicializa o Firebase Admin uma única vez por instância da função (Vercel
// reaproveita containers "quentes" entre chamadas). Usa uma conta de serviço,
// que tem acesso total ao Firestore e ignora as regras de segurança — por
// isso só deve ser usada em código de servidor, nunca no navegador.
export function getAdminFirestore() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
      })
    });
  }
  return getFirestore();
}
