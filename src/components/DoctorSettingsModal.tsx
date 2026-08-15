import React, { useState, useEffect } from 'react';
import { Settings, Upload, MapPin, MessageSquare, Award, X, Check, Search, ExternalLink } from 'lucide-react';
import { DoctorTenant } from '../types/saas';
import { fileToBase64 } from '../utils/formatters';

interface DoctorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDoctor: DoctorTenant;
  onSave: (updated: DoctorTenant) => Promise<void> | void;
}

export const DoctorSettingsModal: React.FC<DoctorSettingsModalProps> = ({
  isOpen,
  onClose,
  currentDoctor,
  onSave
}) => {
  const [formData, setFormData] = useState<DoctorTenant>({
    ...currentDoctor,
    especialidade: currentDoctor.especialidade || 'Ginecologia & Obstetrícia',
    enderecoConsultorio: currentDoctor.enderecoConsultorio || 'Curitiba - PR',
    whatsappPadraoMensagem: currentDoctor.whatsappPadraoMensagem || 'Olá! Segue o lembrete da sua próxima consulta pré-natal.'
  });

  const [cep, setCep] = useState('');
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sincroniza estado quando modal abre
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

  // Busca rápida e gratuita de CEP via ViaCEP
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
        const enderecoCompleto = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
        setFormData({ ...formData, enderecoConsultorio: enderecoCompleto });
      } else {
        alert('CEP não encontrado.');
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err);
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
    onClose();
  };

  // URL segura para o Embed gratuito do Google Maps
  const mapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(formData.enderecoConsultorio || 'Curitiba')}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  const mapsExternalLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.enderecoConsultorio || '')}`;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 space-y-5 max-h-[92vh] overflow-y-auto">
        
        {/* CABEÇALHO DO MODAL */}
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#2E482A] text-white flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Personalização do Consultório</h3>
              <p className="text-[11px] text-gray-500">Configure logotipo, CRM e localização da sua clínica</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* 1. LOGO / ASSINATURA */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
              {formData.logoUrl ? (
                <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Award className="w-6 h-6 text-gray-300" />
              )}
            </div>
            <div className="space-y-1 flex-1">
              <span className="font-bold text-gray-800 text-[11px] block">Logotipo do Consultório ou Foto de Perfil</span>
              <p className="text-[10px] text-gray-500">Exibido na carteirinha digital e no cabeçalho do app</p>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl text-[10px] font-bold text-gray-700 cursor-pointer shadow-2xs transition-all">
                <Upload className="w-3.5 h-3.5" /> Escolher Imagem
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* 2. DADOS DO MÉDICO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Nome do Médico *</label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Dra. Priscila Gapski"
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
                placeholder="Ex: 24734-PR"
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Nome da Clínica / Consultório</label>
              <input
                type="text"
                value={formData.clinicaNome || ''}
                onChange={(e) => setFormData({ ...formData, clinicaNome: e.target.value })}
                placeholder="Ex: Consultório Dra. Priscila Gapski"
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Especialidade / Subtítulo</label>
              <input
                type="text"
                value={formData.especialidade || ''}
                onChange={(e) => setFormData({ ...formData, especialidade: e.target.value })}
                placeholder="Ex: Ginecologia & Obstetrícia"
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>
          </div>

          {/* 3. ENDEREÇO COM MAPA INTERATIVO (ZERO CUSTO) */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
            <div className="flex justify-between items-center">
              <label className="font-bold text-gray-800 uppercase text-[10px] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#2E482A]" /> Endereço & Localização no Mapa
              </label>

              {/* Busca por CEP */}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Buscar CEP (ex: 80240-001)"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  className="p-1.5 px-2 bg-white border rounded-lg text-[10px] w-36"
                />
                <button
                  type="button"
                  onClick={handleCepSearch}
                  disabled={isSearchingCep}
                  className="px-2.5 py-1.5 bg-[#2E482A] text-white rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-[#233820] cursor-pointer"
                >
                  <Search className="w-3 h-3" /> {isSearchingCep ? '...' : 'Buscar'}
                </button>
              </div>
            </div>

            <input
              type="text"
              value={formData.enderecoConsultorio || ''}
              onChange={(e) => setFormData({ ...formData, enderecoConsultorio: e.target.value })}
              placeholder="Digite o endereço completo (Rua, Número, Bairro, Cidade - UF)"
              className="w-full p-2.5 bg-white border rounded-xl text-xs font-medium"
            />

            {/* MAPA INTERATIVO EMBED */}
            {formData.enderecoConsultorio && (
              <div className="space-y-1.5">
                <div className="w-full h-44 rounded-xl overflow-hidden border border-gray-300 shadow-inner bg-gray-100">
                  <iframe
                    title="Mapa do Consultório"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={mapsEmbedUrl}
                    className="w-full h-full"
                  />
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-500">📍 O mapa se ajusta automaticamente ao endereço digitado.</span>
                  <a
                    href={mapsExternalLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Testar no Google Maps
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* 4. MENSAGEM WHATSAPP */}
          <div>
            <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1 flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-700" /> Mensagem Padrão de WhatsApp para Lembretes
            </label>
            <textarea
              rows={2}
              value={formData.whatsappPadraoMensagem || ''}
              onChange={(e) => setFormData({ ...formData, whatsappPadraoMensagem: e.target.value })}
              placeholder="Texto introdutório enviado para as gestantes..."
              className="w-full p-2.5 bg-gray-50 border rounded-xl"
            />
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-[#2E482A] hover:bg-[#233820] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4" /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default DoctorSettingsModal;
