import React, { useState } from 'react';
import { ShieldAlert, QrCode, Copy, Check, Clock, MessageSquare, ArrowRight } from 'lucide-react';
import { DoctorTenant } from '../types/saas';

interface SubscriptionPaywallProps {
  doctor: DoctorTenant;
  pixKey: string;
  onRefreshStatus?: () => void;
}

export const SubscriptionPaywall: React.FC<SubscriptionPaywallProps> = ({
  doctor,
  pixKey,
  onRefreshStatus
}) => {
  const [copied, setCopied] = useState(false);
  const valor = doctor.valorMensalidade || (doctor.plano === 'clinica_multi' ? 179 : 89);

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const whatsappMessage = encodeURIComponent(
    `Olá! Sou a(o) ${doctor.nome} (CRM ${doctor.crm}). Acabei de efetuar o PIX de renovação da assinatura MaternaIA no valor de R$ ${valor.toFixed(2)}. Segue o comprovante!`
  );

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 text-gray-800 text-center">
        
        {/* ÍCONE & TÍTULO */}
        <div className="flex flex-col items-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {doctor.status === 'trial' ? 'Período de Degustação Encerrado' : 'Assinatura Pendente de Renovação'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 max-h-16 overflow-y-auto">
            Para continuar gerenciando os prontuários, agendas e laudos com IA das suas pacientes, renove sua assinatura mensal.
          </p>
        </div>

        {/* DETALHES DO PLANO */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500 font-medium">Plano Contratado</span>
            <span className="font-bold text-gray-900 uppercase">
              {doctor.plano === 'clinica_multi' ? 'Clínica Multi (Até 5 Médicos)' : 'Individual Pro'}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500 font-medium">Valor da Mensalidade</span>
            <span className="text-base font-bold text-emerald-700">
              R$ {valor.toFixed(2)} / mês
            </span>
          </div>
        </div>

        {/* CHAVE PIX COPIA E COLA */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Chave PIX para Transferência (CPF)
          </label>
          
          <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-2xl border border-gray-300">
            <input 
              type="text" 
              readOnly 
              value={pixKey} 
              className="bg-transparent text-xs font-mono font-bold text-gray-800 flex-1 px-2 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyPix}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                copied ? 'bg-emerald-600 text-white' : 'bg-[#2E482A] text-white hover:bg-[#233820]'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* BOTÃO WHATSAPP E ATUALIZAR */}
        <div className="space-y-3 pt-2">
          <a
            href={`https://wa.me/5541999999999?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Enviar Comprovante via WhatsApp</span>
          </a>

          {onRefreshStatus && (
            <button
              type="button"
              onClick={onRefreshStatus}
              className="text-xs text-gray-500 hover:text-gray-800 font-semibold cursor-pointer underline block mx-auto"
            >
              Já efetuou o pagamento? Clique para atualizar
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
