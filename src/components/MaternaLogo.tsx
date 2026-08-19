import React from 'react';

interface MaternaLogoProps {
  /** 'full' exibe ícone + texto, 'icon' exibe apenas o símbolo */
  variant?: 'full' | 'icon';
  /** 'light' para fundos escuros (verde/preto), 'dark' para fundos claros */
  theme?: 'light' | 'dark';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const MaternaLogo: React.FC<MaternaLogoProps> = ({
  variant = 'full',
  theme = 'light',
  className = '',
  size = 'md'
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl'
  };

  const isLight = theme === 'light';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* SÍMBOLO VETORIAL: Coração + Abraço Materno + Brilho de IA */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconSizes[size]} shrink-0 transition-transform hover:scale-105 duration-300 drop-shadow-sm`}
      >
        <defs>
          {/* Gradiente do Fundo do Emblema */}
          <linearGradient id="maternaBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B5D36" />
            <stop offset="100%" stopColor="#1E311B" />
          </linearGradient>

          {/* Gradiente Dourado da IA */}
          <linearGradient id="goldSparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="50%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          {/* Gradiente Rosa/Suave do Cuidado Materno */}
          <linearGradient id="maternalCareGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDA4AF" />
            <stop offset="100%" stopColor="#F43F5E" />
          </linearGradient>
        </defs>

        {/* Fundo Arredondado Moderno (Squircle) */}
        <rect width="100" height="100" rx="28" fill="url(#maternaBgGrad)" />
        <rect width="100" height="100" rx="28" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />

        {/* Linha Orgânica do Abraço / Ventre Materno */}
        <path
          d="M 28 48 C 28 32, 42 22, 56 26 C 68 29, 74 42, 68 56 C 62 70, 50 78, 50 78 C 50 78, 38 70, 32 58 C 29 53, 28 48, 28 48 Z"
          fill="none"
          stroke="url(#maternalCareGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.95"
        />

        {/* Feto / Bebê no interior (círculo acolhido) */}
        <circle cx="48" cy="46" r="6.5" fill="#FFE4E6" />

        {/* Faísca / Brilho de IA (Dourado Inteligente no canto superior direito) */}
        <path
          d="M 72 20 Q 72 30 82 30 Q 72 30 72 40 Q 72 30 62 30 Q 72 30 72 20 Z"
          fill="url(#goldSparkGrad)"
        />
        <circle cx="61" cy="19" r="2" fill="#FDE68A" />
      </svg>

      {/* TIPOGRAFIA DA MARCA */}
      {variant === 'full' && (
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`font-serif font-black tracking-tight ${textSizes[size]} ${
                isLight ? 'text-[#F4F6F0]' : 'text-[var(--brand-primary)]'
              }`}
            >
              Materna<span className="text-[var(--brand-gold)] font-sans font-black">IA</span>
            </span>
            <span className="bg-[var(--brand-gold)]/20 text-[var(--brand-gold)] border border-[var(--brand-gold)]/40 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
              SaaS
            </span>
          </div>
          <span
            className={`text-[8.5px] uppercase tracking-widest font-bold mt-1 ${
              isLight ? 'text-[var(--brand-on-primary-muted)]' : 'text-gray-500'
            }`}
          >
            Obstetrícia & IA Gestacional
          </span>
        </div>
      )}
    </div>
  );
};

export default MaternaLogo;
