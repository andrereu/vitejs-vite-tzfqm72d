import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { HorarioBloqueado, UserRole } from '../types/prenatal';

// Bloqueios de agenda (folga/compromisso) de cada médico:
// "doctors/{doctorId}/blockedSlots/{blockId}" — mesma estrutura de
// subcoleção por tenant de useSecretaries.ts. Expõe addBlockedSlot/
// removeBlockedSlot (em vez de um saveBlockedSlots(lista inteira), como
// useSecretaries faz) porque ClinicScheduleManager já esperava essas duas
// funções separadas antes desta etapa — a interface foi preservada.
export function useBlockedSlots(doctorId: string, userRole: UserRole | null) {
  const [blockedSlots, setBlockedSlots] = useState<HorarioBloqueado[]>([]);

  useEffect(() => {
    if (!doctorId || (userRole !== 'medica' && userRole !== 'secretaria')) return;
    const colRef = collection(db, 'doctors', doctorId, 'blockedSlots');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => setBlockedSlots(snapshot.docs.map((d) => d.data() as HorarioBloqueado)),
      (err) => console.warn('Erro ao carregar bloqueios de agenda:', err)
    );
    return () => unsubscribe();
  }, [doctorId, userRole]);

  const addBlockedSlot = async (slot: HorarioBloqueado) => {
    await setDoc(doc(db, 'doctors', doctorId, 'blockedSlots', slot.id), slot);
  };

  const removeBlockedSlot = async (id: string) => {
    await deleteDoc(doc(db, 'doctors', doctorId, 'blockedSlots', id));
  };

  return { blockedSlots, addBlockedSlot, removeBlockedSlot };
}
