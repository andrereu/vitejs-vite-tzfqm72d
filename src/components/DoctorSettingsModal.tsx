import React, { useState, useEffect } from 'react';
import { Settings, Upload, MapPin, MessageSquare, Award, X, Check, Search, ExternalLink, Users, UserPlus, Trash2, Shield } from 'lucide-react';
import { DoctorTenant, ClinicSecretary } from '../types/saas';
import { fileToBase64 } from '../utils/formatters';

interface DoctorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDoctor: DoctorTenant;
  onSave: (updated: DoctorTenant) => Promise<void> | void;
  secretaries: ClinicSecretary[];
  onSaveSecretaries: (updated: ClinicSecretary[]) => Promise<void> | void;
}

export const DoctorSettingsModal: React.FC<DoctorSettingsModalProps> = ({
  isOpen,
  onClose,
  currentDoctor,
  onSave,
  secretaries,
  onSaveSecretaries,
}) => {
  const [activeTab, setActiveTab] = useState<'consultorio' | 'secretarias'>('consultorio');
  const [formData, setFormData] = useState<DoctorTenant>({
    ...currentDoctor,
    especialidade: currentDoctor.especialidade || 'Ginecologia & Obstetrícia',
    enderecoConsultorio: currentDoctor.enderecoConsultorio || 'Curitiba - PR',
    whatsappPadraoMensagem: currentDoctor.whatsappPadraoMensagem || 'Olá! Segue o lembrete da sua próxima consulta pré-natal.'
  });

  const [cep, setCep] = useState('');
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form nova secretária
  const [newSecName, setNewSecName] = useState('');
  const [newSecEmail, setNewSecEmail] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...currentDoctor,
        especialidade: currentDoctor.especialidade || 'Ginecologia & Obstetrícia',
        enderecoConsultorio: currentDoctor.enderecoConsultorio || 'Curitiba - PR',
        whatsappPadraoMensagem: currentDoctor.whatsappPadraoMensagem || 'Olá! Segue o lembrete da sua próxima consulta pré-natal.'
      });
    }
  }, [isOpen, currentDoctor]);

  if (!isOpen) return null;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setFormData({ ...formData, logoUrl: base64 });
    }
  };

  const handleCepSearch = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      alert('Digite um CEP válido com 8 dígitos.');
      return;
    }
    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData({ ...formData, enderecoConsultorio: `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}` });
      } else {
        alert('CEP não encontrado.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleAddSecretary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecName || !newSecEmail) return;

    const novaSec: ClinicSecretary = {
      id: `sec-${Date.now()}`,
      nome: newSecName.trim(),
      email: newSecEmail.toLowerCase().trim(),
      doctorId: currentDoctor.id,
      clinicaNome: currentDoctor.clinicaNome || currentDoctor.nome,
      ativo: true
    };

    await onSaveSecretaries([...secretaries, novaSec]);
    setNewSecName('');
    setNewSecEmail('');
  };

  const handleRemoveSecretary = async (id: string) => {
    if (confirm('Deseja remover o acesso desta secretária?')) {
      await onSaveSecretaries(secretaries.filter(s => s.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
    onClose();
  };

  const mapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(formData.enderecoConsultorio || 'Curitiba')}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  const mapsExternalLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.enderecoConsultorio || '')}`;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#2E482A] text-white flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Configurações do Consultório</h3>
              <p className="text-[11px] text-gray-500">Dados cadastrais, mapa e equipe de recepção</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ABAS */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('consultorio')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'consultorio' ? 'bg-[#2E482A] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🏥 Dados da Clínica & Marca
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('secretarias')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'secretarias' ? 'bg-[#2E482A] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Secretárias / Recepção ({secretaries.length})
          </button>
        </div>

        {/* CONTEÚDO DA ABA 1: DADOS DO CONSULTÓRIO */}
        {activeTab === 'consultorio' && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0">
                {formData.logoUrl ? (
                  <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Award className="w-6 h-6 text-gray-300" />
                )}
              </div>
              <div className="space-y-1 flex-1">
                <span className="font-bold text-gray-800 text-[11px] block">Logotipo do Consultório ou Foto</span>
                <p className="text-[10px] text-gray-500">Exibido na carteirinha e relatórios das gestantes</p>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border rounded-xl text-[10px] font-bold text-gray-700 cursor-pointer shadow-2xs">
                  <Upload className="w-3.5 h-3.5" /> Escolher Imagem
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Nome do Médico *</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">CRM com Estado *</label>
                <input
                  type="text"
                  required
                  value={formData.crm}
                  onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Nome da Clínica</label>
                <input
                  type="text"
                  value={formData.clinicaNome || ''}
                  onChange={(e) => setFormData({ ...formData, clinicaNome: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Especialidade</label>
                <input
                  type="text"
                  value={formData.especialidade || ''}
                  onChange={(e) => setFormData({ ...formData, especialidade: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                />
              </div>
            </div>

            {/* ENDEREÇO E MAPA */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <div className="flex justify-between items-center">
                <label className="font-bold text-gray-800 uppercase text-[10px] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#2E482A]" /> Endereço & Localização no Mapa
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="CEP (ex: 80240-001)"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    className="p-1.5 px-2 bg-white border rounded-lg text-[10px] w-32"
                  />
                  <button
                    type="button"
                    onClick={handleCepSearch}
                    disabled={isSearchingCep}
                    className="px-2.5 py-1.5 bg-[#2E482A] text-white rounded-lg text-[10px] font-bold"
                  >
                    <Search className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={formData.enderecoConsultorio || ''}
                onChange={(e) => setFormData({ ...formData, enderecoConsultorio: e.target.value })}
                placeholder="Endereço completo da clínica..."
                className="w-full p-2.5 bg-white border rounded-xl text-xs"
              />

              {formData.enderecoConsultorio && (
                <div className="space-y-1.5">
                  <div className="w-full h-36 rounded-xl overflow-hidden border border-gray-300 bg-gray-100">
                    <iframe
                      title="Mapa Consultório"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      src={mapsEmbedUrl}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="flex justify-end">
                    <a href={mapsExternalLink} target="_blank" rel="noreferrer" className="text-emerald-700 font-bold flex items-center gap-1 text-[10px]">
                      <ExternalLink className="w-3 h-3" /> Abrir no Google Maps
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-700" /> Mensagem Padrão de WhatsApp
              </label>
              <textarea
                rows={2}
                value={formData.whatsappPadraoMensagem || ''}
                onChange={(e) => setFormData({ ...formData, whatsappPadraoMensagem: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold">
                Cancelar
              </button>
              <button type="submit" disabled={isSaving} className="px-5 py-2 bg-[#2E482A] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md">
                <Check className="w-4 h-4" /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        )}

        {/* CONTEÚDO DA ABA 2: SECRETÁRIAS */}
        {activeTab === 'secretarias' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-2 text-emerald-900">
              <Shield className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                As secretárias cadastradas acessam apenas a <strong>Central da Agenda</strong> e os dados de contato. Elas ficam <strong>bloqueadas por LGPD</strong> de visualizar histórico médico e laudos com IA.
              </span>
            </div>

            {/* FORM ADICIONAR SECRETÁRIA */}
            <form onSubmit={handleAddSecretary} className="p-4 bg-gray-50 rounded-2xl border space-y-3">
              <span className="font-bold text-gray-900 block text-xs flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-[#2E482A]" /> Adicionar Nova Secretária
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nome da Secretária (ex: Mariana)"
                  value={newSecName}
                  onChange={(e) => setNewSecName(e.target.value)}
                  className="p-2.5 bg-white border rounded-xl"
                />
                <input
                  type="email"
                  required
                  placeholder="E-mail de login (ex: mariana@clinica.com)"
                  value={newSecEmail}
                  onChange={(e) => setNewSecEmail(e.target.value)}
                  className="p-2.5 bg-white border rounded-xl"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#2E482A] hover:bg-[#233820] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Cadastrar Acesso
              </button>
            </form>

            {/* LISTA DE SECRETÁRIAS CADASTRADAS */}
            <div className="space-y-2">
              <span className="font-bold text-gray-700 uppercase text-[10px] block">Secretárias Ativas</span>
              {secretaries.length === 0 ? (
                <p className="text-gray-400 italic py-3 text-center">Nenhuma secretária cadastrada até o momento.</p>
              ) : (
                secretaries.map((sec) => (
                  <div key={sec.id} className="p-3 bg-white border rounded-2xl flex justify-between items-center shadow-2xs">
                    <div>
                      <strong className="text-gray-900 block font-bold">{sec.nome}</strong>
                      <span className="text-[11px] text-gray-500">{sec.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSecretary(sec.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                      title="Remover Acesso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
