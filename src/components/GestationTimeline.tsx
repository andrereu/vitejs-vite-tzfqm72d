import React, { useState } from 'react';
import { Stethoscope, FlaskConical, Syringe, Baby, Pill, CheckCircle2, Clock, AlertTriangle, Circle, ChevronDown, Plus } from 'lucide-react';
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

// Só os status "quentes" (que aparecem em destaque, em Agora & Próximos)
// usam essa paleta com função semântica clara. Realizado/futuro têm
// tratamento visual próprio, mais neutro, na lista compacta.
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

interface MarcoActionsProps {
  marco: MarcoComStatus;
  isStaff: boolean;
  onMarcarRealizado: (marcoId: string) => void;
  onIrParaAba?: (tab: string) => void;
  onRemoverPersonalizado: (id: string) => void;
}

// Ecografia e suplementação não têm campo próprio no prontuário (diferente
// de consulta/exame/vacina, que são derivados de dados já existentes) — por
// isso são as únicas categorias que aceitam marcação manual, junto com
// qualquer item personalizado. O rótulo do link de navegação muda por papel:
// a paciente só acompanha ("Ver detalhes"), a equipe edita de verdade
// ("Ver / editar").
function calcularAcoesDoMarco({ marco, isStaff, onMarcarRealizado, onIrParaAba, onRemoverPersonalizado }: MarcoActionsProps) {
  const podeMarcarManual =
    isStaff && marco.status !== 'realizado' && (marco.categoria === 'ultrassom' || marco.categoria === 'suplementacao' || marco.personalizado);
  const podeIrParaAba = !!(marco.tabAlvo && onIrParaAba);
  const podeRemover = isStaff && !!marco.personalizado;

  return {
    podeMarcarManual,
    podeIrParaAba,
    podeRemover,
    labelVerDetalhes: isStaff ? 'Ver / editar' : 'Ver detalhes',
    onIrParaAbaClick: () => onIrParaAba!(marco.tabAlvo!),
    onMarcarClick: () => onMarcarRealizado(marco.id),
    onRemoverClick: () => onRemoverPersonalizado(marco.id)
  };
}

// Card em destaque — usado só pros marcos que pedem atenção agora
// (atrasado/próximo). Cor entra pontualmente (borda do card, ícone, badge de
// status), não preenchendo o cartão inteiro, pra não virar um bloco
// fortemente colorido.
const MarcoDestaque: React.FC<{
  marco: MarcoComStatus;
  isStaff: boolean;
  onMarcarRealizado: (marcoId: string) => void;
  onIrParaAba?: (tab: string) => void;
  onRemoverPersonalizado: (id: string) => void;
}> = ({ marco, isStaff, onMarcarRealizado, onIrParaAba, onRemoverPersonalizado }) => {
  const estilo = ESTILO_STATUS[marco.status];
  const dataFormatada = formatDataCurta(marco.em);
  const acoes = calcularAcoesDoMarco({ marco, isStaff, onMarcarRealizado, onIrParaAba, onRemoverPersonalizado });
  const temAcoes = acoes.podeIrParaAba || acoes.podeMarcarManual || acoes.podeRemover;

  return (
    <div className={`bg-white rounded-2xl border p-4 lg:p-5 flex gap-3 lg:gap-4 ${estilo.borda}`}>
      <span className={`w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center shrink-0 ${estilo.bg} ${estilo.cor}`}>
        {ICONE_CATEGORIA[marco.categoria]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <strong className="text-sm lg:text-base text-gray-900">{marco.titulo}</strong>
              {marco.personalizado && (
                <span className="px-1.5 py-0.5 bg-violet-50 border border-violet-200 text-violet-700 rounded text-[9px] font-bold uppercase shrink-0">
                  Personalizado
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{marco.descricao}</p>
          </div>
          <span className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${estilo.cor} ${estilo.bg}`}>
            {estilo.icone} {estilo.label}
          </span>
        </div>

        <p className="text-[11px] text-gray-400 mt-2">
          {marco.semanaInicio}–{marco.semanaFim} semanas
          {dataFormatada && <> • Registrado em <strong className="text-gray-600">{dataFormatada}</strong></>}
        </p>

        {temAcoes && (
          <div className="flex gap-2 mt-2.5 flex-wrap">
            {acoes.podeIrParaAba && (
              <button onClick={acoes.onIrParaAbaClick} className="text-[11px] font-bold text-gray-700 underline cursor-pointer">
                {acoes.labelVerDetalhes}
              </button>
            )}
            {acoes.podeMarcarManual && (
              <button
                onClick={acoes.onMarcarClick}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-[11px] font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Marcar como realizado
              </button>
            )}
            {acoes.podeRemover && (
              <button
                onClick={acoes.onRemoverClick}
                className="px-3 py-1.5 bg-white border border-rose-200 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
              >
                Remover
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Linha compacta — usada no Histórico (recolhível) e em Mais Adiante:
// mesmo dado, tratamento visual secundário (sem card colorido, ícone
// pequeno neutro/verde), pra reduzir densidade sem esconder informação.
const MarcoCompacto: React.FC<{
  marco: MarcoComStatus;
  isStaff: boolean;
  onMarcarRealizado: (marcoId: string) => void;
  onIrParaAba?: (tab: string) => void;
  onRemoverPersonalizado: (id: string) => void;
}> = ({ marco, isStaff, onMarcarRealizado, onIrParaAba, onRemoverPersonalizado }) => {
  const dataFormatada = formatDataCurta(marco.em);
  const acoes = calcularAcoesDoMarco({ marco, isStaff, onMarcarRealizado, onIrParaAba, onRemoverPersonalizado });
  const temAcoes = acoes.podeIrParaAba || acoes.podeMarcarManual || acoes.podeRemover;
  const realizado = marco.status === 'realizado';

  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-gray-50 last:border-0">
      <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${realizado ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
        {realizado ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-xs font-semibold truncate ${realizado ? 'text-gray-600' : 'text-gray-500'}`}>{marco.titulo}</span>
          {marco.personalizado && (
            <span className="px-1 py-0.5 bg-violet-50 text-violet-600 rounded text-[8px] font-bold uppercase shrink-0">Pers.</span>
          )}
        </div>
        <span className="text-[10px] text-gray-400">
          {realizado && dataFormatada ? `Em ${dataFormatada}` : `${marco.semanaInicio}–${marco.semanaFim} sem`}
        </span>

        {temAcoes && (
          <div className="flex gap-2.5 mt-1 flex-wrap">
            {acoes.podeIrParaAba && (
              <button onClick={acoes.onIrParaAbaClick} className="text-[10px] font-bold text-gray-500 underline cursor-pointer">
                {acoes.labelVerDetalhes}
              </button>
            )}
            {acoes.podeMarcarManual && (
              <button onClick={acoes.onMarcarClick} className="text-[10px] font-bold text-[var(--brand-primary)] underline cursor-pointer">
                Marcar como realizado
              </button>
            )}
            {acoes.podeRemover && (
              <button onClick={acoes.onRemoverClick} className="text-[10px] font-bold text-rose-600 underline cursor-pointer">
                Remover
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Linha do tempo da gestação: prioriza o que é relevante agora (marcos
// atrasados/na janela atual, em destaque), mantém o histórico acessível mas
// recolhido por padrão (reduz densidade sem esconder dado) e o que ainda
// vai acontecer com peso visual leve. Mesmo componente serve pro painel da
// médica e pro app da paciente — só muda o que cada um pode clicar (a
// paciente só acompanha; a equipe pode marcar itens manuais, adicionar/
// remover personalizados e pular pra aba certa) e o texto do link de
// navegação ("Ver detalhes" vs "Ver / editar").
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

  // Agrupamento conceitual (não trimestral): o que pede atenção agora, o que
  // já foi feito (secundário) e o que ainda vai chegar (leve). Cada filter
  // preserva a ordenação por semana que getTimelineForPatient já aplica.
  const agora = [...marcos.filter((m) => m.status === 'atrasado'), ...marcos.filter((m) => m.status === 'proximo')];
  const historico = marcos.filter((m) => m.status === 'realizado');
  const futuro = marcos.filter((m) => m.status === 'futuro');

  // Mesma semana gestacional já calculada em todo o resto do app — só uma
  // razão simples de 0 a 40 pra posicionar o marcador, sem novo cálculo clínico.
  const progresso = Math.min(1, Math.max(0, semanaAtual / 40));

  const [historicoAberto, setHistoricoAberto] = useState(false);
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
    <div className="space-y-5 lg:space-y-6 print:hidden">

      {/* PROGRESSO DA GESTAÇÃO — "você está aqui": passado preenchido, marcador na semana atual, futuro em aberto */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-5 lg:p-6">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Progresso da gestação</span>
          <span className="text-xs lg:text-sm font-bold text-gray-700">
            {semanaAtual}<span className="text-gray-400 font-normal">/40 semanas</span>
          </span>
        </div>
        <div className="relative h-2 rounded-full bg-gray-100">
          <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--brand-primary)]" style={{ width: `${progresso * 100}%` }} />
          <div
            className="absolute top-1/2 w-4 h-4 rounded-full bg-white border-2 border-[var(--brand-primary)] shadow-sm"
            style={{ left: `${progresso * 100}%`, transform: 'translate(-50%, -50%)' }}
            aria-hidden="true"
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-gray-400">
          <span>Início</span>
          <span>40 semanas</span>
        </div>
      </div>

      {/* AGORA & PRÓXIMOS — foco principal da tela */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Agora & Próximos</h3>
          {atrasados > 0 && (
            <span className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[10px] font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {atrasados} atrasado{atrasados > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {agora.length > 0 ? (
          agora.map((marco) => (
            <MarcoDestaque
              key={marco.id}
              marco={marco}
              isStaff={isStaff}
              onMarcarRealizado={onMarcarRealizado}
              onIrParaAba={onIrParaAba}
              onRemoverPersonalizado={onRemoverPersonalizado}
            />
          ))
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs text-gray-500 text-center">
            Nenhum marco previsto pra agora — tudo em dia.
          </div>
        )}
      </div>

      {/* HISTÓRICO — realizados, recolhido por padrão (dado continua acessível, só não compete visualmente com "agora") */}
      {historico.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-4 lg:p-5">
          <button
            type="button"
            onClick={() => setHistoricoAberto((v) => !v)}
            className="w-full flex items-center justify-between cursor-pointer"
          >
            <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Histórico ({historico.length} concluído{historico.length > 1 ? 's' : ''})
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${historicoAberto ? 'rotate-180' : ''}`} />
          </button>
          {historicoAberto && (
            <div className="mt-2 lg:grid lg:grid-cols-2 lg:gap-x-8">
              {historico.map((marco) => (
                <MarcoCompacto
                  key={marco.id}
                  marco={marco}
                  isStaff={isStaff}
                  onMarcarRealizado={onMarcarRealizado}
                  onIrParaAba={onIrParaAba}
                  onRemoverPersonalizado={onRemoverPersonalizado}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* MAIS ADIANTE — futuro, sempre visível mas com peso visual leve */}
      {futuro.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide px-1">Mais adiante</h3>
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xs px-4 lg:px-5 lg:grid lg:grid-cols-2 lg:gap-x-8">
            {futuro.map((marco) => (
              <MarcoCompacto
                key={marco.id}
                marco={marco}
                isStaff={isStaff}
                onMarcarRealizado={onMarcarRealizado}
                onIrParaAba={onIrParaAba}
                onRemoverPersonalizado={onRemoverPersonalizado}
              />
            ))}
          </div>
        </div>
      )}

      {/* ADICIONAR ITEM PERSONALIZADO — só equipe */}
      {isStaff && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-4 lg:p-5">
          {mostrarForm ? (
            <form onSubmit={handleAdicionar} className="space-y-3">
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
