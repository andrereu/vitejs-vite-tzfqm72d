import React, { useMemo } from 'react';
import { Send, CheckCircle2, BellRing } from 'lucide-react';
import type { Patient } from '../types/prenatal';
import { generateAppointmentReminderLink } from '../utils/whatsapp';

interface DoctorRemindersTabProps {
  patients: Patient[];
  saveToFirestore: (updatedList: Patient[]) => Promise<void>;
}

// Toda consulta confirmada de amanhã, com o link do WhatsApp já pronto —
// antes, a médica/secretária tinha que abrir paciente por paciente e achar
// a consulta certa pra lembrar. Não manda a mensagem sozinho (isso exigiria
// uma API paga do WhatsApp Business), mas tira o trabalho de garimpar quem
// precisa de lembrete no dia.
export const DoctorRemindersTab: React.FC<DoctorRemindersTabProps> = ({ patients, saveToFirestore }) => {
  const amanha = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const amanhaLabel = useMemo(
    () => new Date(`${amanha}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }),
    [amanha]
  );

  const lembretes = useMemo(() => {
    const items: { patient: Patient; agendaId: string; horario: string; tipo: string; local: string; lembreteEnviadoEm?: string }[] = [];
    for (const p of patients) {
      for (const ag of p.agendaConsultas || []) {
        if (ag.data === amanha && (ag.status === 'confirmada' || ag.status === 'encaixe_urgente')) {
          items.push({ patient: p, agendaId: ag.id, horario: ag.horario, tipo: ag.tipo, local: ag.local, lembreteEnviadoEm: ag.lembreteEnviadoEm });
        }
      }
    }
    return items.sort((a, b) => a.horario.localeCompare(b.horario));
  }, [patients, amanha]);

  const marcarComoEnviado = async (patientId: string, agendaId: string) => {
    const updated = patients.map((p) => {
      if (p.id !== patientId) return p;
      return {
        ...p,
        agendaConsultas: (p.agendaConsultas || []).map((ag) =>
          ag.id === agendaId ? { ...ag, lembreteEnviadoEm: new Date().toISOString() } : ag
        )
      };
    });
    await saveToFirestore(updated);
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5 border-b pb-3">
        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
          <BellRing className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-base">Lembretes de Amanhã</h3>
          <p className="text-xs text-gray-500 capitalize">{amanhaLabel} • {lembretes.length} consulta(s) confirmada(s)</p>
        </div>
      </div>

      {lembretes.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-xs bg-gray-50 rounded-2xl border border-dashed">
          Nenhuma consulta confirmada para amanhã.
        </div>
      ) : (
        <div className="space-y-2.5">
          {lembretes.map((item) => {
            const nextAppointment = item.patient.agendaConsultas!.find((a) => a.id === item.agendaId)!;
            const jaEnviado = !!item.lembreteEnviadoEm;
            const semWhatsapp = !item.patient.telefone;

            return (
              <div
                key={`${item.patient.id}-${item.agendaId}`}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border ${
                  jaEnviado ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tabular-nums">{item.horario}</span>
                  <strong className="text-sm text-gray-900 block">{item.patient.nome}</strong>
                  <span className="text-xs text-gray-500">{item.tipo} • {item.local}</span>
                  {jaEnviado && (
                    <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Lembrete enviado às {new Date(item.lembreteEnviadoEm!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                {semWhatsapp ? (
                  <span className="text-[11px] text-gray-400 italic shrink-0">Sem WhatsApp cadastrado</span>
                ) : (
                  <a
                    href={generateAppointmentReminderLink(item.patient, nextAppointment)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => marcarComoEnviado(item.patient.id, item.agendaId)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-all ${
                      jaEnviado ? 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)]'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" /> {jaEnviado ? 'Reenviar' : 'Enviar Lembrete'}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
