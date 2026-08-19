import React from 'react';
import { Sparkles, Smartphone, CheckCircle2, ArrowRight, MessageCircle, Bot, LineChart, ShieldCheck, HeartHandshake, Instagram } from 'lucide-react';
import { AdBanner } from './AdBanner';
import type { DoctorTenant } from '../types/saas';

interface LandingPageProps {
  onOpenPatientLogin: () => void;
  onOpenDoctorLogin: () => void;
  onOpenTrialModal: () => void;
  onInstallPWA: () => void;
  // Quando presente, a URL acessada bate com o endereço de uma médica
  // (maternaia.com.br/{slug}) — mostramos a entrada com a cara dela em vez
  // da landing de vendas genérica.
  doctorContext?: DoctorTenant;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenPatientLogin,
  onOpenDoctorLogin,
  onOpenTrialModal,
  onInstallPWA,
  doctorContext
}) => {
  const handleFalarComConsultor = () => {
    const telefoneDestino = '5541998496940';
    const texto = encodeURIComponent(
      'Olá! Gostaria de falar com um consultor comercial sobre o plano Clínica Multi-Médicos do MaternaIA.'
    );
    window.open(`https://wa.me/${telefoneDestino}?text=${texto}`, '_blank');
  };

  return (
    <div className="space-y-14 pb-16 print:hidden">

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-6 px-4 max-w-5xl mx-auto text-center">
        <div className="bg-gradient-to-b from-[var(--brand-primary)] via-[#233820] to-[#172515] text-white p-8 md:p-12 rounded-3xl shadow-2xl space-y-6 relative border border-[var(--brand-primary-border)]">

          {doctorContext ? (
            <>
              <div className="inline-flex items-center gap-2 bg-white/10 text-[var(--brand-on-primary)] text-[11px] font-bold px-4 py-1.5 rounded-full uppercase border border-white/20 backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Consultório Digital • Powered by MaternaIA
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {doctorContext.logoUrl && (
                  <img
                    src={doctorContext.logoUrl}
                    alt={`Logo de ${doctorContext.nome}`}
                    className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-contain bg-white/10 border border-white/20 shrink-0"
                  />
                )}
                <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#F4F6F0] leading-tight max-w-3xl">
                  {doctorContext.nome}
                </h1>
              </div>

              <p className="text-xs md:text-sm text-[var(--brand-on-primary-muted)] max-w-2xl mx-auto leading-relaxed">
                {doctorContext.especialidade || 'Obstetrícia'} • CRM {doctorContext.crm}
                {doctorContext.clinicaNome ? ` • ${doctorContext.clinicaNome}` : ''}
              </p>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center items-center">
                <button
                  onClick={onOpenPatientLogin}
                  className="w-full sm:w-auto px-7 py-3.5 bg-[var(--brand-gold)] hover:bg-amber-400 text-gray-900 rounded-2xl font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>👶 Sou Gestante — Acessar Carteirinha</span>
                </button>
                <button
                  onClick={onOpenDoctorLogin}
                  className="w-full sm:w-auto px-7 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  🩺 Acesso Profissional
                </button>
              </div>

              {doctorContext.instagram && (
                <div className="pt-1">
                  <a
                    href={`https://instagram.com/${doctorContext.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs text-white shadow-lg cursor-pointer transition-transform hover:scale-105 bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600"
                  >
                    <Instagram className="w-4 h-4" /> Siga @{doctorContext.instagram} no Instagram
                  </a>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 bg-white/10 text-[var(--brand-on-primary)] text-[11px] font-bold px-4 py-1.5 rounded-full uppercase border border-white/20 backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> MaternaIA • Plataforma Inteligente de Pré-Natal
              </div>

              <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#F4F6F0] leading-tight max-w-3xl mx-auto">
                Acompanhamento gestacional com carinho, precisão e Inteligência Artificial
              </h1>

              <p className="text-xs md:text-sm text-[var(--brand-on-primary-muted)] max-w-2xl mx-auto leading-relaxed">
                Substitua a carteirinha de papel por um ecossistema digital para obstetras e gestantes: leitura de laudos com IA Gemini, curva GPG oficial do Ministério da Saúde, avisos por WhatsApp e PWA Offline.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center items-center">
                <button
                  onClick={onOpenTrialModal}
                  className="w-full sm:w-auto px-7 py-3.5 bg-[var(--brand-gold)] hover:bg-amber-400 text-gray-900 rounded-2xl font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🚀 Teste Grátis de 14 Dias</span>
                </button>
                <button
                  onClick={handleFalarComConsultor}
                  className="w-full sm:w-auto px-7 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" /> Falar com Consultor
                </button>
              </div>

              <div className="pt-2 text-xs text-[var(--brand-on-primary-muted)] flex flex-wrap justify-center gap-6">
                <button onClick={onOpenPatientLogin} className="hover:text-white underline cursor-pointer font-medium">
                  👶 Sou Gestante (Acessar Carteirinha)
                </button>
                <button onClick={onOpenDoctorLogin} className="hover:text-white underline cursor-pointer font-medium">
                  🩺 Já sou cadastrado (Login Médico)
                </button>
                <button onClick={onInstallPWA} className="hover:text-white underline cursor-pointer font-medium flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5" /> Instalar App
                </button>
              </div>
            </>
          )}

        </div>
      </section>

      {/* Sem contexto de médica: mostra vitrine de vendas (anúncios, recursos,
          planos). Numa página /slug de uma médica específica, isso não faz
          sentido pra quem já é paciente ou colega dela — só o acesso direto. */}
      {!doctorContext && (
        <>
      {/* 2. ESPAÇO DE MONETIZAÇÃO / ADSENSE 1 */}
      <div className="max-w-5xl mx-auto px-4">
        <AdBanner
          placeholderTitle="Dicas & Cuidados"
          placeholderSubtitle="Enxoval, amamentação e cuidados no pós-parto"
        />
      </div>

      {/* 3. RECURSOS PRINCIPAIS */}
      <section className="max-w-5xl mx-auto px-4 space-y-6">
        <div className="text-center space-y-1.5">
          <span className="text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-widest bg-emerald-100/70 px-3 py-1 rounded-full">
            Tecnologia Médica Especializada
          </span>
          <h2 className="text-2xl font-serif font-bold text-gray-900">
            Tudo o que obstetras e gestantes precisam em um só lugar
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-700 flex items-center justify-center text-xl font-bold">
              🤖
            </div>
            <h3 className="font-bold text-base text-gray-900">Leitura de Laudos com IA</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              A gestante envia a foto da ecografia ou exame de sangue e a IA Gemini extrai os dados clínicos automaticamente, gerando um resumo acolhedor para a mãe.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl font-bold">
              📈
            </div>
            <h3 className="font-bold text-base text-gray-900">Curva GPG Oficial (MS)</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Gráfico automático de Ganho Ponderal Gestacional nos padrões do Ministério da Saúde com cálculo do IMC e faixas de ganho recomendado por trimestre.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl font-bold">
              📲
            </div>
            <h3 className="font-bold text-base text-gray-900">Avisos & Resumos no WhatsApp</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Envio em 1 clique de lembretes de consultas, orientações e resumos da evolução gestacional direto no celular da gestante.
            </p>
          </div>
        </div>
      </section>

      {/* 4. TABELA DE PLANOS & PREÇOS */}
      <section className="max-w-5xl mx-auto px-4 space-y-6">
        <div className="text-center space-y-1.5">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest bg-amber-100 px-3 py-1 rounded-full">
            Para Médicos e Clínicas
          </span>
          <h2 className="text-2xl font-serif font-bold text-gray-900">
            Planos sob medida para o seu consultório
          </h2>
          <p className="text-xs text-gray-500 max-w-lg mx-auto">
            Modernize o atendimento, encante suas gestantes e mantenha o pré-natal sincronizado em tempo real.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          
          {/* PLANO OBSTETRA PRO (TRIAL 14 DIAS) */}
          <div className="bg-white p-7 rounded-3xl border-2 border-gray-200 shadow-sm space-y-5 flex flex-col justify-between">
            <div className="space-y-3.5">
              <span className="bg-gray-100 text-gray-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                Consultório Individual
              </span>
              <h3 className="text-xl font-bold text-gray-900">Obstetra Pro</h3>
              <p className="text-3xl font-bold text-gray-900">
                R$ 89 <span className="text-xs text-gray-500 font-normal">/ mês</span>
              </p>
              <ul className="space-y-2.5 text-xs text-gray-600">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Gestantes e Consultas Ilimitadas</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Leitor de Laudos com IA Gemini</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Carteirinha Digital PWA com sua Marca</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Disparos no WhatsApp (Lembretes e Consultas)</li>
              </ul>
            </div>
            <button 
              onClick={onOpenTrialModal}
              className="w-full py-3 bg-[var(--brand-primary)] hover:bg-[#233820] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Começar Teste de 14 Dias Grátis
            </button>
          </div>

          {/* PLANO CLÍNICA MULTI-MÉDICOS */}
          <div className="bg-gradient-to-b from-[var(--brand-primary)]/5 to-[var(--brand-primary)]/15 p-7 rounded-3xl border-2 border-[var(--brand-primary)] shadow-md space-y-5 flex flex-col justify-between relative">
            <div className="absolute top-4 right-4 bg-[var(--brand-gold)] text-gray-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
              Mais Popular
            </div>
            <div className="space-y-3.5">
              <span className="bg-[var(--brand-primary)] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                Clínica & Maternidade
              </span>
              <h3 className="text-xl font-bold text-gray-900">Clínica Multi-Médicos</h3>
              <p className="text-3xl font-bold text-[var(--brand-primary)]">
                R$ 199 <span className="text-xs text-gray-500 font-normal">/ mês</span>
              </p>
              <ul className="space-y-2.5 text-xs text-gray-700 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" /> Múltiplos Médicos e Secretárias</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" /> Identidade Visual Personalizada (White Label)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" /> Zero Anúncios para suas Gestantes</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" /> Suporte Prioritário por WhatsApp</li>
              </ul>
            </div>
            <button 
              onClick={handleFalarComConsultor}
              className="w-full py-3 bg-[var(--brand-gold)] hover:bg-amber-400 text-gray-900 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Falar com Consultor Comercial</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* 5. ESPAÇO DE MONETIZAÇÃO / ADSENSE 2 */}
      <div className="max-w-5xl mx-auto px-4">
        <AdBanner 
          placeholderTitle="Publicidade"
          placeholderSubtitle="Anuncie serviços de saúde da mulher, ultrassonografia ou produtos para gestantes."
        />
      </div>
        </>
      )}

      {/* 6. RODAPÉ INSTITUCIONAL */}
      <footer className="border-t border-gray-200 pt-8 text-center text-xs text-gray-500 space-y-2">
        <p className="font-semibold text-gray-800">MaternaIA • Ecossistema Digital de Saúde Materno-Infantil</p>
        <p className="text-[11px]">Desenvolvido com tecnologia, segurança LGPD e IA para gestantes e obstetras.</p>
      </footer>

    </div>
  );
};

export default LandingPage;
