import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { ClinicSecretary } from '../types/saas';
import type { UserRole } from '../types/prenatal';

// Equipe (secretárias) de cada médico: "doctors/{doctorId}/secretaries/{email}".
// O ID do documento é o e-mail da secretária para permitir checagem rápida de
// permissão nas regras do Firestore (exists() em vez de uma query).
export function useSecretaries(doctorId: string, userRole: UserRole | null) {
  const [secretaries, setSecretaries] = useState<ClinicSecretary[]>([]);

  useEffect(() => {
    if (!doctorId || (userRole !== 'medica' && userRole !== 'secretaria')) return;
    const colRef = collection(db, 'doctors', doctorId, 'secretaries');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => setSecretaries(snapshot.docs.map((d) => d.data() as ClinicSecretary)),
      (err) => console.warn('Erro ao carregar secretárias:', err)
    );
    return () => unsubscribe();
  }, [doctorId, userRole]);

  const saveSecretaries = async (updatedSecs: ClinicSecretary[]) => {
    const previous = secretaries;
    setSecretaries(updatedSecs);
    try {
      const prevMap = new Map(previous.map((s) => [s.id, s]));
      const nextIds = new Set(updatedSecs.map((s) => s.id));
      await Promise.all([
        ...updatedSecs
          .filter((s) => prevMap.get(s.id) !== s)
          .map((s) => setDoc(doc(db, 'doctors', doctorId, 'secretaries', s.email), s, { merge: true })),
        ...previous
          .filter((s) => !nextIds.has(s.id))
          .map((s) => deleteDoc(doc(db, 'doctors', doctorId, 'secretaries', s.email)))
      ]);
    } catch (err) {
      console.error('Erro ao salvar secretárias:', err);
    }
  };

  return { secretaries, saveSecretaries };
}
