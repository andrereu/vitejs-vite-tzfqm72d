import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { carregarIndiceCid, buscarCid, TAMANHO_MINIMO_BUSCA } from '../utils/cid10';
import type { Cid10Indice, Cid10ResultadoComLinguagem } from '../utils/cid10';
import { valorParaTextoLivre, valorParaSelecao } from '../utils/diagnostico';
import type { DiagnosticoRegistrado } from '../types/prenatal';

interface CidAutocompleteProps {
  value: DiagnosticoRegistrado | undefined;
  onChange: (value: DiagnosticoRegistrado | undefined) => void;
  disabled?: boolean;
  id?: string;
}

// Só apresentação + callbacks (mesmo padrão de PrescricaoExamesEditor) — o
// componente não conhece Firestore, não conhece ConsultaEvolucao. Chama
// SOMENTE o motor já validado (src/utils/cid10), sem nenhuma lógica de busca
// duplicada aqui — texto livre e seleção explícita ficam em
// src/utils/diagnostico.ts, testáveis sem renderizar o componente.
//
// Filosofia da Dra., preservada à risca: o MaternaIA ajuda a encontrar a
// nomenclatura, a médica decide o diagnóstico. Uma sugestão só vira código
// quando ela clica/confirma nela — nunca por digitar um termo que bate.
export const CidAutocomplete: React.FC<CidAutocompleteProps> = ({ value, onChange, disabled, id }) => {
  const [aberto, setAberto] = useState(false);
  const [indiceCid, setIndiceCid] = useState<Cid10Indice | null>(null);
  const [carregandoIndice, setCarregandoIndice] = useState(false);
  const [erroIndice, setErroIndice] = useState(false);
  const [resultados, setResultados] = useState<Cid10ResultadoComLinguagem[]>(() => []);
  const [indiceAtivo, setIndiceAtivo] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const texto = value?.descricao ?? '';

  // Fecha ao clicar fora do campo/dropdown.
  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  // Carrega a base só quando o campo ganha foco pela primeira vez — não no
  // carregamento do formulário inteiro, pra não pagar o custo do fetch de
  // ~3,7 MB pra quem nunca chega a usar o campo.
  const garantirIndiceCarregado = () => {
    if (indiceCid || carregandoIndice) return;
    setCarregandoIndice(true);
    setErroIndice(false);
    carregarIndiceCid()
      .then((idx) => {
        setIndiceCid(idx);
        setCarregandoIndice(false);
      })
      .catch(() => {
        setCarregandoIndice(false);
        setErroIndice(true);
      });
  };

  // Busca com debounce leve (200ms) — o motor em si é rápido (~60ms), o
  // debounce evita rodar a cada tecla enquanto a médica ainda está digitando.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!indiceCid || texto.trim().length < TAMANHO_MINIMO_BUSCA) {
      setResultados([]);
      setIndiceAtivo(-1);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const { resultados: r } = buscarCid(indiceCid, texto, 8);
      setResultados(r);
      setIndiceAtivo(-1);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [texto, indiceCid]);

  const mostrarDropdown = aberto && texto.trim().length >= TAMANHO_MINIMO_BUSCA;

  const selecionar = (r: Cid10ResultadoComLinguagem) => {
    onChange(valorParaSelecao(r.codigo, r.descricao));
    setAberto(false);
    setIndiceAtivo(-1);
    inputRef.current?.blur();
  };

  const aoTeclar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!mostrarDropdown || resultados.length === 0) {
      if (e.key === 'Escape') setAberto(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceAtivo((i) => (i + 1) % resultados.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceAtivo((i) => (i <= 0 ? resultados.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      if (indiceAtivo >= 0 && indiceAtivo < resultados.length) {
        e.preventDefault();
        selecionar(resultados[indiceAtivo]);
      }
    } else if (e.key === 'Escape') {
      setAberto(false);
    }
  };

  const listboxId = id ? `${id}-listbox` : 'cid-autocomplete-listbox';

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={mostrarDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={indiceAtivo >= 0 ? `${listboxId}-opt-${indiceAtivo}` : undefined}
          placeholder="Comece a digitar o diagnóstico..."
          value={texto}
          disabled={disabled}
          onFocus={() => {
            garantirIndiceCarregado();
            if (texto.trim().length >= TAMANHO_MINIMO_BUSCA) setAberto(true);
          }}
          onChange={(e) => {
            onChange(valorParaTextoLivre(e.target.value));
            setAberto(true);
          }}
          onKeyDown={aoTeclar}
          className="w-full text-xs p-2.5 pl-8 border rounded-xl disabled:bg-gray-50 disabled:text-gray-400"
          autoComplete="off"
        />
        {value?.codigo && (
          <span
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700"
            title={`CID selecionado: ${value.codigo}`}
          >
            {value.codigo}
          </span>
        )}
      </div>

      {mostrarDropdown && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded-xl shadow-lg max-h-64 overflow-y-auto overscroll-contain">
          {carregandoIndice && (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-gray-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando base de diagnósticos...
            </div>
          )}
          {erroIndice && (
            <div className="px-3 py-3 text-xs text-gray-500">
              Não foi possível carregar as sugestões agora. Você pode continuar digitando o diagnóstico livremente.
            </div>
          )}
          {!carregandoIndice && !erroIndice && indiceCid && resultados.length === 0 && (
            <div className="px-3 py-3 text-xs text-gray-400 italic">
              Nenhuma sugestão encontrada — pode continuar digitando livremente.
            </div>
          )}
          {!carregandoIndice && resultados.length > 0 && (
            <ul role="listbox" id={listboxId}>
              {resultados.map((r, i) => (
                <li
                  key={r.codigo}
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={i === indiceAtivo}
                  onMouseDown={(e) => {
                    // onMouseDown (não onClick) pra selecionar antes do input perder o foco.
                    e.preventDefault();
                    selecionar(r);
                  }}
                  onMouseEnter={() => setIndiceAtivo(i)}
                  className={`px-3 py-2.5 text-xs cursor-pointer flex items-baseline gap-2 ${i === indiceAtivo ? 'bg-[var(--brand-primary)]/10' : ''}`}
                >
                  <span className="font-bold text-[var(--brand-primary)] shrink-0">{r.codigo}</span>
                  <span className="text-gray-700 truncate">— {r.descricao}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
