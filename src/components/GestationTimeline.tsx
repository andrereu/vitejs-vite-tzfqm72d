import React, { useState } from 'react';
import { Stethoscope, FlaskConical, Syringe, Baby, Pill, CheckCircle2, Clock, AlertTriangle, Circle, Plus } from 'lucide-react';
import type { Patient, MarcoPersonalizado } from '../types/prenatal';
import type { MarcoCategoria, MarcoComStatus, MarcoStatus } from '../utils/gestationTimeline';
import { getTimelineForPatient } from '../utils/gestationTimeline';

interface GestationTimelineProps {
  patient: Patient;
  semanaAtual: number;
  isStaff: boolean;
  onMarcarRealizado: (marcoId: string) => void;
  onIrParaAba?: (tab: string) => void;
  onAdicionarPersonalizado: (marco: Omit<MarcoPersonalizado, 'id'>) => void;
  onRemoverPersonalizado: (id: string) => void;
}

const ICONE_CATEGORIA: Record<MarcoCategoria, React.ReactNode> = {
  consulta: <Stethoscope className="w-4 h-4" />,
  exame: <FlaskConical className="w-4 h-4" />,
  vacina: <Syringe className="w-4 h-4" />,
  ultrassom: <Baby className="w-4 h-4" />,
  suplementacao: <Pill className="w-4 h-4" />
};

const LABEL_CATEGORIA: Record<MarcoCategoria, string> = {
  consulta: 'Consulta',
  exame: 'Exame',
  vacina: 'Vacina',
  ultrassom: 'Ecografia',
  suplementacao: 'Suplementação'
};

const ESTILO_STATUS: Record<MarcoStatus, { cor: string; bg: string; borda: string; icone: React.ReactNode; label: string }> = {
  realizado: { cor: 'text-emerald-700', bg: 'bg-emerald-50', borda: 'border-emerald-200', icone: <CheckCircle2 className="w-4 h-4" />, label: 'Realizado' },
  proximo: { cor: 'text-sky-700', bg: 'bg-sky-50', borda: 'border-sky-200', icone: <Clock className="w-4 h-4" />, label: 'Nesta fase' },
  atrasado: { cor: 'text-rose-700', bg: 'bg-rose-50', borda: 'border-rose-200', icone: <AlertTriangle className="w-4 h-4" />, label: 'Atrasado' },
  futuro: { cor: 'text-gray-400', bg: 'bg-gray-50', borda: 'border-gray-200', icone: <Circle className="w-4 h-4" />, label: 'Ainda não chegou' }
};

function formatDataCurta(dataStr?: string) {
  if (!dataStr) return null;
  const d = new Date(dataStr.length === 10 ? `${dataStr}T12:00:00` : dataStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR');
}

const NOVO_ITEM_PADRAO = { titulo: '', categoria: 'consulta' as MarcoCategoria, semanaInicio: 0, semanaFim: 40 };

// Linha do tempo visual da gestação: cada marco (consulta, exame, vacina,
// ecografia, suplementação) numa janela de semanas, com status calculado
// automaticamente a partir do que já está preenchido no prontuário — mais
// os itens que a médica adicionar especificamente pra essa paciente. Mesmo
// componente serve pro painel da médica e pro app da paciente — só muda o
// que cada um pode clicar (a paciente só acompanha; a equipe pode marcar
// itens manuais, adicionar/remover personalizados e pular pra aba certa).
export const GestationTimeline: React.FC<GestationTimelineProps> = ({
  patient,
  semanaAtual,
  isStaff,
  onMarcarRealizado,
  onIrParaAba,
  onAdicionarPersonalizado,
  onRemoverPersonalizado
}) => {
  const marcos = getTimelineForPatient(patient, semanaAtual);
  const atrasados = marcos.filter((m: MarcoComStatus) => m.status === 'atrasado').length;

  const [mostrarForm, setMostrarForm] = useState(false);
  const [novoItem, setNovoItem] = useState(NOVO_ITEM_PADRAO);

  const handleAdicionar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoItem.titulo.trim()) return;
    onAdicionarPersonalizado(novoItem);
    setNovoItem(NOVO_ITEM_PADRAO);
    setMostrarForm(false);
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-5 print:hidden">
      <div className="flex flex-wrap justify-between items-center gap-3 border-b pb-3">
        <div>
          <h3 className="font-bold text-gray-900 text-base">Linha do Tempo da Gestação</h3>
          <p className="text-xs text-gray-500">Semana atual: {semanaAtual}ª — marcos do protocolo padrão de pré-natal</p>
        </div>
        {atrasados > 0 && (
          <span className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[11px] font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> {atrasados} atrasado{atrasados > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="space-y-0">
        {marcos.map((marco, idx) => {
          const estilo = ESTILO_STATUS[marco.status];
          const dataFormatada = formatDataCurta(marco.em);
          // Ecografia e suplementação não têm campo próprio no prontuário
          // (diferente de consulta/exame/vacina, que são derivados de dados
          // já existentes) — por isso são as únicas que aceitam marcação
          // manual, junto com qualquer item personalizado.
          const podeMarcarManual =
            isStaff && marco.status !== 'realizado' && (marco.categoria === 'ultrassom' || marco.categoria === 'suplementacao' || marco.personalizado);
          const podeIrParaAba = marco.tabAlvo && onIrParaAba;

          return (
            <div key={marco.id} className="flex gap-3 sm:gap-4">
              {/* COLUNA DA SEMANA + LINHA CONECTORA */}
              <div className="flex flex-col items-center shrink-0 w-14 sm:w-16">
                <span className="text-[10px] font-bold text-gray-400 tabular-nums text-center leading-tight pt-1">
                  {marco.semanaInicio}–{marco.semanaFim}
                  <br />sem
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mt-1.5 border-2 ${estilo.bg} ${estilo.borda} ${estilo.cor}`}>
                  {ICONE_CATEGORIA[marco.categoria]}
                </div>
                {idx < marcos.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 my-1 min-h-[1.5rem]" />}
              </div>

              {/* CONTEÚDO DO MARCO */}
              <div className="flex-1 pb-5">
                <div className={`p-3.5 rounded-2xl border ${estilo.borda} ${estilo.bg}`}>
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <strong className="text-sm text-gray-900 block">{marco.titulo}</strong>
                        {marco.personalizado && (
                          <span className="px-1.5 py-0.5 bg-violet-50 border border-violet-200 text-violet-700 rounded text-[9px] font-bold uppercase shrink-0">
                            Personalizado
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">{marco.descricao}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${estilo.cor} bg-white/70`}>
                      {estilo.icone} {estilo.label}
                    </span>
                  </div>

                  {dataFormatada && (
                    <p className="text-[11px] text-gray-500 mt-2">Registrado em <strong>{dataFormatada}</strong></p>
                  )}

                  {(podeMarcarManual || podeIrParaAba || (isStaff && marco.personalizado)) && (
                    <div className="flex gap-2 mt-2.5 flex-wrap">
                      {podeIrParaAba && (
                        <button
                          onClick={() => onIrParaAba!(marco.tabAlvo!)}
                          className="text-[11px] font-bold text-gray-700 underline cursor-pointer"
                        >
                          Ver/editar na aba correspondente
                        </button>
                      )}
                      {podeMarcarManual && (
                        <button
                          onClick={() => onMarcarRealizado(marco.id)}
                          className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-[11px] font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                          Marcar como realizado
                        </button>
                      )}
                      {isStaff && marco.personalizado && (
                        <button
                          onClick={() => onRemoverPersonalizado(marco.id)}
                          className="px-3 py-1.5 bg-white border border-rose-200 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isStaff && (
        <div className="pt-2 border-t">
          {mostrarForm ? (
            <form onSubmit={handleAdicionar} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <strong className="text-xs text-gray-900 block">+ Adicionar Item Personalizado</strong>
              <input
                type="text"
                required
                placeholder="Ex: Consulta com endocrinologista"
                value={novoItem.titulo}
                onChange={(e) => setNovoItem({ ...novoItem, titulo: e.target.value })}
                className="w-full text-xs p-2.5 border rounded-xl bg-white"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={novoItem.categoria}
                  onChange={(e) => setNovoItem({ ...novoItem, categoria: e.target.value as MarcoCategoria })}
                  className="text-xs p-2.5 border rounded-xl bg-white"
                >
                  {(Object.keys(LABEL_CATEGORIA) as MarcoCategoria[]).map((cat) => (
                    <option key={cat} value={cat}>{LABEL_CATEGORIA[cat]}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  max={42}
                  placeholder="Semana início"
                  value={novoItem.semanaInicio}
                  onChange={(e) => setNovoItem({ ...novoItem, semanaInicio: Number(e.target.value) })}
                  className="text-xs p-2.5 border rounded-xl bg-white"
                />
                <input
                  type="number"
                  min={0}
                  max={42}
                  placeholder="Semana fim"
                  value={novoItem.semanaFim}
                  onChange={(e) => setNovoItem({ ...novoItem, semanaFim: Number(e.target.value) })}
                  className="text-xs p-2.5 border rounded-xl bg-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setMostrarForm(false); setNovoItem(NOVO_ITEM_PADRAO); }}
                  className="px-3 py-1.5 text-xs text-gray-500 cursor-pointer"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-1.5 bg-[var(--brand-primary)] text-white font-bold text-xs rounded-xl cursor-pointer">
                  Adicionar
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setMostrarForm(true)}
              className="text-xs font-bold text-[var(--brand-primary)] underline cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar item personalizado pra esta paciente
            </button>
          )}
        </div>
      )}
    </div>
  );
};
