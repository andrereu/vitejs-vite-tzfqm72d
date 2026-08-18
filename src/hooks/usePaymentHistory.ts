import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { PaymentRecord } from '../types/saas';

// Extrato de pagamentos de um médico específico — só é usado quando o admin
// abre o histórico de alguém (doctorId nulo = não carrega nada).
export function usePaymentHistory(doctorId: string | null) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  useEffect(() => {
    if (!doctorId) {
      setPayments([]);
      return;
    }
    const q = query(collection(db, 'doctors', doctorId, 'payments'), orderBy('data', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => setPayments(snapshot.docs.map((d) => d.data() as PaymentRecord)),
      (err) => console.warn('Erro ao carregar histórico de pagamentos:', err)
    );
    return () => unsubscribe();
  }, [doctorId]);

  // Usada pelo botão "Confirmar PIX" do admin (renovação manual) — grava o
  // mesmo tipo de registro que o webhook automático do Mercado Pago grava.
  const recordManualPayment = async (doctorId: string, valor: number) => {
    const now = new Date();
    const paymentId = `manual-${now.getTime()}`;
    await setDoc(doc(db, 'doctors', doctorId, 'payments', paymentId), {
      id: paymentId,
      data: now.toISOString(),
      valor,
      metodo: 'pix_manual',
      origem: 'Confirmação manual (Admin)'
    } satisfies PaymentRecord);
  };

  return { payments, recordManualPayment };
}
