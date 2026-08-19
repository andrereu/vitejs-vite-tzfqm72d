import React, { useEffect } from 'react';

interface AdBannerProps {
  /** ID do cliente AdSense (ex: ca-pub-XXXXXXXXXXXXXXXX) */
  adClient?: string;
  /** Slot do bloco de anúncio AdSense */
  adSlot?: string;
  /** Formato do anúncio: auto, horizontal, rectangle */
  format?: 'auto' | 'horizontal' | 'rectangle';
  /** Classes CSS extras para estilização/layout */
  className?: string;
  /** Texto alternativo caso o AdSense não esteja ativo */
  placeholderTitle?: string;
  placeholderSubtitle?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  adClient,
  adSlot,
  format = 'auto',
  className = '',
  placeholderTitle = 'Espaço Patrocinado',
  placeholderSubtitle = 'Produtos e cuidados essenciais para mamãe e bebê'
}) => {
  useEffect(() => {
    // Tenta carregar o anúncio real se o script do AdSense estiver no index.html
    if (adClient && adSlot && typeof window !== 'undefined') {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch (e) {
        console.warn('Erro ao carregar AdSense:', e);
      }
    }
  }, [adClient, adSlot]);

  // Se os IDs do AdSense forem fornecidos, renderiza a tag oficial
  if (adClient && adSlot) {
    return (
      <div className={`ad-container my-4 text-center overflow-hidden print:hidden ${className}`}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={adClient}
          data-ad-slot={adSlot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // Banner substituto nativo elegante para prévias e monetização direta
  return (
    <div className={`my-4 print:hidden ${className}`}>
      <div className="bg-gradient-to-r from-emerald-50 via-[#F4F6F2] to-amber-50 border border-emerald-200/80 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center text-xl shrink-0">
            🍼
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--brand-primary)] bg-white px-2 py-0.5 rounded-md border border-[var(--brand-primary)]/20 inline-block mb-1">
              {placeholderTitle}
            </span>
            <p className="text-xs text-gray-700 font-medium leading-snug">
              {placeholderSubtitle}
            </p>
          </div>
        </div>

        <button
          onClick={() => window.open('https://instagram.com', '_blank')}
          className="px-3.5 py-1.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white rounded-xl text-[11px] font-bold shrink-0 shadow-xs transition-all cursor-pointer"
        >
          Conhecer Mais
        </button>
      </div>
    </div>
  );
};

export default AdBanner;
