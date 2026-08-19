import React from 'react';

interface PregnancyHeroProps {
  weeks: number;
  days: number;
  dpp: string;
  hasGestationalData: boolean;
}

// Cartão principal da Home da gestante: o número de semanas é o dado que ela
// mais quer ver de cara, por isso vira um "hero" com anel de progresso (0 a
// 40 semanas) em vez de mais um card de indicador igual aos outros.
export const PregnancyHero: React.FC<PregnancyHeroProps> = ({ weeks, days, dpp, hasGestationalData }) => {
  const trimestre = weeks < 14 ? '1º trimestre' : weeks < 28 ? '2º trimestre' : '3º trimestre';

  const raio = 40;
  const circunferencia = 2 * Math.PI * raio;
  const progresso = Math.min(1, Math.max(0, weeks / 40));
  const offset = circunferencia * (1 - progresso);

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-5 sm:p-6 lg:p-8 flex items-center gap-5 lg:gap-8">
      {hasGestationalData ? (
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36 shrink-0">
          <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90">
            <circle cx="48" cy="48" r={raio} fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-100" />
            <circle
              cx="48"
              cy="48"
              r={raio}
              fill="none"
              stroke="var(--brand-primary)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circunferencia}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-none">{weeks}</span>
            <span className="text-[10px] lg:text-xs text-gray-400 font-bold uppercase mt-0.5">semanas</span>
          </div>
        </div>
      ) : (
        <span className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center text-4xl lg:text-5xl shrink-0">🤰</span>
      )}

      <div className="min-w-0">
        {hasGestationalData ? (
          <>
            <span className="inline-block px-2 py-0.5 lg:px-2.5 lg:py-1 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-[10px] lg:text-xs font-bold rounded-full">
              {trimestre}
            </span>
            <p className="text-lg lg:text-2xl font-bold text-gray-900 mt-1.5 lg:mt-2.5 leading-tight">
              {weeks} semanas e {days} dia{days === 1 ? '' : 's'}
            </p>
            {dpp && (
              <p className="text-xs lg:text-sm text-gray-500 mt-0.5 lg:mt-1.5">
                Data provável do parto: <strong className="text-gray-700">{new Date(dpp).toLocaleDateString('pt-BR')}</strong>
              </p>
            )}
          </>
        ) : (
          <p className="text-sm lg:text-base text-gray-500">Data da última menstruação ainda não cadastrada.</p>
        )}
      </div>
    </div>
  );
};
