import React, { useState } from 'react';
import {
  Users, DollarSign, Clock, ShieldCheck,
  Search, CheckCircle2, Ban, X,
  Save, LogOut, Settings, UserPlus
} from 'lucide-react';
import type { DoctorTenant, SaasGlobalConfig } from '../types/saas';
import { useDoctorPatientCounts } from '../hooks/useDoctorPatientCounts';

interface AdminMasterDashboardProps {
  doctors: DoctorTenant[];
  globalConfig: SaasGlobalConfig;
  onSaveDoctors: (updatedList: DoctorTenant[]) => Promise<void> | void;
  onSaveGlobalConfig: (config: SaasGlobalConfig) => Promise<void> | void;
  onLogout: () => void;
}

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
      <div className="bg-[#2E482A] text-white p-6 rounded-3xl shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] text-[#A3B18A] uppercase font-bold tracking-widest block">
            Painel Super Administrador • MaternaIA SaaS
          </span>
          <h2 className="text-2xl font-bold text-white mt-1">Gestão de Clínicas & Assinaturas</h2>
        </div>
        <button
          onClick={onLogout}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
        >
          <LogOut className="w-4 h-4" /> Sair do Painel Master
        </button>
      </div>

      {/* CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[10px] font-bold uppercase">MRR (Recorrência Mensal)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            R$ {mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">
            {activeDoctors} assinaturas ativas
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[10px] font-bold uppercase">Médicos Cadastrados</span>
            <Users className="w-4 h-4 text-[#2E482A]" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{totalDoctors}</div>
          <span className="text-[11px] text-gray-500 font-medium">
            {trialDoctors} em degustação / {blockedDoctors} pendentes
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[10px] font-bold uppercase">Gestantes no Sistema</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{totalPatients}</div>
          <span className="text-[11px] text-purple-600 font-medium">
            Base ativa de pacientes
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenPaymentConfig}
          className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1 text-left cursor-pointer hover:border-[#2E482A]/40 transition-all"
          title="Clique para editar a chave PIX e os dados de recebimento"
        >
          <div className="flex justify-between items-center text-gray-400">
            <span className="text-[10px] font-bold uppercase">Chave PIX Recebimento</span>
            <Settings className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-sm font-bold text-gray-900 truncate">
            {globalConfig.pixKey || 'Não configurada — clique para definir'}
          </div>
          <span className="text-[11px] text-gray-500 font-medium uppercase">
            {globalConfig.pixKeyType || 'pix manual'}
          </span>
        </button>
      </div>

      {/* LISTAGEM DE MÉDICOS & AÇÕES */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Controle de Assinaturas</h3>
            <p className="text-xs text-gray-500">Libere acessos após conferência do PIX ou cadastre novas contas</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar médico, CRM ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border rounded-xl"
              />
            </div>

            <button
              onClick={() => setShowNewDoctorModal(true)}
              className="px-4 py-2 bg-[#2E482A] hover:bg-[#233820] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" /> Novo Médico
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 font-bold text-gray-700">Médico(a) / Clínica</th>
                <th className="p-3 font-bold text-gray-700">Plano & Valor</th>
                <th className="p-3 font-bold text-gray-700">Status Atual</th>
                <th className="p-3 font-bold text-gray-700">Vencimento / Trial</th>
                <th className="p-3 font-bold text-gray-700 text-center">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDoctors.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="p-3">
                    <strong className="text-gray-900 block font-bold">{doc.nome}</strong>
                    <span className="text-[11px] text-gray-500 block">
                      CRM {doc.crm} • {doc.email}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium block">
                      {doc.clinicaNome || 'Consultório'}
                    </span>
                  </td>

                  <td className="p-3">
                    <span className="font-bold text-gray-900 block">
                      R$ {(doc.valorMensalidade || 89).toFixed(2)}/mês
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase">
                      {doc.plano === 'individual_pro' ? 'Individual Pro' : 'Clínica Multi'}
                    </span>
                  </td>

                  <td className="p-3">
                    {doc.status === 'active' && (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> ATIVO
                      </span>
                    )}
                    {doc.status === 'trial' && (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> DEGUSTAÇÃO
                      </span>
                    )}
                    {(doc.status === 'past_due' || doc.status === 'blocked') && (
                      <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                        <Ban className="w-3 h-3" /> BLOQUEADO
                      </span>
                    )}
                  </td>

                  <td className="p-3 text-gray-600">
                    {doc.status === 'active' ? (
                      <div>
                        <span className="font-bold text-gray-900 block">
                          {doc.validadeAssinatura ? new Date(doc.validadeAssinatura).toLocaleDateString('pt-BR') : 'Sem data'}
                        </span>
                        <span className="text-[10px] text-gray-400">Validade do PIX</span>
                      </div>
                    ) : (
                      <div>
                        <span className="font-bold text-gray-900 block">
                          {doc.trialEndsAt ? new Date(doc.trialEndsAt).toLocaleDateString('pt-BR') : 'Expirado'}
                        </span>
                        <span className="text-[10px] text-gray-400">Fim do Trial</span>
                      </div>
                    )}
                  </td>

                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {doc.status !== 'active' && (
                        <button
                          onClick={() => handleStatusChange(doc.id, 'active')}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-[10px] cursor-pointer shadow-xs"
                          title="Confirmar PIX e ativar por +30 dias"
                        >
                          Confirmar PIX
                        </button>
                      )}

                      {doc.status === 'trial' && (
                        <button
                          onClick={() => handleExtendTrial(doc.id, 7)}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                          title="Dar +7 dias de degustação"
                        >
                          +7d Trial
                        </button>
                      )}

                      {doc.status === 'active' && (
                        <button
                          onClick={() => handleStatusChange(doc.id, 'blocked')}
                          className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                          title="Suspender acesso"
                        >
                          Bloquear
                        </button>
                      )}
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
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-gray-800">
            
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#2E482A]/10 text-[#2E482A] rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Cadastrar Novo Médico</h3>
                  <p className="text-xs text-gray-500">Crie a conta e libere o período de testes</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowNewDoctorModal(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dr. Lucas Silveira"
                    value={newDoctor.nome}
                    onChange={(e) => setNewDoctor({ ...newDoctor, nome: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">CRM com UF *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 34567-PR"
                    value={newDoctor.crm}
                    onChange={(e) => setNewDoctor({ ...newDoctor, crm: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">E-mail de Acesso *</label>
                  <input
                    type="email"
                    required
                    placeholder="medico@clinica.com.br"
                    value={newDoctor.email}
                    onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    placeholder="(41) 99999-9999"
                    value={newDoctor.telefone}
                    onChange={(e) => setNewDoctor({ ...newDoctor, telefone: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Nome da Clínica / Consultório</label>
                  <input
                    type="text"
                    placeholder="Ex: Clínica Materno Fetal"
                    value={newDoctor.clinicaNome}
                    onChange={(e) => setNewDoctor({ ...newDoctor, clinicaNome: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Plano Inicial</label>
                  <select
                    value={newDoctor.plano}
                    onChange={(e) => setNewDoctor({ ...newDoctor, plano: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-bold"
                  >
                    <option value="individual_pro">Individual Pro (R$ 89/mês)</option>
                    <option value="clinica_multi">Clínica Multi (R$ 179/mês)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Dias de Degustação</label>
                  <select
                    value={newDoctor.trialDays}
                    onChange={(e) => setNewDoctor({ ...newDoctor, trialDays: Number(e.target.value) })}
                    className="w-full p-2.5 bg-gray-50 border rounded-xl font-bold"
                  >
                    <option value={7}>7 dias grátis</option>
                    <option value={14}>14 dias grátis</option>
                    <option value={30}>30 dias grátis</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowNewDoctorModal(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-[#2E482A] hover:bg-[#233820] text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
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
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-gray-800">

            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#2E482A]/10 text-[#2E482A] rounded-xl">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Configurar Recebimento</h3>
                  <p className="text-xs text-gray-500">Chave PIX exibida às médicas na renovação manual</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentConfigModal(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentConfig} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Chave PIX *</label>
                <input
                  type="text"
                  required
                  placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                  value={paymentConfigForm.pixKey}
                  onChange={(e) => setPaymentConfigForm({ ...paymentConfigForm, pixKey: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Tipo da Chave</label>
                <select
                  value={paymentConfigForm.pixKeyType}
                  onChange={(e) => setPaymentConfigForm({ ...paymentConfigForm, pixKeyType: e.target.value as SaasGlobalConfig['pixKeyType'] })}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl font-bold"
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="telefone">Telefone</option>
                  <option value="aleatoria">Chave Aleatória</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Nome do Recebedor</label>
                <input
                  type="text"
                  placeholder="Ex: MaternaIA Tecnologia"
                  value={paymentConfigForm.nomeRecebedor}
                  onChange={(e) => setPaymentConfigForm({ ...paymentConfigForm, nomeRecebedor: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">WhatsApp de Suporte</label>
                <input
                  type="text"
                  placeholder="Ex: 5541999999999"
                  value={paymentConfigForm.suporteWhatsapp}
                  onChange={(e) => setPaymentConfigForm({ ...paymentConfigForm, suporteWhatsapp: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowPaymentConfigModal(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-5 py-2.5 bg-[#2E482A] hover:bg-[#233820] text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Save className="w-4 h-4" /> {isSavingConfig ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
