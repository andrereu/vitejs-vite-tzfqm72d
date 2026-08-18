import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Patient, UserRole } from '../types/prenatal';
import { initialPatientsList } from '../types/prenatal';

interface UsePatientsOptions {
  doctorId: string;
  userRole: UserRole | null;
  selectedPatientDoctorId: string | null;
  selectedPatientId: string;
}

// Pacientes de cada médico ficam em "doctors/{doctorId}/patients/{patientId}" —
// uma subcoleção isolada por tenant, em vez de uma lista global compartilhada por
// todos os médicos (o que vazava dados entre clínicas diferentes).
export function usePatients({ doctorId, userRole, selectedPatientDoctorId, selectedPatientId }: UsePatientsOptions) {
  const [patients, setPatients] = useState<Patient[]>(initialPatientsList);

  useEffect(() => {
    if (!doctorId || (userRole !== 'medica' && userRole !== 'secretaria')) return;
    try {
      const colRef = collection(db, 'doctors', doctorId, 'patients');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => setPatients(snapshot.docs.map((d) => d.data() as Patient)),
        (err) => console.warn('Modo offline:', err)
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn('Modo offline:', err);
    }
  }, [doctorId, userRole]);

  // Sessão de paciente: assina só o próprio documento (não a subcoleção inteira).
  useEffect(() => {
    if (userRole !== 'paciente' || !selectedPatientDoctorId || !selectedPatientId) return;
    const ref = doc(db, 'doctors', selectedPatientDoctorId, 'patients', selectedPatientId);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (snapshot.exists()) setPatients([snapshot.data() as Patient]);
      },
      (err) => console.warn('Modo offline:', err)
    );
    return () => unsubscribe();
  }, [userRole, selectedPatientDoctorId, selectedPatientId]);

  // Mesma assinatura de sempre (recebe a lista inteira do médico atual), mas por
  // dentro só grava/apaga os pacientes que de fato mudaram, em documentos
  // individuais dentro de "doctors/{doctorId}/patients/{patientId}".
  const saveToFirestore = async (updatedList: Patient[]) => {
    const previous = patients;
    setPatients(updatedList);
    try {
      const prevMap = new Map(previous.map((p) => [p.id, p]));
      const nextIds = new Set(updatedList.map((p) => p.id));

      const writes = updatedList
        .filter((p) => prevMap.get(p.id) !== p)
        .map((p) => {
          const pDoctorId = p.doctorId || doctorId;
          const cpfDigits = (p.cpf || '').replace(/\D/g, '');
          const emailLower = (p.email || '').toLowerCase().trim();
          return setDoc(doc(db, 'doctors', pDoctorId, 'patients', p.id), { ...p, doctorId: pDoctorId, cpfDigits, emailLower }, { merge: true });
        });

      const deletes = previous
        .filter((p) => !nextIds.has(p.id))
        .map((p) => deleteDoc(doc(db, 'doctors', p.doctorId || doctorId, 'patients', p.id)));

      await Promise.all([...writes, ...deletes]);
    } catch (err) {
      console.error('Erro ao salvar no Firestore:', err);
    }
  };

  return { patients, setPatients, saveToFirestore };
}
