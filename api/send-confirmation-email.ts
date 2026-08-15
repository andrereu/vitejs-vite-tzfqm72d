import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { patientName, patientEmail, doctorName, date, time, appointmentType, clinicAddress } = req.body;

  if (!patientEmail) {
    return res.status(400).json({ error: 'E-mail da paciente não fornecido' });
  }

  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      // Retorna sucesso em desenvolvimento caso a chave ainda não tenha sido configurada
      return res.status(200).json({ success: true, simulated: true });
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; background-color: #ffffff;">
        <div style="text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px;">
          <h2 style="color: #2E482A; margin: 0;">Consulta Confirmada! ✨</h2>
          <p style="font-size: 12px; color: #64748B; margin: 4px 0 0;">Plataforma de Pré-Natal MaternaIA</p>
        </div>

        <div style="padding: 20px 0;">
          <p style="font-size: 14px;">Olá, <strong>${patientName}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.5;">Sua consulta pré-natal com <strong>${doctorName}</strong> foi confirmada pela nossa recepção.</p>

          <div style="background-color: #F4F6F2; border: 1px solid #CBD5E1; border-radius: 12px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0; font-size: 13px;">📅 <strong>Data:</strong> ${date}</p>
            <p style="margin: 4px 0; font-size: 13px;">⏰ <strong>Horário:</strong> ${time}</p>
            <p style="margin: 4px 0; font-size: 13px;">🩺 <strong>Tipo:</strong> ${appointmentType}</p>
            <p style="margin: 4px 0; font-size: 13px;">📍 <strong>Local:</strong> ${clinicAddress}</p>
          </div>

          <p style="font-size: 12px; color: #64748B;">Lembre-se de levar seus exames recentes e sua carteirinha digital aberta no celular.</p>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 11px; color: #94A3B8;">
          <p style="margin: 0;">MaternaIA • Cuidado Inteligente da Gestação</p>
        </div>
      </div>
    `;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'MaternaIA <atendimento@maternaia.com.br>',
        to: [patientEmail],
        subject: `Consulta Confirmada para ${date} - ${doctorName}`,
        html: emailHtml,
      }),
    });

    const data = await resendRes.json();
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Erro ao enviar e-mail:', error);
    return res.status(500).json({ error: error.message });
  }
}
