import React, { useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { filtrarExamesOficiais, type ExameOficialOption } from '../utils/examAutocomplete';

interface ExamAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  lista: ExameOficialOption[];
  placeholder?: string;
  id?: string;
  autoFocus?: boolean;
}

let instancia = 0;

// UX-05.1 — substitui o <input list="..."><datalist> nativo, que no Android
// mostra as sugestões numa barra colada no teclado (fora do controle visual
// do app, parece parte do sistema operacional). Aqui a lista é só do
// MaternaIA: um dropdown tradicional no desktop, uma folha inferior no
// mobile — mesmo elemento de lista, só reposicionado via classe Tailwind
// responsiva (sem detecção de largura via JS, mesmo padrão já usado no
// resto do app). Continua texto livre: selecionar um item da lista só
// preenche o campo, não trava a digitação de um nome que não está nela.
export const ExamAutocomplete: React.FC<ExamAutocompleteProps> = ({ value, onChange, lista, placeholder, id, autoFocus }) => {
  const [baseId] = useState(() => id || `exam-autocomplete-${++instancia}`);
  const [aberto, setAberto] = useState(false);
  const [indiceAtivo, setIndiceAtivo] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const resultados = useMemo(() => filtrarExamesOficiais(value, lista), [value, lista]);
  const listboxId = `${baseId}-listbox`;

  const fechar = () => {
    setAberto(false);
    setIndiceAtivo(-1);
  };

  const selecionar = (item: ExameOficialOption) => {
    onChange(item.label);
    fechar();
  };

  const handleChange = (novoValor: string) => {
    onChange(novoValor);
    setIndiceAtivo(-1);
    setAberto(novoValor.trim().length >= 2);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!aberto) {
        setAberto(true);
        return;
      }
      setIndiceAtivo((i) => (resultados.length === 0 ? -1 : Math.min(i + 1, resultados.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceAtivo((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (aberto && indiceAtivo >= 0 && resultados[indiceAtivo]) {
        e.preventDefault();
        selecionar(resultados[indiceAtivo]);
      }
    } else if (e.key === 'Escape') {
      if (aberto) {
        e.preventDefault();
        fechar();
      }
    }
  };

  const mostrarLista = aberto && value.trim().length >= 2;

  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
        <input
          ref={inputRef}
          id={baseId}
          type="text"
          role="combobox"
          aria-expanded={mostrarLista}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={mostrarLista && indiceAtivo >= 0 ? `${listboxId}-opt-${indiceAtivo}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => value.trim().length >= 2 && setAberto(true)}
          onBlur={fechar}
          onKeyDown={handleKeyDown}
          className="w-full text-xs p-2 pl-7 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40"
        />
      </div>

      {mostrarLista && (
        <>
          {/* Fundo do mobile — toque fora fecha a folha, sem cobrir nada no desktop */}
          <div className="md:hidden fixed inset-0 z-40 bg-black/30" aria-hidden="true" />
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Sugestões de exames"
            className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl border-t border-gray-200 shadow-lg max-h-[55vh] overflow-y-auto py-2 m-0 list-none pb-[max(0.75rem,env(safe-area-inset-bottom))] md:absolute md:inset-x-auto md:bottom-auto md:top-full md:left-0 md:mt-1 md:w-full md:max-h-56 md:rounded-xl md:border md:shadow-md md:py-1"
          >
            {resultados.length > 0 ? (
              resultados.map((ex, i) => (
                <li key={ex.id} role="option" id={`${listboxId}-opt-${i}`} aria-selected={i === indiceAtivo}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selecionar(ex)}
                    className={`w-full text-left px-4 py-2.5 md:py-1.5 text-xs cursor-pointer ${
                      i === indiceAtivo ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {ex.label}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-xs text-gray-400 text-center">
                Nenhum exame encontrado — pode digitar o nome livremente.
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
};
