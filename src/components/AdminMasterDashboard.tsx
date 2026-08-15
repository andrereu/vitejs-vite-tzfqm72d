import React, { useState } from 'react';
import { 
  Users, DollarSign, Clock, ShieldCheck, Plus, 
  Search, CheckCircle2, XCircle, MoreVertical, 
  CreditCard, ArrowUpRight, Lock, Calendar, RefreshCw
} from 'lucide-react';
import { DoctorTenant, SaaSMetrics } from '../types/saas';

interface AdminMasterDashboardProps {
  doctors: DoctorTenant[];
  onSaveDoctors: (updatedList: DoctorTenant[]) => Promise<void>;
  onLogout: () => void;
}

export const AdminMasterDashboard: React.FC<AdminMasterDashboardProps> = ({ 
  doctors, 
  onSaveDoctors, 
  onLogout 
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newDoc, setNewDoc] = useState({
    nome: '',
    email: '',
    crm: '',
    telefone: '',
    clinicaNome: '',
    plano: 'individual_pro' as const,
    diasTrial: 14
  });

  const metrics: SaaSMetrics = {
    mrr: doctors.reduce((acc, doc) => acc + (doc.status === 'active' ? (doc.valorMensalidade || 0) : 0), 0),
    totalMedicos: doctors.length,
    medicosAtivos: doctors.filter(d => d.status === 'active').length,
    trialsEmCurso: doctors.filter(d => d.status === 'trialing').length,
    totalGestantes: doctors.reduce((acc, d) => acc + (d.totalPacientes || 0), 0)
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    const created: DoctorTenant = {
      id: `doc-${Date.now()}`,
      nome: newDoc.nome,
      email: newDoc.email.toLowerCase().trim(),
      crm: newDoc.crm,
      telefone: newDoc.telefone,
      clinicaNome: newDoc.clinicaNome || newDoc.nome,
      plano: newDoc.plano,
      status: 'trialing',
      trialEndsAt: new Date(Date.now() + newDoc.diasTrial * 86400000).toISOString().split('T')[0],
      diasRestantes: newDoc.diasTrial,
      totalPacientes: 0,
      dataCadastro: new Date().toISOString().split('T')[0],
      valorMensalidade: newDoc.plano === 'individual_pro' ? 89 : 199,
      metodoPagamento: 'pix'
    };

    await onSaveDoctors([created, ...doctors]);
    setShowAddModal(false);
    setNewDoc({ nome: '', email: '', crm: '', telefone: '', clinicaNome: '', plano: 'individual_pro', diasTrial: 14 });
  };

  const handleExtendTrial = async (id: string, daysToAdd: number) => {
    const updated = doctors.map(doc => {
      if (doc.id === id) {
        return {
          ...doc,
          diasRestantes: doc.diasRestantes + daysToAdd,
          status: 'trialing' as const
        };
      }
      return doc;
    });
    await onSaveDoctors(updated);
  };

  const handleToggleStatus = async (id: string) => {
    const updated = doctors.map(doc => {
      if (doc.id === id) {
        return {
          ...doc,
          status: doc.status === 'active' ? ('canceled' as const) : ('active' as const)
        };
      }
      return doc;
    });
    await onSaveDoctors(updated);
  };

  const filteredDoctors = doctors.filter(d => {
    const matchesSearch = d.nome.toLowerCase().includes(search.toLowerCase()) || 
                          d.email.toLowerCase().includes(search.toLowerCase()) ||
                          d.crm.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-16">
      
      {/* HEADER MASTER */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/20">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-tight">MaternaIA • Master Admin</h1>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                Super User
              </span>
            </div>
            <p className="text-xs text-slate-400">Gestão de Licenças, Assinaturas e Médicos Conectados</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Cadastrar Novo Médico
          </button>
          <button 
            onClick={onLogout}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            Sair do Painel
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-8">
        
        {/* CARDS DE MÉTRICAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-slate-800/60 border border-slate-700/80 p-5 rounded-3xl space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">MRR Estimado</span>
            <div className="flex items-baseline gap-1">
              <strong className="text-2xl font-black text-emerald-400">
                R$ {metrics.mrr.toFixed(2)}
              </strong>
              <span className="text-[10px] text-slate-400">/mês</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5 pt-1">
              <ArrowUpRight className="w-3 h-3" /> Faturamento Ativo
            </span>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 p-5 rounded-3xl space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Médicos Cadastrados</span>
            <strong className="text-2xl font-black text-white">{metrics.totalMedicos}</strong>
            <span className="text-[10px] text-slate-400 block pt-1">{metrics.medicosAtivos} ativos</span>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 p-5 rounded-3xl space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Trials em Andamento</span>
            <strong className="text-2xl font-black text-amber-400">{metrics.trialsEmCurso}</strong>
            <span className="text-[10px] text-amber-300/80 block pt-1">Testes de 14 dias</span>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 p-5 rounded-3xl space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total de Gestantes</span>
            <strong className="text-2xl font-black text-pink-400">{metrics.totalGestantes}</strong>
            <span className="text-[10px] text-slate-400 block pt-1">No ecossistema</span>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/80 p-5 rounded-3xl space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Status Gateway</span>
            <strong className="text-sm font-bold text-slate-200 block pt-1">PIX & Cartão</strong>
            <span className="text-[9px] bg-slate-700/80 text-slate-300 px-2 py-0.5 rounded-md inline-block mt-1">
              Pronto para Asaas/Stripe
            </span>
          </div>
        </div>

        {/* TABELA DE MÉDICOS */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-700/80 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Médicos & Assinaturas SaaS</h2>
              <p className="text-xs text-slate-400">Gerencie planos, bloqueios e liberação de acessos</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Buscar por nome, CRM ou e-mail..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-emerald-500"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-emerald-500"
              >
                <option value="all">Todos os Status</option>
                <option value="active">Ativos</option>
                <option value="trialing">Em Trial</option>
                <option value="canceled">Bloqueados / Cancelados</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
                <tr>
                  <th className="p-3.5">Médico / Consultório</th>
                  <th className="p-3.5">CRM & Contato</th>
                  <th className="p-3.5">Plano & Valor</th>
                  <th className="p-3.5">Status & Acesso</th>
                  <th className="p-3.5">Gestantes</th>
                  <th className="p-3.5 text-center">Ações Administrativas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {filteredDoctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-3.5">
                      <strong className="text-white text-sm block">{doc.nome}</strong>
                      <span className="text-[11px] text-slate-400">{doc.clinicaNome || 'Consultório'}</span>
                      <span className="text-[10px] text-slate-500 block">{doc.email}</span>
                    </td>

                    <td className="p-3.5">
                      <span className="bg-slate-700 text-slate-200 font-bold px-2 py-0.5 rounded text-[10px] inline-block mb-1">
                        CRM {doc.crm}
                      </span>
                      <span className="text-[11px] text-slate-400 block">{doc.telefone}</span>
                    </td>

                    <td className="p-3.5">
                      <strong className="text-amber-300 block">
                        {doc.plano === 'individual_pro' ? 'Obstetra Pro' : doc.plano === 'clinica_multi' ? 'Clínica Multi' : 'Trial Grátis'}
                      </strong>
                      <span className="text-slate-400 text-[11px]">
                        {doc.valorMensalidade > 0 ? `R$ ${doc.valorMensalidade.toFixed(2)}/mês` : 'Período de Teste'}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          doc.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          doc.status === 'trialing' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {doc.status === 'active' ? '● Ativo' : doc.status === 'trialing' ? `● Trial (${doc.diasRestantes} dias)` : '● Bloqueado'}
                        </span>
                        <span className="text-[10px] text-slate-500 block">Expira em: {doc.trialEndsAt}</span>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className="text-base font-bold text-pink-300">{doc.totalPacientes || 0}</span>
                      <span className="text-[10px] text-slate-500 block">gestantes ativas</span>
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleExtendTrial(doc.id, 15)}
                          className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                          title="+15 dias de teste"
                        >
                          +15 Dias
                        </button>
                        <button
                          onClick={() => handleToggleStatus(doc.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            doc.status === 'active' 
                              ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30' 
                              : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                          }`}
                        >
                          {doc.status === 'active' ? 'Bloquear' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL NOVO MÉDICO */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-3xl max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Criar Nova Conta Médica SaaS</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateDoctor} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Nome do Médico / Obstetra *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Dra. Ana Beatriz"
                  value={newDoc.nome}
                  onChange={(e) => setNewDoc({ ...newDoc, nome: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">CRM *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: 12345-PR"
                    value={newDoc.crm}
                    onChange={(e) => setNewDoc({ ...newDoc, crm: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">WhatsApp</label>
                  <input 
                    type="text" 
                    placeholder="(41) 99999-9999"
                    value={newDoc.telefone}
                    onChange={(e) => setNewDoc({ ...newDoc, telefone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">E-mail de Acesso *</label>
                <input 
                  type="email" 
                  required
                  placeholder="medico@consultorio.com.br"
                  value={newDoc.email}
                  onChange={(e) => setNewDoc({ ...newDoc, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Plano Inicial</label>
                  <select 
                    value={newDoc.plano}
                    onChange={(e: any) => setNewDoc({ ...newDoc, plano: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="individual_pro">Obstetra Pro (R$ 89)</option>
                    <option value="clinica_multi">Clínica Multi (R$ 199)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Dias de Trial</label>
                  <input 
                    type="number" 
                    value={newDoc.diasTrial}
                    onChange={(e) => setNewDoc({ ...newDoc, diasTrial: parseInt(e.target.value) || 14 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-900/30"
                >
                  Salvar & Liberar Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMasterDashboard;
