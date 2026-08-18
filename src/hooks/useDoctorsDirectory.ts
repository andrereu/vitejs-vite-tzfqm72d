import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { DoctorTenant } from '../types/saas';

const INITIAL_DEMO_DOCTOR: DoctorTenant = {
  id: 'doc-priscila',
  nome: 'Dra. Priscila Gapski',
  email: 'dra.priscila@maternaia.com.br',
  crm: '24734-PR',
  telefone: '(41) 99999-8888',
  clinicaNome: 'Consultório Dra. Priscila Gapski',
  especialidade: 'Ginecologia & Obstetrícia',
  enderecoConsultorio: 'Curitiba - PR',
  plano: 'individual_pro',
  status: 'active',
  trialEndsAt: '2027-12-31',
  totalPacientes: 1,
  dataCadastro: '2026-01-01',
  valorMensalidade: 89.0
};

// Diretório de médicos/clínicas (tenants). Cada médico é um documento próprio em
// "doctors/{doctorId}" — não um array único, para não estourar o limite de 1MB
// do Firestore e para permitir regras de segurança por tenant.
export function useDoctorsDirectory() {
  const [saasDoctors, setSaasDoctors] = useState<DoctorTenant[]>([]);

  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(
        collection(db, 'doctors'),
        (snapshot) => {
          if (snapshot.empty) {
            setDoc(doc(db, 'doctors', INITIAL_DEMO_DOCTOR.id), INITIAL_DEMO_DOCTOR).catch(console.error);
            return;
          }
          setSaasDoctors(snapshot.docs.map((d) => d.data() as DoctorTenant));
        },
        (err) => console.warn('Modo offline SaaS:', err)
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn('Modo offline SaaS:', err);
    }
  }, []);

  // Mantém a assinatura de sempre (recebe a lista inteira), mas por dentro só
  // grava os documentos de médico que realmente mudaram.
  const saveSaasDoctorsToFirestore = async (updatedList: DoctorTenant[]) => {
    const previous = saasDoctors;
    setSaasDoctors(updatedList);
    try {
      const prevMap = new Map(previous.map((d) => [d.id, d]));
      await Promise.all(
        updatedList
          .filter((d) => prevMap.get(d.id) !== d)
          .map((d) => setDoc(doc(db, 'doctors', d.id), d, { merge: true }))
      );
    } catch (err) {
      console.error('Erro ao salvar médicos no Firestore:', err);
    }
  };

  return { saasDoctors, saveSaasDoctorsToFirestore };
}
