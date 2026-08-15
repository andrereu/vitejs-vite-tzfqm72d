import React, { useState } from 'react';
import { Sparkles, X, CheckCircle2, Lock } from 'lucide-react';
import { DoctorTenant } from '../types/saas';

interface DoctorTrialSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDoctor: DoctorTenant) => Promise<void> | void;
}

export const DoctorTrialSignupModal: React.FC<DoctorTrialSignupModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [nome, setNome] = useState('');
  const [crm, setCrm] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [clinicaNome, setClinicaNome] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const novoDoctorTrial: DoctorTenant = {
      id: `doc-trial-${Date.now()}`,
      nome: nome.trim(),
      email: email.toLowerCase().trim(),
      crm: crm.trim(),
      telefone: telefone.trim(),
      clinicaNome: clinicaNome.trim() || `Consultório ${nome}`,
      especialidade: 'Ginecologia & Obstetrícia',
      plano: 'individual_pro',
      status: 'trialing',
      trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      diasRestantes: 14,
      totalPacientes: 0,
      dataCadastro: new Date().toISOString().split('T')[0],
      valorMensalidade: 89.0,
      metodoPagamento: 'pix'
    };

    await onSuccess(novoDoctorTrial);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 text-gray-800">
        
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Teste Grátis de 14 Dias</h3>
              <p className="text-[11px] text-gray-500">Sem necessidade de cartão de crédito</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Nome Completo do Médico *</label>
            <input
              type="text"
              required
              placeholder="Ex: Dra. Camila Rodrigues"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">CRM com UF *</label>
              <input
                type="text"
                required
                placeholder="Ex: 34567-PR"
                value={crm}
                onChange={(e) => setCrm(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">WhatsApp *</label>
              <input
                type="text"
                required
                placeholder="(41) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">E-mail Profissional *</label>
            <input
              type="email"
              required
              placeholder="dra.camila@clinica.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border rounded-xl"
            />
          </div>

          <div>
            <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Nome do Consultório / Clínica (Opcional)</label>
            <input
              type="text"
              placeholder="Ex: Espaço Materno"
              value={clinicaNome}
              onChange={(e) => setClinicaNome(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border rounded-xl"
            />
          </div>

          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-2 text-[11px] text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Acesso completo liberado na hora com IA e Prontuários ilimitados.</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#2E482A] hover:bg-[#233820] text-white rounded-xl font-bold shadow-md cursor-pointer transition-all mt-2"
          >
            {isSubmitting ? 'Liberando Acesso...' : 'Ativar Meu Teste Grátis de 14 Dias'}
          </button>
        </form>
      </div>
    </div>
  );
};
