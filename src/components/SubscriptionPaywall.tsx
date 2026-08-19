import React, { useState } from 'react';
import { ShieldAlert, QrCode, Copy, Check, Clock, MessageSquare, ArrowRight, Loader2 } from 'lucide-react';
import type { DoctorTenant } from '../types/saas';

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
  const [showManualPix, setShowManualPix] = useState(false);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const valor = doctor.valorMensalidade || (doctor.plano === 'clinica_multi' ? 179 : 89);

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePagarAgora = async () => {
    setIsCreatingCheckout(true);
    setCheckoutError('');
    try {
      const response = await fetch('/api/create-subscription-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: doctor.id })
      });
      const data = await response.json();
      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error || 'Não foi possível iniciar o pagamento.');
      }
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      setCheckoutError(err.message || 'Erro ao iniciar pagamento. Tente novamente.');
      setIsCreatingCheckout(false);
    }
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
              {doctor.plano === 'clinica_multi' ? 'Clínica Multi (Até 5 Secretárias)' : 'Individual Pro'}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-500 font-medium">Valor da Mensalidade</span>
            <span className="text-base font-bold text-emerald-700">
              R$ {valor.toFixed(2)} / mês
            </span>
          </div>
        </div>

        {/* PAGAMENTO AUTOMÁTICO (PIX OU CARTÃO) */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handlePagarAgora}
            disabled={isCreatingCheckout}
            className="w-full py-3.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] disabled:opacity-60 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            {isCreatingCheckout ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            <span>{isCreatingCheckout ? 'Gerando pagamento...' : 'Pagar com Pix ou Cartão'}</span>
          </button>
          <p className="text-[10px] text-gray-400">
            Acesso liberado automaticamente assim que o pagamento é confirmado.
          </p>
          {checkoutError && (
            <div className="p-2.5 bg-red-50 text-red-700 rounded-xl text-[11px] font-medium border border-red-200 text-left">
              {checkoutError}
            </div>
          )}
        </div>

        {onRefreshStatus && (
          <button
            type="button"
            onClick={onRefreshStatus}
            className="text-xs text-gray-500 hover:text-gray-800 font-semibold cursor-pointer underline block mx-auto"
          >
            Já efetuou o pagamento? Clique para atualizar
          </button>
        )}

        {/* ALTERNATIVA: PIX MANUAL */}
        <div className="border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => setShowManualPix((v) => !v)}
            className="text-[11px] text-gray-400 hover:text-gray-600 font-semibold cursor-pointer flex items-center gap-1 mx-auto"
          >
            <QrCode className="w-3.5 h-3.5" />
            {showManualPix ? 'Ocultar chave PIX manual' : 'Prefere pagar por PIX manual e enviar o comprovante?'}
          </button>

          {showManualPix && (
            <div className="mt-4 space-y-4 text-left">
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
                      copied ? 'bg-emerald-600 text-white' : 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)]'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <a
                href={`https://wa.me/5541999999999?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Enviar Comprovante via WhatsApp</span>
              </a>
              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Nesse caso a liberação é manual e pode levar mais tempo.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
