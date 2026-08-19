import React, { useMemo } from 'react';
import { Users, Clock, CalendarCheck, Wallet, ShieldAlert } from 'lucide-react';
import type { Patient } from '../types/prenatal';
import { calculateWeeksAndDays, formatDateBR } from '../utils/formatters';

interface DoctorMetricsTabProps {
  patients: Patient[];
  onSelectPatient: (patientId: string) => void;
}

interface StatTile {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
}

// Visão rápida do consultório: números que ajudam a médica a decidir o que
// olhar primeiro no dia, sem precisar abrir gestante por gestante. Antes,
// só o Super Admin (visão de dono do SaaS) tinha qualquer número agregado —
// a própria médica não via nada disso sobre o consultório dela.
export const DoctorMetricsTab: React.FC<DoctorMetricsTabProps> = ({ patients, onSelectPatient }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const mesAtual = now.getMonth();
    const anoAtual = now.getFullYear();

    let aguardandoConfirmacao: { patientId: string; nome: string; data: string; horario: string }[] = [];
    let solicitacoesExclusao: { patientId: string; nome: string; em: string }[] = [];
    let proximos7Dias = 0;
    let receitaMes = 0;
    const trimestres = { t1: 0, t2: 0, t3: 0 };

    for (const p of patients) {
      const { weeks } = calculateWeeksAndDays(p.dum);
      if (weeks < 14) trimestres.t1++;
      else if (weeks < 28) trimestres.t2++;
      else trimestres.t3++;

      if (p.solicitacaoExclusao && !p.solicitacaoExclusao.atendida) {
        solicitacoesExclusao.push({ patientId: p.id, nome: p.nome, em: p.solicitacaoExclusao.em });
      }

      for (const ag of p.agendaConsultas || []) {
        const dataAg = new Date(ag.data);
        if (ag.status === 'solicitada') {
          aguardandoConfirmacao.push({ patientId: p.id, nome: p.nome, data: ag.data, horario: ag.horario });
        }
        if ((ag.status === 'confirmada' || ag.status === 'encaixe_urgente') && dataAg >= now && dataAg <= in7Days) {
          proximos7Dias++;
        }
      }

      for (const lanc of p.historicoFinanceiro || []) {
        const dataLanc = new Date(lanc.data);
        if (lanc.statusPagamento === 'pago' && dataLanc.getMonth() === mesAtual && dataLanc.getFullYear() === anoAtual) {
          receitaMes += lanc.valor;
        }
      }
    }

    aguardandoConfirmacao.sort((a, b) => a.data.localeCompare(b.data));

    return { aguardandoConfirmacao, solicitacoesExclusao, proximos7Dias, receitaMes, trimestres, total: patients.length };
  }, [patients]);

  const tiles: StatTile[] = [
    {
      label: 'Gestantes Ativas',
      value: String(stats.total),
      icon: <Users className="w-5 h-5" />,
      accent: 'text-[var(--brand-primary)] bg-emerald-50'
    },
    {
      label: 'Aguardando Confirmação',
      value: String(stats.aguardandoConfirmacao.length),
      icon: <Clock className="w-5 h-5" />,
      accent: 'text-amber-700 bg-amber-50'
    },
    {
      label: 'Consultas em 7 Dias',
      value: String(stats.proximos7Dias),
      icon: <CalendarCheck className="w-5 h-5" />,
      accent: 'text-sky-700 bg-sky-50'
    },
    {
      label: 'Receita do Mês (Pago)',
      value: stats.receitaMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      icon: <Wallet className="w-5 h-5" />,
      accent: 'text-[#8a6d1a] bg-[#FDF6E3]'
    }
  ];

  const maxTrimestre = Math.max(1, stats.trimestres.t1, stats.trimestres.t2, stats.trimestres.t3);

  return (
    <div className="space-y-6">
      {stats.solicitacoesExclusao.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
          <span className="text-amber-900 font-bold text-xs flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" /> {stats.solicitacoesExclusao.length} solicitação(ões) de exclusão de dados (LGPD)
          </span>
          <div className="flex flex-wrap gap-2">
            {stats.solicitacoesExclusao.map((item) => (
              <button
                key={item.patientId}
                onClick={() => onSelectPatient(item.patientId)}
                className="px-3 py-1.5 bg-white border border-amber-200 text-amber-800 rounded-lg text-[11px] font-bold cursor-pointer hover:bg-amber-100"
              >
                {item.nome} — {new Date(item.em).toLocaleDateString('pt-BR')}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tile.accent}`}>{tile.icon}</div>
            <div>
              <div className="text-xl font-bold text-gray-900 tabular-nums">{tile.value}</div>
              <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wide">{tile.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 text-sm">Gestantes por Trimestre</h3>
          {[
            { label: '1º Trimestre (até 13 sem)', value: stats.trimestres.t1 },
            { label: '2º Trimestre (14 a 27 sem)', value: stats.trimestres.t2 },
            { label: '3º Trimestre (28+ sem)', value: stats.trimestres.t3 }
          ].map((row) => (
            <div key={row.label} className="space-y-1">
              <div className="flex justify-between text-[11px] text-gray-600 font-medium">
                <span>{row.label}</span>
                <span className="tabular-nums font-bold">{row.value}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--brand-primary)] rounded-full"
                  style={{ width: `${(row.value / maxTrimestre) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {stats.total === 0 && (
            <p className="text-xs text-gray-400">Nenhuma gestante cadastrada ainda.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-3">
          <h3 className="font-bold text-gray-900 text-sm">Solicitações Pendentes</h3>
          {stats.aguardandoConfirmacao.length === 0 ? (
            <p className="text-xs text-gray-400">Nenhuma solicitação de consulta aguardando confirmação.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats.aguardandoConfirmacao.map((item, i) => (
                <button
                  key={`${item.patientId}-${i}`}
                  onClick={() => onSelectPatient(item.patientId)}
                  className="w-full flex justify-between items-center p-3 bg-amber-50/60 border border-amber-100 rounded-xl text-left hover:bg-amber-50 transition-all cursor-pointer"
                >
                  <span className="text-xs font-bold text-gray-800">{item.nome}</span>
                  <span className="text-[11px] text-amber-800 font-bold tabular-nums">
                    {formatDateBR(item.data)} às {item.horario}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
