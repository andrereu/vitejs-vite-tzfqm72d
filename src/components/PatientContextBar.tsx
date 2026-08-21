import React from 'react';
import { formatDateBR } from '../utils/formatters';

interface PatientContextBarProps {
  patientName: string;
  weeks: number;
  days: number;
  dueDate: string;
  babyName?: string;
  bloodType?: string;
}

// Barra de contexto da paciente — UX-02. Só apresentação: recebe os dados já
// calculados (IG vem de calculateWeeksAndDays, DPP é a string bruta do
// cadastro) e não conhece Firestore nem o resto do estado do App. Quem
// decide SE ela aparece continua sendo o chamador (PatientAppScreen mantém
// a condição `isStaff` de sempre) — este componente só decide COMO mostrar
// o que recebeu.
//
// Hierarquia (spec UX-01): nome > IG > DPP > bebê/tipo sanguíneo. A IG ganha
// destaque por cor (mesmo padrão de chip já usado no pill de trimestre da
// PregnancyHero, bg-[var(--brand-primary)]/10 + texto na cor da marca) em vez
// de ficar maior — assim continua cabendo ao lado do nome em 375px. Bebê e
// tipo sanguíneo formam uma linha própria, sempre abaixo (w-full força a
// quebra), porque são o nível mais secundário e só aparecem quando existem —
// nunca um placeholder tipo "não informado".
export const PatientContextBar: React.FC<PatientContextBarProps> = ({
  patientName,
  weeks,
  days,
  dueDate,
  babyName,
  bloodType
}) => {
  const temLinhaSecundaria = Boolean(babyName || bloodType);

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-1" aria-label="Contexto da paciente">
      <span className="font-bold text-gray-900 text-sm truncate max-w-[60%]">{patientName}</span>
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-[11px] font-bold whitespace-nowrap">
        {weeks}sem + {days}d
      </span>
      {dueDate && (
        <span className="text-xs text-gray-500 whitespace-nowrap">DPP {formatDateBR(dueDate)}</span>
      )}
      {temLinhaSecundaria && (
        <span className="w-full text-[11px] text-gray-400 truncate">
          {babyName && <>Bebê: {babyName}</>}
          {babyName && bloodType && <span className="text-gray-300"> • </span>}
          {bloodType && <>{bloodType}</>}
        </span>
      )}
    </div>
  );
};
