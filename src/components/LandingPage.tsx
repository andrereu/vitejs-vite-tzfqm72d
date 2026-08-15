import React from 'react';
import { Sparkles, Smartphone, CheckCircle2, ArrowRight, MessageCircle } from 'lucide-react';
import { AdBanner } from './AdBanner';

interface LandingPageProps {
  onOpenPatientLogin: () => void;
  onOpenDoctorLogin: () => void;
  onOpenTrialModal: () => void;
  onInstallPWA: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenPatientLogin,
  onOpenDoctorLogin,
  onOpenTrialModal,
  onInstallPWA
}) => {

  const handleFalarComConsultor = () => {
    const telefoneDestino = '5541998496940';
    const texto = encodeURIComponent('Olá! Gostaria de falar com um consultor comercial sobre o plano Clínica Multi-Médicos do MaternaIA.');
    window.open(`https://wa.me/${telefoneDestino}?text=${texto}`, '_blank');
  };

  return (
    <div className="space-y-16 pb-16 print:hidden">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-8 px-4 max-w-6xl mx-auto text-center">
        <div className="bg-gradient-to-b from-[#2E482A] via-[#233820] to-[#172515] text-white p-8 md:p-14 rounded-3xl shadow-2xl space-y-6 relative border border-[#3D5C38]">
          <div className="inline-flex items-center gap-2 bg-white/10 text-[#E8ECD8] text-[11px] font-bold px-4 py-1.5 rounded-full uppercase border border-white/20 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> MaternaIA • Plataforma Inteligente
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold text-[#F4F6F0] leading-tight max-w-4xl mx-auto">
            Acompanhamento gestacional com IA e precisão
          </h1>
          <p className="text-xs md:text-base text-[#A3B18A] max-w-2xl mx-auto leading-relaxed">
            Substitua carteirinhas de papel por um ecossistema digital. Leitura de laudos com IA, Gráficos de Peso MS, e comunicação direta com a gestante.
          </p>

          <div className="pt-6 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button onClick={onOpenTrialModal} className="w-full sm:w-auto px-7 py-3.5 bg-[#D4AF37] hover:bg-amber-400 text-gray-900 rounded-2xl font-bold text-xs shadow-lg transition-all cursor-pointer">
              🚀 Teste Grátis de 14 Dias
            </button>
            <button onClick={handleFalarComConsultor} className="w-full sm:w-auto px-7 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2">
              <MessageCircle className="w-4 h-4" /> Falar com Consultor
            </button>
          </div>
        </div>
      </section>

      {/* 2. AD BANNER 1 */}
      <div className="max-w-5xl mx-auto px-4">
        <AdBanner placeholderTitle="Dicas & Cuidados" placeholderSubtitle="Enxoval, amamentação e cuidados no pós-parto" />
      </div>

      {/* 3. RECURSOS */}
      <section className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2"><h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900">Tecnologia Médica</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '🤖', title: 'Leitura de Laudos com IA', desc: 'Extração automática de dados de exames com Gemini.' },
            { icon: '📈', title: 'Curva GPG Oficial', desc: 'Gráficos automáticos baseados no Ministério da Saúde.' },
            { icon: '📲', title: 'WhatsApp Integrado', desc: 'Lembretes e resumos enviados via WhatsApp.' }
          ].map((item, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-xl">{item.icon}</div>
              <h3 className="font-bold text-base">{item.title}</h3>
              <p className="text-xs text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. PLANOS E PREÇOS */}
      <section className="max-w-5xl mx-auto px-4 space-y-8">
        <div className="text-center"><h2 className="text-2xl font-bold">Planos para o seu consultório</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
            <h3 className="font-bold text-xl">Obstetra Pro</h3>
            <p className="text-3xl font-bold">R$ 89 <span className="text-sm font-normal text-gray-500">/mês</span></p>
            <button onClick={onOpenTrialModal} className="w-full py-3 bg-[#2E482A] text-white rounded-xl font-bold text-xs cursor-pointer">Começar Teste de 14 Dias</button>
          </div>
          <div className="bg-[#2E482A]/10 p-8 rounded-3xl border border-[#2E482A] space-y-6">
            <h3 className="font-bold text-xl">Clínica Multi</h3>
            <p className="text-3xl font-bold text-[#2E482A]">R$ 199 <span className="text-sm font-normal text-gray-500">/mês</span></p>
            <button onClick={handleFalarComConsultor} className="w-full py-3 bg-[#D4AF37] text-gray-900 rounded-xl font-bold text-xs cursor-pointer">Falar com Consultor</button>
          </div>
        </div>
      </section>

      {/* 5. AD BANNER 2 */}
      <div className="max-w-5xl mx-auto px-4">
        <AdBanner placeholderTitle="Publicidade" placeholderSubtitle="Anuncie produtos para gestantes." />
      </div>

      <footer className="text-center text-xs text-gray-500 pt-8 border-t">
        <p>MaternaIA • Tecnologia para a vida</p>
      </footer>
    </div>
  );
};
