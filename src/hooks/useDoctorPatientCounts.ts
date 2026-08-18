import { useEffect, useState } from 'react';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase';

// Conta as pacientes de cada médico direto no Firestore (contagem oficial do
// servidor), em vez de confiar em um número salvo dentro do próprio
// documento do médico — que só ficava correto para quem estava com a sessão
// aberta no momento, e desatualizado para todos os outros.
export function useDoctorPatientCounts(doctorIds: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  // doctorIds.join(',') evita recontar toda vez que o array de médicos é
  // recriado (o que acontece a cada render), só quando a lista muda de fato.
  const key = doctorIds.join(',');

  useEffect(() => {
    if (!key) {
      setCounts({});
      return;
    }
    let cancelled = false;

    (async () => {
      const entries = await Promise.all(
        key.split(',').map(async (doctorId) => {
          try {
            const snap = await getCountFromServer(collection(db, 'doctors', doctorId, 'patients'));
            return [doctorId, snap.data().count] as const;
          } catch (err) {
            console.warn(`Erro ao contar pacientes de ${doctorId}:`, err);
            return [doctorId, 0] as const;
          }
        })
      );
      if (!cancelled) setCounts(Object.fromEntries(entries));
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

  return counts;
}
