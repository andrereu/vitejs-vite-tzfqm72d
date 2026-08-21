import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { ItemPrescricao, ItemExameSolicitado, TipoExameSolicitado } from '../types/prenatal';
import { LISTA_EXAMES_OFICIAIS } from '../constants/examesList';
import { ExamAutocomplete } from './ExamAutocomplete';

interface PrescricaoExamesEditorProps {
  prescricoes: ItemPrescricao[];
  exames: ItemExameSolicitado[];
  onAdicionarPrescricao: (item: Omit<ItemPrescricao, 'id'>) => void;
  onRemoverPrescricao: (id: string) => void;
  onAdicionarExame: (item: Omit<ItemExameSolicitado, 'id'>) => void;
  onRemoverExame: (id: string) => void;
}

// Só apresentação + callbacks (mesmo padrão dos componentes da Agenda) — usado
// nos DOIS pontos de entrada da D2.2 (dentro do "Registrar Atendimento" e no
// modal avulso "Nova Solicitação"), sem nenhuma lógica de Firestore aqui. Os
// itens só existem de verdade quando o formulário que contém este
// componente for salvo — cancelar descarta tudo, sem vínculo pendurado.
export const PrescricaoExamesEditor: React.FC<PrescricaoExamesEditorProps> = ({
  prescricoes,
  exames,
  onAdicionarPrescricao,
  onRemoverPrescricao,
  onAdicionarExame,
  onRemoverExame
}) => {
  const [mostrarNovoMedicamento, setMostrarNovoMedicamento] = useState(false);
  const [medicamento, setMedicamento] = useState('');
  const [posologia, setPosologia] = useState('');

  const [mostrarNovoExame, setMostrarNovoExame] = useState(false);
  const [nomeExame, setNomeExame] = useState('');
  const [tipoExame, setTipoExame] = useState<TipoExameSolicitado>('Laboratorial');

  const confirmarMedicamento = () => {
    if (!medicamento.trim()) return;
    onAdicionarPrescricao({ medicamento: medicamento.trim(), posologia: posologia.trim() });
    setMedicamento('');
    setPosologia('');
    setMostrarNovoMedicamento(false);
  };

  const confirmarExame = () => {
    if (!nomeExame.trim()) return;
    onAdicionarExame({ nome: nomeExame.trim(), tipo: tipoExame });
    setNomeExame('');
    setTipoExame('Laboratorial');
    setMostrarNovoExame(false);
  };

  const vazio = prescricoes.length === 0 && exames.length === 0 && !mostrarNovoMedicamento && !mostrarNovoExame;

  return (
    <div className="space-y-3">
      {/* PRESCRIÇÃO */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-gray-400 uppercase">Prescrição</span>
        {prescricoes.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 bg-gray-50 border rounded-xl px-2.5 py-1.5">
            <div className="min-w-0">
              <span className="text-xs font-bold text-gray-800 block truncate">{p.medicamento}</span>
              {p.posologia && <span className="text-[10px] text-gray-500 block truncate">{p.posologia}</span>}
            </div>
            <button type="button" onClick={() => onRemoverPrescricao(p.id)} className="shrink-0 text-gray-400 hover:text-rose-600 cursor-pointer" aria-label="Remover medicamento">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {mostrarNovoMedicamento ? (
          <div className="bg-white border rounded-xl p-2.5 space-y-1.5">
            <input type="text" placeholder="Medicamento" value={medicamento} onChange={(e) => setMedicamento(e.target.value)} className="w-full text-xs p-2 border rounded-lg" autoFocus />
            <input type="text" placeholder="Posologia / orientação" value={posologia} onChange={(e) => setPosologia(e.target.value)} className="w-full text-xs p-2 border rounded-lg" />
            <div className="flex justify-end gap-2 pt-0.5">
              <button type="button" onClick={() => { setMostrarNovoMedicamento(false); setMedicamento(''); setPosologia(''); }} className="px-2 py-1 text-[11px] text-gray-500 cursor-pointer">Cancelar</button>
              <button type="button" onClick={confirmarMedicamento} className="px-3 py-1 text-[11px] font-bold bg-[var(--brand-primary)] text-white rounded-lg cursor-pointer">Adicionar</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setMostrarNovoMedicamento(true)} className="flex items-center gap-1 text-[11px] font-bold text-[var(--brand-primary)] cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Adicionar medicamento
          </button>
        )}
      </div>

      {/* EXAMES */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-gray-400 uppercase">Exames</span>
        {exames.map((ex) => (
          <div key={ex.id} className="flex items-center justify-between gap-2 bg-gray-50 border rounded-xl px-2.5 py-1.5">
            <div className="min-w-0 flex items-center gap-1.5">
              <span className={`shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${ex.tipo === 'Ecografia' ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {ex.tipo === 'Ecografia' ? 'Imagem' : 'Lab'}
              </span>
              <span className="text-xs font-bold text-gray-800 truncate">{ex.nome}</span>
            </div>
            <button type="button" onClick={() => onRemoverExame(ex.id)} className="shrink-0 text-gray-400 hover:text-rose-600 cursor-pointer" aria-label="Remover exame">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {mostrarNovoExame ? (
          <div className="bg-white border rounded-xl p-2.5 space-y-1.5">
            <ExamAutocomplete
              value={nomeExame}
              onChange={setNomeExame}
              lista={LISTA_EXAMES_OFICIAIS}
              placeholder="Nome do exame (ex: Hemograma, Ecografia Obstétrica)"
              autoFocus
            />
            <select value={tipoExame} onChange={(e) => setTipoExame(e.target.value as TipoExameSolicitado)} className="w-full text-xs p-2 border rounded-lg bg-white">
              <option value="Laboratorial">Laboratorial</option>
              <option value="Ecografia">Ecografia / Imagem</option>
            </select>
            <div className="flex justify-end gap-2 pt-0.5">
              <button type="button" onClick={() => { setMostrarNovoExame(false); setNomeExame(''); setTipoExame('Laboratorial'); }} className="px-2 py-1 text-[11px] text-gray-500 cursor-pointer">Cancelar</button>
              <button type="button" onClick={confirmarExame} className="px-3 py-1 text-[11px] font-bold bg-[var(--brand-primary)] text-white rounded-lg cursor-pointer">Adicionar</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setMostrarNovoExame(true)} className="flex items-center gap-1 text-[11px] font-bold text-[var(--brand-primary)] cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Solicitar exame
          </button>
        )}
      </div>

      {vazio && <p className="text-[11px] text-gray-400 italic">Nenhuma prescrição ou solicitação adicionada.</p>}
    </div>
  );
};
