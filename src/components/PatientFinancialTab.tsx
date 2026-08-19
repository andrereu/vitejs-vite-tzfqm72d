import React, { useState } from 'react';
import {
  DollarSign, Plus, CheckCircle2, Clock, AlertTriangle,
  Trash2, ShieldCheck
} from 'lucide-react';
import type { Patient, PatientFinancialRecord } from '../types/prenatal';
import { formatDateBR } from '../utils/formatters';

interface PatientFinancialTabProps {
  patient: Patient;
  onUpdatePatient: (updated: Patient) => Promise<void> | void;
  canEdit: boolean;
}

const CONVENIOS_POPULARES = [
  'Unimed',
  'Bradesco Saúde',
  'SulAmérica',
  'Amil',
  'Paraná Clínicas',
  'Nossa Saúde',
  'Sanepar / Fundação Sanepar',
  'ICS Curitiba',
  'Outro Convênio'
];

export const PatientFinancialTab: React.FC<PatientFinancialTabProps> = ({
  patient,
  onUpdatePatient,
  canEdit
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterTipo, setFilterTipo] = useState<'todos' | 'particular' | 'convenio'>('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pago' | 'pendente' | 'glosado'>('todos');

  // Form State
  const [novoLancamento, setNovoLancamento] = useState<Partial<PatientFinancialRecord>>({
    data: new Date().toISOString().split('T')[0],
    descricao: 'Consulta Pré-Natal de Rotina',
    valor: 250,
    tipoAtendimento: patient.tipoAtendimentoPadrao || 'particular',
    convenioNome: patient.convenioNome || 'Unimed',
    statusPagamento: 'pago',
    formaPagamento: 'pix'
  });

  // Dados cadastrais de convênio da paciente
  const [tipoPadrao, setTipoPadrao] = useState<'particular' | 'convenio'>(patient.tipoAtendimentoPadrao || 'particular');
  const [nomeConvenio, setNomeConvenio] = useState(patient.convenioNome || '');
  const [numCarteirinha, setNumCarteirinha] = useState(patient.numeroCarteirinhaConvenio || '');
  const [isSavingConvenio, setIsSavingConvenio] = useState(false);

  const records = patient.historicoFinanceiro || [];

  // Cálculos financeiros da gestante
  const totalRecebido = records
    .filter(r => r.statusPagamento === 'pago')
    .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

  const totalPendente = records
    .filter(r => r.statusPagamento === 'pendente')
    .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

  const totalGlosado = records
    .filter(r => r.statusPagamento === 'glosado')
    .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

  const handleSaveConvenioConfig = async () => {
    setIsSavingConvenio(true);
    try {
      const updated: Patient = {
        ...patient,
        tipoAtendimentoPadrao: tipoPadrao,
        convenioNome: tipoPadrao === 'convenio' ? nomeConvenio : '',
        numeroCarteirinhaConvenio: tipoPadrao === 'convenio' ? numCarteirinha : ''
      };
      await onUpdatePatient(updated);
      alert('Dados de convênio atualizados com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar dados de convênio.');
    } finally {
      setIsSavingConvenio(false);
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoLancamento.descricao || !novoLancamento.valor) return;

    const item: PatientFinancialRecord = {
      id: `fin-${Date.now()}`,
      data: novoLancamento.data || new Date().toISOString().split('T')[0],
      descricao: novoLancamento.descricao,
      valor: Number(novoLancamento.valor),
      tipoAtendimento: novoLancamento.tipoAtendimento || 'particular',
      convenioNome: novoLancamento.tipoAtendimento === 'convenio' ? (novoLancamento.convenioNome || 'Convênio') : undefined,
      statusPagamento: novoLancamento.statusPagamento || 'pago',
      formaPagamento: novoLancamento.tipoAtendimento === 'convenio' ? 'faturamento_guia' : novoLancamento.formaPagamento
    };

    const updatedRecords = [item, ...records];
    const updated: Patient = { ...patient, historicoFinanceiro: updatedRecords };
    await onUpdatePatient(updated);

    setShowAddModal(false);
    setNovoLancamento({
      data: new Date().toISOString().split('T')[0],
      descricao: 'Consulta Pré-Natal de Rotina',
      valor: 250,
      tipoAtendimento: patient.tipoAtendimentoPadrao || 'particular',
      convenioNome: patient.convenioNome || 'Unimed',
      statusPagamento: 'pago',
      formaPagamento: 'pix'
    });
  };

  const handleToggleStatus = async (recordId: string, novoStatus: 'pago' | 'pendente' | 'glosado') => {
    const updatedRecords = records.map(r => r.id === recordId ? { ...r, statusPagamento: novoStatus } : r);
    const updated: Patient = { ...patient, historicoFinanceiro: updatedRecords };
    await onUpdatePatient(updated);
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('Deseja realmente excluir este lançamento financeiro?')) return;
    const updatedRecords = records.filter(r => r.id !== recordId);
    const updated: Patient = { ...patient, historicoFinanceiro: updatedRecords };
    await onUpdatePatient(updated);
  };

  const filteredRecords = records.filter(r => {
    if (filterTipo !== 'todos' && r.tipoAtendimento !== filterTipo) return false;
    if (filterStatus !== 'todos' && r.statusPagamento !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* 1. CONFIGURAÇÃO DE COBERTURA / CONVÊNIO DA GESTANTE */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
          <div>
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2E482A]" />
              Tipo de Atendimento & Cobertura
            </h3>
            <p className="text-xs text-gray-500">Defina se a paciente realiza o pré-natal particular ou por plano de saúde</p>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={handleSaveConvenioConfig}
              disabled={isSavingConvenio}
              className="px-3.5 py-1.5 bg-[#2E482A] hover:bg-[#233820] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-all"
            >
              {isSavingConvenio ? 'Salvando...' : 'Salvar Cobertura'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="font-bold text-gray-700 block mb-1">Modalidade Principal</label>
            <select
              disabled={!canEdit}
              value={tipoPadrao}
              onChange={(e) => setTipoPadrao(e.target.value as any)}
              className="w-full p-2.5 bg-gray-50 border rounded-xl font-bold"
            >
              <option value="particular">💎 Particular</option>
              <option value="convenio">🏥 Convênio / Plano de Saúde</option>
            </select>
          </div>

          {tipoPadrao === 'convenio' && (
            <>
              <div>
                <label className="font-bold text-gray-700 block mb-1">Operadora / Convênio</label>
                <select
                  disabled={!canEdit}
                  value={nomeConvenio}
                  onChange={(e) => setNomeConvenio(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                >
                  <option value="">Selecione a operadora...</option>
                  {CONVENIOS_POPULARES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Nº Carteirinha / Matrícula</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  placeholder="Ex: 0054.1234.5678-00"
                  value={numCarteirinha}
                  onChange={(e) => setNumCarteirinha(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. CARDS DE RESUMO FINANCEIRO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[10px] font-bold uppercase">Total Recebido / Liquidado</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            R$ {totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-gray-500">Consultas e procedimentos quitados</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[10px] font-bold uppercase">Pendente / Guias a Receber</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">
            R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-gray-500">Faturamento pendente</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[10px] font-bold uppercase">Glosas / Não Autorizados</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700">
            R$ {totalGlosado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-gray-500">Procedimentos recusados pelo convênio</span>
        </div>
      </div>

      {/* 3. HISTÓRICO DE LANÇAMENTOS E BOTÃO DE NOVO ITEM */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Extrato Financeiro da Gestante</h3>
            <p className="text-xs text-gray-500">Registro detalhado de consultas, procedimentos e guias</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Filtros */}
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value as any)}
              className="text-xs p-2 bg-gray-50 border rounded-xl"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="particular">Particular</option>
              <option value="convenio">Convênio</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="text-xs p-2 bg-gray-50 border rounded-xl"
            >
              <option value="todos">Todos os Status</option>
              <option value="pago">Quitados / Pagos</option>
              <option value="pendente">Pendentes</option>
              <option value="glosado">Glosados</option>
            </select>

            {canEdit && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-2 bg-[#2E482A] hover:bg-[#233820] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <Plus className="w-4 h-4" /> + Lançar Pagamento
              </button>
            )}
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-xs space-y-2">
            <DollarSign className="w-8 h-8 mx-auto text-gray-300" />
            <p>Nenhum lançamento financeiro encontrado com os filtros selecionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 font-bold text-gray-700">Data</th>
                  <th className="p-3 font-bold text-gray-700">Descrição</th>
                  <th className="p-3 font-bold text-gray-700">Modalidade</th>
                  <th className="p-3 font-bold text-gray-700">Forma Pagto</th>
                  <th className="p-3 font-bold text-gray-700">Valor (R$)</th>
                  <th className="p-3 font-bold text-gray-700">Status</th>
                  {canEdit && <th className="p-3 font-bold text-gray-700 text-center">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="p-3 font-bold text-gray-800">{formatDateBR(item.data)}</td>
                    <td className="p-3">
                      <strong className="text-gray-900 block">{item.descricao}</strong>
                    </td>
                    <td className="p-3">
                      {item.tipoAtendimento === 'particular' ? (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md font-bold text-[10px]">
                          💎 Particular
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded-md font-bold text-[10px]">
                          🏥 {item.convenioNome || 'Convênio'}
                        </span>
                      )}
                    </td>
                    <td className="p-3 uppercase text-gray-600 font-mono text-[11px]">
                      {item.formaPagamento?.replace('_', ' ') || 'PIX'}
                    </td>
                    <td className="p-3 font-bold text-gray-900 text-sm">
                      R$ {Number(item.valor).toFixed(2)}
                    </td>
                    <td className="p-3">
                      {item.statusPagamento === 'pago' && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> PAGO
                        </span>
                      )}
                      {item.statusPagamento === 'pendente' && (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> PENDENTE
                        </span>
                      )}
                      {item.statusPagamento === 'glosado' && (
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> GLOSADO
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.statusPagamento !== 'pago' && (
                            <button
                              onClick={() => handleToggleStatus(item.id, 'pago')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                              title="Marcar como Pago"
                            >
                              Dar Baixa
                            </button>
                          )}
                          {item.statusPagamento === 'pago' && (
                            <button
                              onClick={() => handleToggleStatus(item.id, 'pendente')}
                              className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                              title="Marcar como Pendente"
                            >
                              Pendente
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteRecord(item.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Excluir Lançamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL ADICIONAR LANÇAMENTO */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-gray-800">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#2E482A]" />
                Lançar Pagamento / Procedimento
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleAddRecord} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Descrição do Atendimento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Consulta Pré-Natal, Parto Normal, Cardiotoco"
                  value={novoLancamento.descricao}
                  onChange={(e) => setNovoLancamento({ ...novoLancamento, descricao: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={novoLancamento.data}
                    onChange={(e) => setNovoLancamento({ ...novoLancamento, data: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={novoLancamento.valor}
                    onChange={(e) => setNovoLancamento({ ...novoLancamento, valor: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-bold text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Tipo de Cobertura</label>
                  <select
                    value={novoLancamento.tipoAtendimento}
                    onChange={(e) => setNovoLancamento({ ...novoLancamento, tipoAtendimento: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-bold"
                  >
                    <option value="particular">Particular</option>
                    <option value="convenio">Convênio</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Status Inicial</label>
                  <select
                    value={novoLancamento.statusPagamento}
                    onChange={(e) => setNovoLancamento({ ...novoLancamento, statusPagamento: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-bold"
                  >
                    <option value="pago">Pago / Quitado</option>
                    <option value="pendente">Pendente / Faturar</option>
                    <option value="glosado">Glosado</option>
                  </select>
                </div>
              </div>

              {novoLancamento.tipoAtendimento === 'convenio' ? (
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Convênio / Operadora</label>
                  <select
                    value={novoLancamento.convenioNome}
                    onChange={(e) => setNovoLancamento({ ...novoLancamento, convenioNome: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl"
                  >
                    {CONVENIOS_POPULARES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Forma de Pagamento</label>
                  <select
                    value={novoLancamento.formaPagamento}
                    onChange={(e) => setNovoLancamento({ ...novoLancamento, formaPagamento: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl"
                  >
                    <option value="pix">PIX</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="dinheiro">Dinheiro</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#2E482A] hover:bg-[#233820] text-white font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
