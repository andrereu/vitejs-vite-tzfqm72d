import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { getAdminFirestore } from './_lib/firebaseAdmin';

// Recebe o aviso de pagamento do Mercado Pago e libera a assinatura da
// médica automaticamente — sem precisar de ninguém conferindo comprovante
// no WhatsApp. Duas camadas de segurança, para ninguém conseguir "fingir"
// um pagamento aprovado:
//   1. Confere a assinatura do aviso (garante que veio mesmo do Mercado Pago).
//   2. Ainda assim, NUNCA confia no status que vem no corpo do aviso — sempre
//      busca o pagamento de novo na API do Mercado Pago, com o token do
//      servidor, antes de liberar qualquer coisa.
function isValidSignature(req: VercelRequest, dataId: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true; // ver README: recomendado configurar, mas não bloqueia se ainda não configurou

  const signatureHeader = req.headers['x-signature'] as string | undefined;
  const requestId = req.headers['x-request-id'] as string | undefined;
  if (!signatureHeader || !requestId) return false;

  const parts: Record<string, string> = {};
  for (const part of signatureHeader.split(',')) {
    const [key, value] = part.split('=');
    if (key && value) parts[key.trim()] = value.trim();
  }
  const { ts, v1: hash } = parts;
  if (!ts || !hash) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const expectedHash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return expectedHash === hash;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Sempre responde 200 rapidamente (mesmo em erro) para o Mercado Pago não
  // ficar reenviando o mesmo aviso indefinidamente; erros ficam nos logs.
  const acknowledge = () => res.status(200).json({ received: true });

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('MERCADOPAGO_ACCESS_TOKEN não configurado.');
    return acknowledge();
  }

  const body = (req.body || {}) as any;
  const paymentId = body.data?.id || req.query.id || req.query['data.id'];

  if (!paymentId || (body.type && body.type !== 'payment')) {
    return acknowledge();
  }

  if (!isValidSignature(req, String(paymentId))) {
    console.warn('Assinatura de webhook do Mercado Pago inválida — ignorando aviso.');
    return acknowledge();
  }

  try {
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!paymentRes.ok) {
      console.error('Erro ao consultar pagamento no Mercado Pago:', await paymentRes.text());
      return acknowledge();
    }
    const payment = await paymentRes.json();

    if (payment.status === 'approved' && payment.external_reference) {
      const doctorId = payment.external_reference as string;
      const db = getAdminFirestore();
      const doctorRef = db.doc(`doctors/${doctorId}`);
      const doctorSnap = await doctorRef.get();

      if (doctorSnap.exists) {
        const doctor = doctorSnap.data() as any;
        const now = new Date();
        const currentValidade = doctor.validadeAssinatura ? new Date(doctor.validadeAssinatura) : null;
        // Se a assinatura ainda está no prazo, soma 30 dias a partir do
        // vencimento atual (renovação antecipada); senão, conta a partir de hoje.
        const base = currentValidade && currentValidade > now ? currentValidade : now;
        const novaValidade = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

        await doctorRef.set(
          {
            status: 'active',
            ultimoPagamento: now.toISOString(),
            validadeAssinatura: novaValidade.toISOString()
          },
          { merge: true }
        );
      } else {
        console.warn(`Webhook Mercado Pago: médico ${doctorId} não encontrado.`);
      }
    }

    return acknowledge();
  } catch (error: any) {
    console.error('Erro ao processar webhook do Mercado Pago:', error);
    return acknowledge();
  }
}
