import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { getAdminFirestore } from './_lib/firebaseAdmin.js';

// Login da gestante por CPF + PIN. Roda no servidor (nunca no navegador) para
// que a senha só seja conferida aqui, com o Admin SDK — o app nunca lê o
// prontuário da paciente antes desta checagem passar.
//
// Se CPF e PIN baterem, emitimos um "custom token" do Firebase Auth com o uid
// igual ao id da paciente e claims (doctorId, patientId, role) — é esse token
// que as regras do Firestore (firestore.rules) usam depois para liberar a
// leitura/escrita só do próprio prontuário dela.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { cpf, senha } = (req.body || {}) as { cpf?: string; senha?: string };
  const cpfDigits = String(cpf || '').replace(/\D/g, '');
  const senhaTrim = String(senha || '').trim();

  if (!cpfDigits || !senhaTrim) {
    return res.status(400).json({ error: 'Informe CPF e senha.' });
  }

  try {
    const db = getAdminFirestore();
    const snap = await db.collectionGroup('patients').where('cpfDigits', '==', cpfDigits).limit(1).get();

    // Mensagem genérica em ambos os casos (CPF não existe ou senha errada) —
    // não dá pra alguém descobrir, por tentativa e erro, quais CPFs estão
    // cadastrados no sistema.
    if (snap.empty) {
      return res.status(401).json({ error: 'CPF ou senha inválidos.' });
    }

    const patientDoc = snap.docs[0];
    const patientData = patientDoc.data() as { senhaAcc?: string };

    if (!patientData.senhaAcc || patientData.senhaAcc !== senhaTrim) {
      return res.status(401).json({ error: 'CPF ou senha inválidos.' });
    }

    const patientId = patientDoc.id;
    const doctorId = patientDoc.ref.parent.parent!.id;

    const token = await getAuth().createCustomToken(patientId, {
      role: 'paciente',
      doctorId,
      patientId
    });

    return res.status(200).json({ token, doctorId, patientId });
  } catch (error: any) {
    console.error('Erro no login da paciente:', error);
    return res.status(500).json({ error: 'Erro ao entrar. Tente novamente em instantes.' });
  }
}
