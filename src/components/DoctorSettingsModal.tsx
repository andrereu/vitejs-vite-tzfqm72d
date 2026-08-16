import React, { useState, useEffect } from 'react';
import { Settings, Building, Upload, Trash2, Save, X, Plus, Users, Image as ImageIcon } from 'lucide-react';
import { DoctorTenant, ClinicSecretary } from '../types/saas';

interface DoctorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDoctor: DoctorTenant;
  secretaries?: ClinicSecretary[];
  onSaveSecretaries?: (secretaries: ClinicSecretary[]) => Promise<void> | void;
  onSave: (updated: DoctorTenant) => Promise<void> | void;
}

export const DoctorSettingsModal: React.FC<DoctorSettingsModalProps> = ({
  isOpen,
  onClose,
  currentDoctor,
  secretaries = [],
  onSaveSecretaries,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'perfil' | 'secretarias' | 'seguranca'>('perfil');

  const [formData, setFormData] = useState<DoctorTenant>(currentDoctor);
  const [secList, setSecList] = useState<ClinicSecretary[]>(secretaries);
  const [newSec, setNewSec] = useState({ nome: '', email: '', telefone: '', senha: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(currentDoctor);
      setSecList(secretaries);
    }
  }, [isOpen, currentDoctor, secretaries]);

  if (!isOpen) return null;

  // Redimensiona a imagem para no máximo 200x200px em formato Base64 limpo
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsResizing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const resizedBase64 = canvas.toDataURL('image/png', 0.9);
          setFormData(prev => ({ ...prev, logoUrl: resizedBase64 }));
        }
        setIsResizing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      if (onSaveSecretaries) {
        await onSaveSecretaries(secList);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSecretary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSec.nome || !newSec.email) return;

    const secretary: ClinicSecretary = {
      id: `sec-${Date.now()}`,
      doctorId: currentDoctor.id,
      nome: newSec.nome,
      email: newSec.email.toLowerCase().trim(),
      telefone: newSec.telefone,
      status: 'active',
      criadoEm: new Date().toISOString()
    };

    setSecList([...secList, secretary]);
    setNewSec({ nome: '', email: '', telefone: '', senha: '' });
  };

  const handleRemoveSecretary = (id: string) => {
    setSecList(secList.filter(s => s.id !== id));
  };

// Estado do 2FA
const [twoFactorConfig, setTwoFactorConfig] = useState<TwoFactorConfig>(
  currentDoctor.twoFactor || { enabled: false, method: 'whatsapp', whatsappPhone: currentDoctor.telefone || '' }
);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-gray-800 max-h-[90vh] overflow-y-auto">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#2E482A]/10 text-[#2E482A] rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Configurações do Consultório</h3>
              <p className="text-xs text-gray-500">Personalize os dados de atendimento, logo e equipe</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 cursor-pointer p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ABAS */}
        <div className="flex gap-2 border-b border-gray-100 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('perfil')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'perfil' ? 'bg-[#2E482A] text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Building className="w-4 h-4" /> Dados do Consultório
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('secretarias')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'secretarias' ? 'bg-[#2E482A] text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Users className="w-4 h-4" /> Secretárias & Recepção ({secList.length})
          </button>
        </div>

        {/* CONTEÚDO DA ABA 1: DADOS */}
        {activeTab === 'perfil' && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            
            {/* UPLOAD E PREVIEW DO LOGO */}
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <label className="font-bold text-gray-700 uppercase text-[10px] block">
                Logotipo da Clínica / Médica
              </label>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                  {formData.logoUrl ? (
                    <img 
                      src={formData.logoUrl} 
                      alt="Logo" 
                      className="w-full h-full object-contain p-1" 
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-300" />
                  )}
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 bg-[#2E482A] hover:bg-[#233820] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isResizing ? 'Processando...' : 'Selecionar Imagem'}</span>
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/webp" 
                        onChange={handleLogoUpload} 
                        className="hidden" 
                        disabled={isResizing}
                      />
                    </label>

                    {formData.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))}
                        className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Formatos: PNG, JPG ou WebP. Redimensionado automaticamente para o cabeçalho.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Nome da Médica / Médico *</label>
                <input
                  type="text"
                  required
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">CRM *</label>
                <input
                  type="text"
                  required
                  value={formData.crm || ''}
                  onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Nome do Consultório / Clínica</label>
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

              <div className="md:col-span-2">
                <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">WhatsApp / Telefone da Clínica</label>
                <input
                  type="text"
                  value={formData.telefone || ''}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Endereço de Atendimento (Aparece nos lembretes)</label>
              <input
                type="text"
                value={formData.enderecoConsultorio || ''}
                onChange={(e) => setFormData({ ...formData, enderecoConsultorio: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving || isResizing}
                className="px-5 py-2.5 bg-[#2E482A] hover:bg-[#233820] text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Save className="w-4 h-4" /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        )}
        {/* ABA SEGURANÇA E A2F */}
        {activeTab === 'seguranca' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <strong className="text-gray-900 block text-xs">Autenticação em Duas Etapas (A2F / 2FA)</strong>
                  <p className="text-gray-500 text-[11px]">Exige uma confirmação adicional a cada login para proteger os prontuários das gestantes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={twoFactorConfig.enabled}
                    onChange={(e) => setTwoFactorConfig({ ...twoFactorConfig, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2E482A]"></div>
                </label>
              </div>

              {twoFactorConfig.enabled && (
                <div className="pt-3 border-t border-gray-200 space-y-3">
                  <label className="font-bold text-gray-700 uppercase text-[10px] block">Método de Verificação</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTwoFactorConfig({ ...twoFactorConfig, method: 'whatsapp' })}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2 cursor-pointer ${
                        twoFactorConfig.method === 'whatsapp' ? 'border-[#2E482A] bg-[#2E482A]/5 font-bold' : 'bg-white'
                      }`}
                    >
                      <span className="text-base">📱</span>
                      <div>
                        <strong className="block text-gray-900">WhatsApp</strong>
                        <span className="text-[10px] text-gray-500">Código enviado por mensagem</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTwoFactorConfig({ ...twoFactorConfig, method: 'authenticator', secret: twoFactorConfig.secret || 'MATERNA-' + Math.random().toString(36).substring(2, 8).toUpperCase() })}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2 cursor-pointer ${
                        twoFactorConfig.method === 'authenticator' ? 'border-[#2E482A] bg-[#2E482A]/5 font-bold' : 'bg-white'
                      }`}
                    >
                      <span className="text-base">🔑</span>
                      <div>
                        <strong className="block text-gray-900">Google Authenticator</strong>
                        <span className="text-[10px] text-gray-500">App de senhas temporárias</span>
                      </div>
                    </button>
                  </div>

                  {twoFactorConfig.method === 'whatsapp' && (
                    <div>
                      <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">WhatsApp de Recebimento do Código</label>
                      <input
                        type="text"
                        placeholder="Ex: 5541999999999"
                        value={twoFactorConfig.whatsappPhone || ''}
                        onChange={(e) => setTwoFactorConfig({ ...twoFactorConfig, whatsappPhone: e.target.value })}
                        className="w-full p-2 bg-white border rounded-xl"
                      />
                    </div>
                  )}

                  {twoFactorConfig.method === 'authenticator' && (
                    <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Chave Secreta para o App</span>
                      <strong className="text-sm font-mono text-[#2E482A] tracking-wider block">{twoFactorConfig.secret}</strong>
                      <p className="text-[10px] text-gray-500">Copie e cole essa chave no Google Authenticator ou 1Password.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const updatedDoc = { ...formData, twoFactor: twoFactorConfig };
                  await onSave(updatedDoc);
                  onClose();
                }}
                className="px-5 py-2 bg-[#2E482A] text-white font-bold rounded-xl cursor-pointer shadow-xs"
              >
                Salvar Configurações de Segurança
              </button>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 2: SECRETÁRIAS */}
        {activeTab === 'secretarias' && (
          <div className="space-y-4 text-xs">
            <form onSubmit={handleAddSecretary} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <span className="font-bold text-gray-900 block text-xs">+ Cadastrar Nova Secretária</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nome completo"
                  value={newSec.nome}
                  onChange={(e) => setNewSec({ ...newSec, nome: e.target.value })}
                  className="p-2 bg-white border rounded-xl text-xs"
                />
                <input
                  type="email"
                  required
                  placeholder="E-mail de login"
                  value={newSec.email}
                  onChange={(e) => setNewSec({ ...newSec, email: e.target.value })}
                  className="p-2 bg-white border rounded-xl text-xs"
                />
                <input
                  type="text"
                  placeholder="Telefone / WhatsApp"
                  value={newSec.telefone}
                  onChange={(e) => setNewSec({ ...newSec, telefone: e.target.value })}
                  className="p-2 bg-white border rounded-xl text-xs"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#2E482A] text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <Plus className="w-4 h-4" /> Adicionar à Equipe
              </button>
            </form>

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Secretárias Cadastradas ({secList.length})
              </span>

              {secList.length === 0 ? (
                <div className="p-4 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed text-xs">
                  Nenhuma secretária vinculada. Use o formulário acima para adicionar.
                </div>
              ) : (
                secList.map((sec) => (
                  <div key={sec.id} className="p-3 bg-gray-50 border rounded-2xl flex justify-between items-center">
                    <div>
                      <strong className="text-gray-900 block text-xs">{sec.nome}</strong>
                      <span className="text-gray-500 text-[11px]">{sec.email} • {sec.telefone || 'Sem telefone'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSecretary(sec.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                      title="Remover acesso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-5 py-2.5 bg-[#2E482A] hover:bg-[#233820] text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Save className="w-4 h-4" /> {isSaving ? 'Salvando...' : 'Salvar Secretárias'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
