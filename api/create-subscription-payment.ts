import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAdminFirestore } from './_lib/firebaseAdmin.js';

// Cria um link de pagamento (Mercado Pago Checkout Pro, aceita Pix e cartão)
// para a assinatura de um médico/clínica. O valor é lido do próprio Firestore
// no servidor — nunca confiamos em um valor vindo do navegador, senão
// qualquer pessoa poderia forjar uma requisição pedindo pra pagar R$ 1.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(500).json({ error: 'MERCADOPAGO_ACCESS_TOKEN não configurado no servidor.' });
  }

  const { doctorId } = req.body || {};
  if (!doctorId) {
    return res.status(400).json({ error: 'doctorId não informado.' });
  }

  try {
    const db = getAdminFirestore();
    const doctorSnap = await db.doc(`doctors/${doctorId}`).get();
    if (!doctorSnap.exists) {
      return res.status(404).json({ error: 'Médico não encontrado.' });
    }
    const doctor = doctorSnap.data() as any;

    const valor = Number(doctor.valorMensalidade) || (doctor.plano === 'clinica_multi' ? 179 : 89);
    const origin = (req.headers.origin as string) || `https://${req.headers.host}`;

    const preference = {
      items: [
        {
          title: `Assinatura MaternaIA - ${doctor.plano === 'clinica_multi' ? 'Clínica Multi' : 'Individual Pro'}`,
          quantity: 1,
          unit_price: valor,
          currency_id: 'BRL'
        }
      ],
      payer: doctor.email ? { email: doctor.email } : undefined,
      external_reference: doctorId,
      back_urls: {
        success: `${origin}/?pagamento=sucesso`,
        pending: `${origin}/?pagamento=pendente`,
        failure: `${origin}/?pagamento=falha`
      },
      auto_return: 'approved',
      notification_url: `${origin}/api/mercadopago-webhook`
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(preference)
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Erro ao criar preferência Mercado Pago:', data);
      return res.status(502).json({ error: 'Não foi possível iniciar o pagamento.' });
    }

    return res.status(200).json({ checkoutUrl: data.init_point });
  } catch (error: any) {
    console.error('Erro ao criar pagamento:', error);
    return res.status(500).json({ error: error?.message || 'Falha ao iniciar pagamento.' });
  }
}
