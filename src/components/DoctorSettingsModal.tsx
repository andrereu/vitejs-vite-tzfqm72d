import React, { useState } from 'react';
import { Settings, Upload, MapPin, MessageSquare, Award, X, Check } from 'lucide-react';
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
    enderecoConsultorio: currentDoctor.enderecoConsultorio || '',
    whatsappPadraoMensagem: currentDoctor.whatsappPadraoMensagem || 'Olá! Aqui é da equipe da Dra. Priscila. Segue o lembrete da sua próxima consulta pré-natal.'
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setFormData({ ...formData, logoUrl: base64 });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 space-y-5 max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#2E482A] text-white flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Personalização do Consultório (White Label)</h3>
              <p className="text-[11px] text-gray-500">Ajuste os dados e o logotipo exibidos nas carteirinhas das suas pacientes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* LOGO DO CONSULTÓRIO / FOTO */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0">
              {formData.logoUrl ? (
                <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Award className="w-6 h-6 text-gray-300" />
              )}
            </div>
            <div className="space-y-1 flex-1">
              <span className="font-bold text-gray-800 text-[11px] block">Logotipo da Clínica ou Assinatura</span>
              <p className="text-[10px] text-gray-500">Recomendado PNG ou JPG quadrado com fundo transparente</p>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl text-[10px] font-bold text-gray-700 cursor-pointer shadow-2xs transition-all">
                <Upload className="w-3.5 h-3.5" /> Escolher Imagem
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Nome de Exibição Médico *</label>
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
              <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">CRM e Estado *</label>
              <input
                type="text"
                required
                value={formData.crm}
                onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
                placeholder="Ex: CRM 24734-PR"
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
                placeholder="Ex: Espaço Materno Gapski"
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Especialidade / Subtítulo</label>
              <input
                type="text"
                value={formData.especialidade || ''}
                onChange={(e) => setFormData({ ...formData, especialidade: e.target.value })}
                placeholder="Ex: Obstetrícia de Alto Risco"
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#2E482A]" /> Endereço Físico do Consultório
            </label>
            <input
              type="text"
              value={formData.enderecoConsultorio || ''}
              onChange={(e) => setFormData({ ...formData, enderecoConsultorio: e.target.value })}
              placeholder="Ex: Av. República Argentina, 1228 - Sala 504, Curitiba - PR"
              className="w-full p-2.5 bg-gray-50 border rounded-xl"
            />
          </div>

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

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-[#2E482A] hover:bg-[#233820] text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md"
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
