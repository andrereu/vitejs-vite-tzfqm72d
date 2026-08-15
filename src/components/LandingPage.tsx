import React from 'react';
import { Sparkles, Smartphone, CheckCircle2, ArrowRight, MessageCircle } from 'lucide-react';
import { AdBanner } from './AdBanner';

interface LandingPageProps {
  onOpenPatientLogin: () => void;
  onOpenDoctorLogin: () => void;
  onOpenTrialModal: () => void; // Adicionado
  onInstallPWA: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenPatientLogin,
  onOpenDoctorLogin,
  onOpenTrialModal, // Adicionado
  onInstallPWA
}) => {

  const handleFalarComConsultor = () => {
    const telefoneDestino = '5541998496940'; 
    const texto = encodeURIComponent('Olá! Gostaria de falar com um consultor comercial sobre o MaternaIA.');
    window.open(`https://wa.me/${telefoneDestino}?text=${texto}`, '_blank');
  };

  return (
    <div className="space-y-16 pb-16 print:hidden">
      
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-8 px-4 max-w-6xl mx-auto text-center">
        <div className="bg-gradient-to-b from-[#2E482A] via-[#233820] to-[#172515] text-white p-8 md:p-14 rounded-3xl shadow-2xl space-y-6 relative border border-[#3D5C38]">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold text-[#F4F6F0] leading-tight max-w-4xl mx-auto">
            Acompanhamento gestacional com IA e precisão
          </h1>
          
          <div className="pt-6 flex flex-col sm:flex-row gap-3 justify-center items-center">
            {/* BOTÃO TRIAL - AGORA APONTA PARA O MODAL DE TRIAL */}
            <button 
              onClick={onOpenTrialModal} 
              className="w-full sm:w-auto px-7 py-3.5 bg-[#D4AF37] hover:bg-amber-400 text-gray-900 rounded-2xl font-bold text-xs shadow-lg transition-all cursor-pointer"
            >
              🚀 Teste Grátis de 14 Dias
            </button>
            
            {/* BOTÃO WHATSAPP - AGORA APONTA PARA O CONSULTOR */}
            <button 
              onClick={handleFalarComConsultor}
              className="w-full sm:w-auto px-7 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" /> Falar com Consultor
            </button>
          </div>

          <div className="pt-4 text-xs text-[#A3B18A] flex flex-wrap justify-center gap-4">
             <button onClick={onOpenPatientLogin} className="hover:text-white underline">Sou Gestante</button>
             <button onClick={onOpenDoctorLogin} className="hover:text-white underline">Login Médico</button>
          </div>
        </div>
      </section>

      {/* ... (O restante da LandingPage continua igual) */}
    </div>
  );
};
