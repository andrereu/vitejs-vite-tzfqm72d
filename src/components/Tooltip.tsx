import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
  title: string;
  text: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ title, text }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1 align-middle print:hidden">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-gray-400 hover:text-[#2E482A] focus:outline-none transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-gray-900 text-white text-[11px] rounded-xl shadow-xl z-50 pointer-events-none leading-snug">
          <strong className="block text-[#D4AF37] font-bold mb-0.5">{title}</strong>
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </span>
  );
};
