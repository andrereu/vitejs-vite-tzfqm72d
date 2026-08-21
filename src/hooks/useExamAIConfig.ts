import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { ExameAIConfig } from '../types/saas';

export type ExamAIConfigStatus = 'carregando' | 'com-configuracao' | 'sem-configuracao';

// UX-05.2 — doctors/{doctorId}/config/exames: preferências de leitura da IA
// e exames adicionais. Documento próprio, separado de DoctorTenant, porque
// doctors/{doctorId} é público (landing pessoal + login Google) e uma
// instrução clínica não pode morar lá — ver firestore.rules.
//
// Três estados de propósito (nunca só um booleano "carregando"): a aba
// "Exames & IA" precisa distinguir "ainda não sei" de "sei que está vazio",
// senão um documento realmente vazio pisca como se tivesse acabado de perder
// dados que nunca existiram.
export function useExamAIConfig(doctorId: string | undefined) {
  const [config, setConfig] = useState<ExameAIConfig | null>(null);
  const [status, setStatus] = useState<ExamAIConfigStatus>('carregando');

  useEffect(() => {
    if (!doctorId) {
      setConfig(null);
      setStatus('sem-configuracao');
      return;
    }
    setStatus('carregando');
    const unsubscribe = onSnapshot(
      doc(db, 'doctors', doctorId, 'config', 'exames'),
      (snap) => {
        if (snap.exists()) {
          setConfig(snap.data() as ExameAIConfig);
          setStatus('com-configuracao');
        } else {
          setConfig(null);
          setStatus('sem-configuracao');
        }
      },
      (err) => {
        console.warn('Modo offline (preferências de IA):', err);
        setConfig(null);
        setStatus('sem-configuracao');
      }
    );
    return () => unsubscribe();
  }, [doctorId]);

  const salvarConfigExamesIA = async (updated: ExameAIConfig) => {
    if (!doctorId) return;
    await setDoc(
      doc(db, 'doctors', doctorId, 'config', 'exames'),
      { ...updated, atualizadoEm: new Date().toISOString() },
      { merge: true }
    );
  };

  return { config, status, salvarConfigExamesIA };
}
