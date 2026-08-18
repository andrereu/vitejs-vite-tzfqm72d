import React, { useState } from 'react';
import {
  Users, DollarSign, Clock, ShieldCheck,
  Search, CheckCircle2, Ban, X,
  Save, LogOut, Settings, UserPlus, Terminal, Pencil, Receipt
} from 'lucide-react';
import type { DoctorTenant, SaasGlobalConfig } from '../types/saas';
import { useDoctorPatientCounts } from '../hooks/useDoctorPatientCounts';
import { usePaymentHistory } from '../hooks/usePaymentHistory';

interface AdminMasterDashboardProps {
  doctors: DoctorTenant[];
  globalConfig: SaasGlobalConfig;
  onSaveDoctors: (updatedList: DoctorTenant[]) => Promise<void> | void;
  onSaveGlobalConfig: (config: SaasGlobalConfig) => Promise<void> | void;
  onLogout: () => void;
}

// Visual propositalmente diferente do painel da médica (verde/dourado,
// cantos bem arredondados): aqui é um "painel de operações" escuro, com
// cantos mais retos e números grandes — pra ficar claro, só de olhar, que
// é uma ferramenta interna, não a área de atendimento da clínica.
const inputClasses = 'w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500';
const labelClasses = 'font-bold text-slate-400 uppercase text-[10px] block mb-1 tracking-wider';

export const AdminMasterDashboard: React.FC<AdminMasterDashboardProps> = ({
  doctors,
  globalConfig,
  onSaveDoctors,
  onSaveGlobalConfig,
  onLogout
}) => {
  const [search, setSearch] = useState('');
  const [showNewDoctorModal, setShowNewDoctorModal] = useState(false);
  const [showPaymentConfigModal, setShowPaymentConfigModal] = useState(false);
  const [paymentConfigForm, setPaymentConfigForm] = useState<SaasGlobalConfig>(globalConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const patientCounts = useDoctorPatientCounts(doctors.map((d) => d.id));

  const [editingDoctor, setEditingDoctor] = useState<DoctorTenant | null>(null);
  const [editDoctorForm, setEditDoctorForm] = useState({
    nome: '',
    email: '',
    crm: '',
    telefone: '',
    clinicaNome: '',
    especialidade: '',
    plano: 'individual_pro' as 'individual_pro' | 'clinica_multi',
    valorMensalidade: 89
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [historyDoctorId, setHistoryDoctorId] = useState<string | null>(null);
  const { payments: paymentHistory, recordManualPayment } = usePaymentHistory(historyDoctorId);
  const historyDoctor = doctors.find((d) => d.id === historyDoctorId) || null;

  // Form State para Novo Médico
  const [newDoctor, setNewDoctor] = useState({
    nome: '',
    email: '',
    crm: '',
    telefone: '',
    clinicaNome: '',
    especialidade: 'Obstetrícia e Ginecologia',
    plano: 'individual_pro' as 'individual_pro' | 'clinica_multi',
    trialDays: 7
  });

  // Cálculos em tempo real
  const totalDoctors = doctors.length;
  const activeDoctors = doctors.filter(d => d.status === 'active').length;
  const trialDoctors = doctors.filter(d => d.status === 'trial').length;
  const blockedDoctors = doctors.filter(d => d.status === 'blocked' || d.status === 'past_due').length;

  const mrr = doctors
    .filter(d => d.status === 'active')
    .reduce((acc, curr) => acc + (curr.valorMensalidade || 89), 0);

  const totalPatients = Object.values(patientCounts).reduce((acc, count) => acc + count, 0);

  const handleOpenPaymentConfig = () => {
    setPaymentConfigForm(globalConfig);
    setShowPaymentConfigModal(true);
  };

  const handleSavePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      await onSaveGlobalConfig(paymentConfigForm);
      setShowPaymentConfigModal(false);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleStatusChange = async (doctorId: string, newStatus: DoctorTenant['status']) => {
    const targetDoctor = doctors.find(d => d.id === doctorId);
    const updated = doctors.map(d => {
      if (d.id === doctorId) {
        const hoje = new Date();
        const novaValidade = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        return {
          ...d,
          status: newStatus,
          ultimoPagamento: newStatus === 'active' ? hoje.toISOString().split('T')[0] : d.ultimoPagamento,
          validadeAssinatura: newStatus === 'active' ? novaValidade : d.validadeAssinatura
        };
      }
      return d;
    });
    await onSaveDoctors(updated);

    if (newStatus === 'active' && targetDoctor) {
      await recordManualPayment(doctorId, targetDoctor.valorMensalidade || 89);
    }
  };

  const handleOpenEditDoctor = (doctor: DoctorTenant) => {
    setEditingDoctor(doctor);
    setEditDoctorForm({
      nome: doctor.nome,
      email: doctor.email,
      crm: doctor.crm,
      telefone: doctor.telefone || '',
      clinicaNome: doctor.clinicaNome || '',
      especialidade: doctor.especialidade || '',
      plano: doctor.plano,
      valorMensalidade: doctor.valorMensalidade || 89
    });
  };

  const handleSaveEditDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;
    setIsSavingEdit(true);
    try {
      const updated = doctors.map(d =>
        d.id === editingDoctor.id
          ? {
              ...d,
              nome: editDoctorForm.nome,
              email: editDoctorForm.email.toLowerCase().trim(),
              crm: editDoctorForm.crm.trim(),
              telefone: editDoctorForm.telefone,
              clinicaNome: editDoctorForm.clinicaNome,
              especialidade: editDoctorForm.especialidade,
              plano: editDoctorForm.plano,
              valorMensalidade: Number(editDoctorForm.valorMensalidade)
            }
          : d
      );
      await onSaveDoctors(updated);
      setEditingDoctor(null);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleExtendTrial = async (doctorId: string, diasExtras: number) => {
    const updated = doctors.map(d => {
      if (d.id === doctorId) {
        const base = new Date(d.trialEndsAt || new Date().toISOString().split('T')[0]);
        const novaData = new Date(base.getTime() + diasExtras * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        return {
          ...d,
          trialEndsAt: novaData,
          status: 'trial' as const
        };
      }
      return d;
    });
    await onSaveDoctors(updated);
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctor.nome || !newDoctor.email || !newDoctor.crm) return;

    setIsSaving(true);
    try {
      const hoje = new Date();
      const trialEnds = new Date(hoje.getTime() + Number(newDoctor.trialDays) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const createdDoctor: DoctorTenant = {
        id: `doc-${Date.now()}`,
        nome: newDoctor.nome,
        email: newDoctor.email.toLowerCase().trim(),
        crm: newDoctor.crm.trim(),
        telefone: newDoctor.telefone,
        clinicaNome: newDoctor.clinicaNome || `Consultório ${newDoctor.nome}`,
        especialidade: newDoctor.especialidade,
        enderecoConsultorio: '',
        plano: newDoctor.plano,
        status: 'trial',
        trialEndsAt: trialEnds,
        totalPacientes: 0,
        dataCadastro: hoje.toISOString().split('T')[0],
        valorMensalidade: newDoctor.plano === 'clinica_multi' ? 179 : 89
      };

      const updated = [...doctors, createdDoctor];
      await onSaveDoctors(updated);

      setShowNewDoctorModal(false);
      setNewDoctor({
        nome: '',
        email: '',
        crm: '',
        telefone: '',
        clinicaNome: '',
        especialidade: 'Obstetrícia e Ginecologia',
        plano: 'individual_pro',
        trialDays: 7
      });
    } catch (err) {
      console.error(err);
      alert('Erro ao cadastrar novo médico.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredDoctors = doctors.filter(d =>
    (d.nome || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.crm || '').includes(search)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* CABEÇALHO */}
        <div className="bg-black border border-slate-800 text-white p-6 rounded-xl shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-sky-400 uppercase font-bold tracking-widest block font-mono">
                painel-admin // maternaia-saas
              </span>
              <h2 className="text-2xl font-bold text-white mt-0.5">Gestão de Clínicas & Assinaturas</h2>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-all border border-slate-700"
          >
            <LogOut className="w-4 h-4" /> Sair do Painel
          </button>
        </div>

        {/* CARDS DE MÉTRICAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 border-l-4 border-l-sky-500 space-y-1">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">MRR (Recorrência Mensal)</span>
              <DollarSign className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-3xl font-mono font-bold text-white">
              R$ {mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-sky-400 font-medium">
              {activeDoctors} assinaturas ativas
            </span>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 border-l-4 border-l-indigo-500 space-y-1">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Médicos Cadastrados</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-mono font-bold text-white">{totalDoctors}</div>
            <span className="text-[11px] text-slate-500 font-medium">
              {trialDoctors} em degustação / {blockedDoctors} pendentes
            </span>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 border-l-4 border-l-fuchsia-500 space-y-1">
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Gestantes no Sistema</span>
              <ShieldCheck className="w-4 h-4 text-fuchsia-400" />
            </div>
            <div className="text-3xl font-mono font-bold text-white">{totalPatients}</div>
            <span className="text-[11px] text-fuchsia-400 font-medium">
              Base ativa de pacientes
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenPaymentConfig}
            className="bg-slate-900 p-5 rounded-xl border border-slate-800 border-l-4 border-l-amber-500 space-y-1 text-left cursor-pointer hover:border-slate-700 transition-all"
            title="Clique para editar a chave PIX e os dados de recebimento"
          >
            <div className="flex justify-between items-center text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Chave PIX Recebimento</span>
              <Settings className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-sm font-mono font-bold text-white truncate">
              {globalConfig.pixKey || 'Não configurada — clique para definir'}
            </div>
            <span className="text-[11px] text-slate-500 font-medium uppercase">
              {globalConfig.pixKeyType || 'pix manual'}
            </span>
          </button>
        </div>

        {/* LISTAGEM DE MÉDICOS & AÇÕES */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-slate-100 text-base">Controle de Assinaturas</h3>
              <p className="text-xs text-slate-500">Libere acessos após conferência do PIX ou cadastre novas contas</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar médico, CRM ou e-mail..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                onClick={() => setShowNewDoctorModal(true)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" /> Novo Médico
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Médico(a) / Clínica</th>
                  <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Plano & Valor</th>
                  <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Status Atual</th>
                  <th className="p-3 font-bold text-slate-500 uppercase tracking-wider">Vencimento / Trial</th>
                  <th className="p-3 font-bold text-slate-500 uppercase tracking-wider text-center">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredDoctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/40">
                    <td className="p-3">
                      <strong className="text-slate-100 block font-bold">{doc.nome}</strong>
                      <span className="text-[11px] text-slate-500 block">
                        CRM {doc.crm} • {doc.email}
                      </span>
                      <span className="text-[10px] text-sky-400 font-medium block">
                        {doc.clinicaNome || 'Consultório'}
                      </span>
                    </td>

                    <td className="p-3">
                      <span className="font-mono font-bold text-slate-100 block">
                        R$ {(doc.valorMensalidade || 89).toFixed(2)}/mês
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase">
                        {doc.plano === 'individual_pro' ? 'Individual Pro' : 'Clínica Multi'}
                      </span>
                    </td>

                    <td className="p-3">
                      {doc.status === 'active' && (
                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> ATIVO
                        </span>
                      )}
                      {doc.status === 'trial' && (
                        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> DEGUSTAÇÃO
                        </span>
                      )}
                      {(doc.status === 'past_due' || doc.status === 'blocked') && (
                        <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                          <Ban className="w-3 h-3" /> BLOQUEADO
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-slate-400">
                      {doc.status === 'active' ? (
                        <div>
                          <span className="font-bold text-slate-100 block">
                            {doc.validadeAssinatura ? new Date(doc.validadeAssinatura).toLocaleDateString('pt-BR') : 'Sem data'}
                          </span>
                          <span className="text-[10px] text-slate-500">Validade do PIX</span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-bold text-slate-100 block">
                            {doc.trialEndsAt ? new Date(doc.trialEndsAt).toLocaleDateString('pt-BR') : 'Expirado'}
                          </span>
                          <span className="text-[10px] text-slate-500">Fim do Trial</span>
                        </div>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {doc.status !== 'active' && (
                          <button
                            onClick={() => handleStatusChange(doc.id, 'active')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-bold text-[10px] cursor-pointer shadow-xs"
                            title="Confirmar PIX e ativar por +30 dias"
                          >
                            Confirmar PIX
                          </button>
                        )}

                        {doc.status === 'trial' && (
                          <button
                            onClick={() => handleExtendTrial(doc.id, 7)}
                            className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-md font-bold text-[10px] cursor-pointer"
                            title="Dar +7 dias de degustação"
                          >
                            +7d Trial
                          </button>
                        )}

                        {doc.status === 'active' && (
                          <button
                            onClick={() => handleStatusChange(doc.id, 'blocked')}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-md font-bold text-[10px] cursor-pointer"
                            title="Suspender acesso"
                          >
                            Bloquear
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenEditDoctor(doc)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md cursor-pointer border border-slate-700"
                          title="Editar dados cadastrais"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>

                        <button
                          onClick={() => setHistoryDoctorId(doc.id)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md cursor-pointer border border-slate-700"
                          title="Ver histórico de pagamentos"
                        >
                          <Receipt className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL CADASTRAR NOVO MÉDICO */}
        {showNewDoctorModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-100">

              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">Cadastrar Novo Médico</h3>
                    <p className="text-xs text-slate-500">Crie a conta e libere o período de testes</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewDoctorModal(false)}
                  className="text-slate-500 hover:text-slate-200 cursor-pointer p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateDoctor} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClasses}>Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Dr. Lucas Silveira"
                      value={newDoctor.nome}
                      onChange={(e) => setNewDoctor({ ...newDoctor, nome: e.target.value })}
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <label className={labelClasses}>CRM com UF *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 34567-PR"
                      value={newDoctor.crm}
                      onChange={(e) => setNewDoctor({ ...newDoctor, crm: e.target.value })}
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <label className={labelClasses}>E-mail de Acesso *</label>
                    <input
                      type="email"
                      required
                      placeholder="medico@clinica.com.br"
                      value={newDoctor.email}
                      onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <label className={labelClasses}>WhatsApp / Telefone</label>
                    <input
                      type="text"
                      placeholder="(41) 99999-9999"
                      value={newDoctor.telefone}
                      onChange={(e) => setNewDoctor({ ...newDoctor, telefone: e.target.value })}
                      className={inputClasses}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClasses}>Nome da Clínica / Consultório</label>
                    <input
                      type="text"
                      placeholder="Ex: Clínica Materno Fetal"
                      value={newDoctor.clinicaNome}
                      onChange={(e) => setNewDoctor({ ...newDoctor, clinicaNome: e.target.value })}
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <label className={labelClasses}>Plano Inicial</label>
                    <select
                      value={newDoctor.plano}
                      onChange={(e) => setNewDoctor({ ...newDoctor, plano: e.target.value as any })}
                      className={`${inputClasses} font-bold`}
                    >
                      <option value="individual_pro">Individual Pro (R$ 89/mês)</option>
                      <option value="clinica_multi">Clínica Multi (R$ 179/mês)</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClasses}>Dias de Degustação</label>
                    <select
                      value={newDoctor.trialDays}
                      onChange={(e) => setNewDoctor({ ...newDoctor, trialDays: Number(e.target.value) })}
                      className={`${inputClasses} font-bold`}
                    >
                      <option value={7}>7 dias grátis</option>
                      <option value={14}>14 dias grátis</option>
                      <option value={30}>30 dias grátis</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowNewDoctorModal(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg cursor-pointer border border-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" /> {isSaving ? 'Cadastrando...' : 'Cadastrar Médico'}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

        {/* MODAL CONFIGURAR RECEBIMENTO (PIX GLOBAL DO SAAS) */}
        {showPaymentConfigModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-100">

              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">Configurar Recebimento</h3>
                    <p className="text-xs text-slate-500">Chave PIX exibida às médicas na renovação manual</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPaymentConfigModal(false)}
                  className="text-slate-500 hover:text-slate-200 cursor-pointer p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePaymentConfig} className="space-y-3 text-xs">
                <div>
                  <label className={labelClasses}>Chave PIX *</label>
                  <input
                    type="text"
                    required
                    placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                    value={paymentConfigForm.pixKey}
                    onChange={(e) => setPaymentConfigForm({ ...paymentConfigForm, pixKey: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>Tipo da Chave</label>
                  <select
                    value={paymentConfigForm.pixKeyType}
                    onChange={(e) => setPaymentConfigForm({ ...paymentConfigForm, pixKeyType: e.target.value as SaasGlobalConfig['pixKeyType'] })}
                    className={`${inputClasses} font-bold`}
                  >
                    <option value="cpf">CPF</option>
                    <option value="cnpj">CNPJ</option>
                    <option value="email">E-mail</option>
                    <option value="telefone">Telefone</option>
                    <option value="aleatoria">Chave Aleatória</option>
                  </select>
                </div>

                <div>
                  <label className={labelClasses}>Nome do Recebedor</label>
                  <input
                    type="text"
                    placeholder="Ex: MaternaIA Tecnologia"
                    value={paymentConfigForm.nomeRecebedor}
                    onChange={(e) => setPaymentConfigForm({ ...paymentConfigForm, nomeRecebedor: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>WhatsApp de Suporte</label>
                  <input
                    type="text"
                    placeholder="Ex: 5541999999999"
                    value={paymentConfigForm.suporteWhatsapp}
                    onChange={(e) => setPaymentConfigForm({ ...paymentConfigForm, suporteWhatsapp: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowPaymentConfigModal(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg cursor-pointer border border-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingConfig}
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" /> {isSavingConfig ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

      {/* MODAL EDITAR MÉDICO */}
      {editingDoctor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-100">

            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-base">Editar Médico</h3>
                  <p className="text-xs text-slate-500">{editingDoctor.nome}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDoctor(null)}
                className="text-slate-500 hover:text-slate-200 cursor-pointer p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDoctor} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClasses}>Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={editDoctorForm.nome}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, nome: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>CRM com UF *</label>
                  <input
                    type="text"
                    required
                    value={editDoctorForm.crm}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, crm: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>E-mail de Acesso *</label>
                  <input
                    type="email"
                    required
                    value={editDoctorForm.email}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, email: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>WhatsApp / Telefone</label>
                  <input
                    type="text"
                    value={editDoctorForm.telefone}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, telefone: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClasses}>Nome da Clínica / Consultório</label>
                  <input
                    type="text"
                    value={editDoctorForm.clinicaNome}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, clinicaNome: e.target.value })}
                    className={inputClasses}
                  />
                </div>

                <div>
                  <label className={labelClasses}>Plano</label>
                  <select
                    value={editDoctorForm.plano}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, plano: e.target.value as any })}
                    className={`${inputClasses} font-bold`}
                  >
                    <option value="individual_pro">Individual Pro</option>
                    <option value="clinica_multi">Clínica Multi</option>
                  </select>
                </div>

                <div>
                  <label className={labelClasses}>Valor da Mensalidade (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editDoctorForm.valorMensalidade}
                    onChange={(e) => setEditDoctorForm({ ...editDoctorForm, valorMensalidade: Number(e.target.value) })}
                    className={inputClasses}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDoctor(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg cursor-pointer border border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-60"
                >
                  <Save className="w-4 h-4" /> {isSavingEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL HISTÓRICO DE PAGAMENTOS */}
      {historyDoctorId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-100">

            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-base">Histórico de Pagamentos</h3>
                  <p className="text-xs text-slate-500">{historyDoctor?.nome || 'Médico'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryDoctorId(null)}
                className="text-slate-500 hover:text-slate-200 cursor-pointer p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                Nenhum pagamento registrado ainda.
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {paymentHistory.map((p) => (
                  <div key={p.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-100 block">
                        {new Date(p.data).toLocaleDateString('pt-BR')} às {new Date(p.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase">{p.origem}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">
                      R$ {p.valor.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
