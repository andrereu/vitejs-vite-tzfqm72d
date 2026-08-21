import React, { useState, useEffect } from 'react';
import {
  Settings, Building, Upload, Save, X, Plus, Users,
  ShieldCheck, Image as ImageIcon, CreditCard, Copy, Check,
  MessageSquare, Clock, CheckCircle2, AlertTriangle, ArrowUpRight,
  FlaskConical, Loader2
} from 'lucide-react';
import type { DoctorTenant, ClinicSecretary, TwoFactorConfig, SaasGlobalConfig, ExameAIConfig, ExameAdicional, ModalidadeExame } from '../types/saas';
import type { ExamAIConfigStatus } from '../hooks/useExamAIConfig';
import { getSecretaryLimit } from '../utils/subscription';
import { buildBrandTheme } from '../utils/theme';
import { ColorWheelPicker } from './ColorWheelPicker';

// Paleta curada pro seletor de cor (prompt 5) — testada visualmente contra
// texto claro/escuro via buildBrandTheme, não é só "qualquer hex".
const CORES_SUGERIDAS = [
  { nome: 'Verde MaternaIA', hex: '#2E482A' },
  { nome: 'Petróleo', hex: '#1F4B4A' },
  { nome: 'Azul Noturno', hex: '#223354' },
  { nome: 'Ameixa', hex: '#4A3B6B' },
  { nome: 'Bordô', hex: '#6B2E3F' },
  { nome: 'Terracota', hex: '#8A4A2E' },
  { nome: 'Rosa Antigo', hex: '#A85374' },
  { nome: 'Grafite', hex: '#33363B' },
];

interface DoctorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDoctor: DoctorTenant;
  globalConfig?: SaasGlobalConfig;
  secretaries?: ClinicSecretary[];
  onSaveSecretaries?: (secretaries: ClinicSecretary[]) => Promise<void> | void;
  onSave: (updated: DoctorTenant) => Promise<void> | void;
  // UX-05.2 — vive num documento próprio (doctors/{doctorId}/config/exames),
  // não em DoctorTenant, então tem seu próprio status de carregamento e seu
  // próprio salvamento, independente do formulário de Dados & Logo.
  examAIConfig?: ExameAIConfig | null;
  examAIConfigStatus?: ExamAIConfigStatus;
  onSaveExamAIConfig?: (updated: ExameAIConfig) => Promise<void> | void;
}

const LIMITE_CARACTERES_INSTRUCAO_IA = 6000;

const LABEL_MODALIDADE: Record<ModalidadeExame, { titulo: string; pergunta: string }> = {
  ecografia: { titulo: 'Ultrassonografia', pergunta: 'Como a IA deve analisar seus exames de ultrassom?' },
  laboratorial: { titulo: 'Exames laboratoriais', pergunta: 'Como a IA deve analisar seus exames laboratoriais?' },
  outros: { titulo: 'Outros exames de imagem', pergunta: 'Como a IA deve analisar outros exames de imagem?' }
};

export const DoctorSettingsModal: React.FC<DoctorSettingsModalProps> = ({
  isOpen,
  onClose,
  currentDoctor,
  globalConfig,
  secretaries = [],
  onSaveSecretaries,
  onSave,
  examAIConfig,
  examAIConfigStatus = 'sem-configuracao',
  onSaveExamAIConfig
}) => {
  const [activeTab, setActiveTab] = useState<'perfil' | 'secretarias' | 'seguranca' | 'assinatura' | 'examesIA'>('perfil');
  const [formData, setFormData] = useState<DoctorTenant>(currentDoctor);
  const [secList, setSecList] = useState<ClinicSecretary[]>(secretaries);
  const [newSec, setNewSec] = useState({ nome: '', email: '', telefone: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [showCustomColorPanel, setShowCustomColorPanel] = useState(false);

  // UX-05.2 — estado próprio da aba "Exames & IA": documento separado de
  // DoctorTenant, carregado assincronamente pelo hook useExamAIConfig lá em
  // App.tsx. novoExameAdicional/sinonimosTexto são só o miniformulário de
  // cadastro; a lista em si já fica editável inline (nome/categoria/
  // sinônimos de cada item já cadastrado).
  const [examesAdicionaisList, setExamesAdicionaisList] = useState<ExameAdicional[]>(examAIConfig?.examesAdicionais || []);
  const [instrucoes, setInstrucoes] = useState<Partial<Record<ModalidadeExame, string>>>(examAIConfig?.instrucoesPorModalidade || {});
  const [novoExameAdicional, setNovoExameAdicional] = useState<{ nome: string; categoria: ExameAdicional['categoria']; sinonimosTexto: string }>({
    nome: '',
    categoria: 'Ecografia',
    sinonimosTexto: ''
  });
  const [isSavingExamAI, setIsSavingExamAI] = useState(false);

  const [twoFactorConfig, setTwoFactorConfig] = useState<TwoFactorConfig>({
    enabled: currentDoctor?.twoFactor?.enabled || false,
    method: currentDoctor?.twoFactor?.method || 'whatsapp',
    whatsappPhone: currentDoctor?.twoFactor?.whatsappPhone || currentDoctor?.telefone || '',
    secret: currentDoctor?.twoFactor?.secret || 'MATERNA-' + Math.random().toString(36).substring(2, 8).toUpperCase()
  });

  useEffect(() => {
    if (isOpen && currentDoctor) {
      setFormData(currentDoctor);
      setSecList(secretaries || []);
      setTwoFactorConfig({
        enabled: currentDoctor.twoFactor?.enabled || false,
        method: currentDoctor.twoFactor?.method || 'whatsapp',
        whatsappPhone: currentDoctor.twoFactor?.whatsappPhone || currentDoctor.telefone || '',
        secret: currentDoctor.twoFactor?.secret || 'MATERNA-' + Math.random().toString(36).substring(2, 8).toUpperCase()
      });
    }
  }, [isOpen, currentDoctor, secretaries]);

  // Sincroniza separadamente do efeito acima: examAIConfig chega de um
  // onSnapshot próprio (useExamAIConfig em App.tsx) que pode resolver depois
  // do modal já estar aberto — sem isso, abrir a aba antes do Firestore
  // responder travaria o formulário nos valores iniciais (vazios).
  useEffect(() => {
    if (isOpen) {
      setExamesAdicionaisList(examAIConfig?.examesAdicionais || []);
      setInstrucoes(examAIConfig?.instrucoesPorModalidade || {});
    }
  }, [isOpen, examAIConfig]);

  if (!isOpen) return null;

  const pixKey = globalConfig?.pixKey || '000.000.000-00';
  const valorMensal = formData.valorMensalidade || (formData.plano === 'clinica_multi' ? 179 : 89);
  const suporteWhats = globalConfig?.suporteWhatsapp || '5541999999999';

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const whatsappMsg = encodeURIComponent(
    `Olá! Sou a(o) ${formData.nome} (CRM ${formData.crm}). Gostaria de enviar o comprovante de renovação do plano ${formData.plano === 'clinica_multi' ? 'Clínica Multi' : 'Individual Pro'} (R$ ${valorMensal.toFixed(2)}) no MaternaIA.`
  );

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
      const updatedDoctor: DoctorTenant = {
        ...formData,
        twoFactor: twoFactorConfig
      };

      await onSave(updatedDoctor);
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

  const secretaryLimit = getSecretaryLimit(formData);

  const handleAddSecretary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSec.nome || !newSec.email) return;
    if (secList.length >= secretaryLimit) return;

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
    setNewSec({ nome: '', email: '', telefone: '' });
  };

  const handleRemoveSecretary = (id: string) => {
    setSecList(secList.filter(s => s.id !== id));
  };

  // UX-05.2 — exames adicionais servem só pra reconhecimento (autocomplete),
  // nunca entram no prompt de resumo do Gemini (isso é responsabilidade das
  // instruções por modalidade, abaixo). Editar é direto na lista (sem modo
  // de edição separado) — os mesmos campos do cadastro, já preenchidos.
  const handleAddExameAdicional = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoExameAdicional.nome.trim()) return;

    const exame: ExameAdicional = {
      id: `exame-add-${Date.now()}`,
      nome: novoExameAdicional.nome.trim(),
      categoria: novoExameAdicional.categoria,
      sinonimos: novoExameAdicional.sinonimosTexto
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    };

    setExamesAdicionaisList([...examesAdicionaisList, exame]);
    setNovoExameAdicional({ nome: '', categoria: 'Ecografia', sinonimosTexto: '' });
  };

  const handleRemoveExameAdicional = (id: string) => {
    setExamesAdicionaisList(examesAdicionaisList.filter((ex) => ex.id !== id));
  };

  const handleEditarExameAdicional = (id: string, patch: Partial<ExameAdicional>) => {
    setExamesAdicionaisList(examesAdicionaisList.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex)));
  };

  const handleSaveExamAIConfig = async () => {
    if (!onSaveExamAIConfig) return;
    setIsSavingExamAI(true);
    try {
      await onSaveExamAIConfig({
        instrucoesPorModalidade: instrucoes,
        examesAdicionais: examesAdicionaisList
      });
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar preferências de exames e IA.');
    } finally {
      setIsSavingExamAI(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-gray-800 max-h-[90vh] overflow-y-auto">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Configurações do Consultório</h3>
              <p className="text-xs text-gray-500">Personalize dados, equipe, segurança e assinatura</p>
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

        {/* SELETOR DE ABAS */}
        <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('perfil')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'perfil' ? 'bg-[var(--brand-primary)] text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Building className="w-4 h-4" /> Dados & Logo
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('assinatura')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'assinatura' ? 'bg-[var(--brand-primary)] text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Minha Assinatura
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('secretarias')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'secretarias' ? 'bg-[var(--brand-primary)] text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Users className="w-4 h-4" /> Secretárias ({secList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('seguranca')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'seguranca' ? 'bg-[var(--brand-primary)] text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Segurança (A2F)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('examesIA')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'examesIA' ? 'bg-[var(--brand-primary)] text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FlaskConical className="w-4 h-4" /> Exames & IA
          </button>
        </div>

        {/* ABA 1: DADOS & LOGO */}
        {activeTab === 'perfil' && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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
                    <label className="px-3 py-1.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all">
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
                    PNG, JPG ou WebP. Redimensionado automaticamente para o cabeçalho.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-gray-700 uppercase text-[10px] block">
                  Cor Principal do Consultório
                </label>
                {formData.corPrimaria && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, corPrimaria: '' })}
                    className="text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer"
                  >
                    Usar o verde padrão
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-500 -mt-1">
                Substitui o verde padrão no cabeçalho, botões e prontuário da sua carteirinha.
              </p>

              {/* PALETA DE SUGESTÕES + CUSTOMIZADA */}
              <div className="flex flex-wrap items-center gap-2.5">
                {CORES_SUGERIDAS.map((cor) => {
                  const isSelected = (formData.corPrimaria || '#2E482A').toLowerCase() === cor.hex.toLowerCase();
                  return (
                    <button
                      key={cor.hex}
                      type="button"
                      title={cor.nome}
                      onClick={() => {
                        setFormData({ ...formData, corPrimaria: cor.hex });
                        setShowCustomColorPanel(false);
                      }}
                      className={`w-9 h-9 rounded-full shrink-0 cursor-pointer transition-all flex items-center justify-center ${
                        isSelected ? 'ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'
                      }`}
                      style={{ background: cor.hex }}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white drop-shadow" />}
                    </button>
                  );
                })}

                {/* Customizada: em vez de disparar o dialog nativo do sistema
                    operacional (que não segue o visual do app), abre um
                    painel próprio com campo de hex logo abaixo. */}
                {(() => {
                  const isCustom = !!formData.corPrimaria && !CORES_SUGERIDAS.some((c) => c.hex.toLowerCase() === formData.corPrimaria!.toLowerCase());
                  return (
                    <button
                      type="button"
                      title="Escolher outra cor"
                      onClick={() => setShowCustomColorPanel((v) => !v)}
                      className={`w-9 h-9 rounded-full shrink-0 transition-all flex items-center justify-center cursor-pointer ${
                        isCustom ? 'ring-2 ring-offset-2 ring-gray-400' : showCustomColorPanel ? 'ring-2 ring-offset-2 ring-gray-300' : 'hover:scale-110'
                      }`}
                      style={
                        isCustom
                          ? { background: formData.corPrimaria }
                          : { background: 'conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)' }
                      }
                    >
                      {isCustom && <Check className="w-4 h-4 text-white drop-shadow" />}
                    </button>
                  );
                })()}
              </div>

              {showCustomColorPanel && (
                <div className="p-3.5 bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase text-gray-500">Escolher outra cor</span>
                    <button
                      type="button"
                      onClick={() => setShowCustomColorPanel(false)}
                      className="text-[11px] text-gray-500 hover:text-gray-800 font-semibold cursor-pointer px-1.5"
                    >
                      Fechar
                    </button>
                  </div>
                  <ColorWheelPicker
                    value={/^#[0-9a-f]{6}$/i.test(formData.corPrimaria || '') ? formData.corPrimaria! : '#2E482A'}
                    onChange={(hex) => setFormData({ ...formData, corPrimaria: hex })}
                  />
                </div>
              )}

              {/* PRÉVIA AO VIVO — mesma derivação de cor do app de verdade (buildBrandTheme), só que aplicada localmente aqui em vez das variáveis globais, então dá pra ver antes de salvar */}
              {(() => {
                const preview = buildBrandTheme(formData.corPrimaria) || {
                  '--brand-primary': '#2E482A',
                  '--brand-primary-hover': '#233820',
                  '--brand-primary-border': '#3D5C38',
                  '--brand-on-primary': '#E8ECD8',
                  '--brand-on-primary-muted': '#A3B18A',
                };
                return (
                  <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-xs">
                    <div
                      className="p-3 flex items-center justify-between gap-2"
                      style={{ background: preview['--brand-primary'] }}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold truncate" style={{ color: preview['--brand-on-primary'] }}>
                          {formData.clinicaNome || formData.nome || 'Sua Clínica'}
                        </div>
                        <div className="text-[9px] uppercase tracking-wide font-bold" style={{ color: preview['--brand-on-primary-muted'] }}>
                          {formData.especialidade || 'Obstetrícia'}
                        </div>
                      </div>
                      <span
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0"
                        style={{ background: 'rgba(255,255,255,0.15)', color: preview['--brand-on-primary'] }}
                      >
                        Prévia
                      </span>
                    </div>
                    <div className="p-2.5 bg-white flex items-center gap-1.5">
                      <span
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold"
                        style={{ background: `${preview['--brand-primary']}1A`, color: preview['--brand-primary'] }}
                      >
                        Resumo
                      </span>
                      <span className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-gray-400">Agenda</span>
                      <span className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-gray-400">Exames</span>
                    </div>
                  </div>
                );
              })()}
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
              <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Endereço de Atendimento (Lembretes)</label>
              <input
                type="text"
                value={formData.enderecoConsultorio || ''}
                onChange={(e) => setFormData({ ...formData, enderecoConsultorio: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Instagram (usuário, sem @)</label>
              <input
                type="text"
                placeholder="drapriscila"
                value={formData.instagram || ''}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value.replace(/^@+/, '').trim() })}
                className="w-full p-2.5 bg-gray-50 border rounded-xl"
              />
              <p className="text-[10px] text-gray-400 mt-1">Preenchido, aparece um botão "Siga no Instagram" na sua landing pessoal.</p>
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
                className="px-5 py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Save className="w-4 h-4" /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        )}

        {/* ABA 2: MINHA ASSINATURA DO CONSULTÓRIO (NOVA) */}
        {activeTab === 'assinatura' && (
          <div className="space-y-4 text-xs">
            
            {/* CARDS DE STATUS E PLANO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Plano Contratado</span>
                <strong className="text-base text-gray-900 block">
                  {formData.plano === 'clinica_multi' ? 'Clínica Multi (Até 5 Secretárias)' : 'Individual Pro'}
                </strong>
                <span className="text-xs text-emerald-700 font-bold block">
                  R$ {valorMensal.toFixed(2)} / mês
                </span>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Status da Assinatura</span>
                <div>
                  {formData.status === 'active' && (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> ATIVO
                    </span>
                  )}
                  {formData.status === 'trial' && (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> DEGUSTAÇÃO
                    </span>
                  )}
                  {(formData.status === 'past_due' || formData.status === 'blocked') && (
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> PENDENTE
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-gray-500 block pt-1">
                  Vencimento: <strong>
                    {formData.status === 'active' 
                      ? (formData.validadeAssinatura ? new Date(formData.validadeAssinatura).toLocaleDateString('pt-BR') : 'Mensal recorrente')
                      : (formData.trialEndsAt ? new Date(formData.trialEndsAt).toLocaleDateString('pt-BR') : 'Em breve')}
                  </strong>
                </span>
              </div>
            </div>

            {/* SEÇÃO PIX E RENOVAÇÃO */}
            <div className="p-4 bg-[var(--brand-primary)]/5 rounded-2xl border border-[var(--brand-primary)]/20 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4 text-emerald-700" />
                    Chave PIX para Renovação
                  </h4>
                  <p className="text-[11px] text-gray-500">Transfira o valor da mensalidade e envie o comprovante para liberação imediata</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-300">
                <input
                  type="text"
                  readOnly
                  value={pixKey}
                  className="bg-transparent text-xs font-mono font-bold text-gray-800 flex-1 px-2 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    copiedPix ? 'bg-emerald-600 text-white' : 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)]'
                  }`}
                >
                  {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <a
                href={`https://wa.me/${suporteWhats.replace(/\D/g, '')}?text=${whatsappMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
              >
                <MessageSquare className="w-4 h-4" /> Enviar Comprovante de Pagamento (WhatsApp)
              </a>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* ABA 3: SECRETÁRIAS */}
        {activeTab === 'secretarias' && (
          <div className="space-y-4 text-xs">
            {secList.length >= secretaryLimit ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900">
                <strong className="block mb-1">Limite de equipe atingido ({secList.length} de {secretaryLimit})</strong>
                {formData.plano === 'clinica_multi'
                  ? 'O plano Clínica Multi permite até 5 secretárias.'
                  : 'O plano Individual Pro permite 1 secretária. Faça upgrade para Clínica Multi (até 5) na aba Assinatura.'}
              </div>
            ) : (
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
                    placeholder="WhatsApp"
                    value={newSec.telefone}
                    onChange={(e) => setNewSec({ ...newSec, telefone: e.target.value })}
                    className="p-2 bg-white border rounded-xl text-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--brand-primary)] text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Plus className="w-4 h-4" /> Adicionar à Equipe
                </button>
              </form>
            )}

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Secretárias Cadastradas ({secList.length} de {secretaryLimit})
              </span>

              {secList.length === 0 ? (
                <div className="p-4 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed text-xs">
                  Nenhuma secretária vinculada.
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
                      Remover
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-5 py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Save className="w-4 h-4" /> {isSaving ? 'Salvando...' : 'Salvar Secretárias'}
              </button>
            </div>
          </div>
        )}

        {/* ABA 4: SEGURANÇA & A2F */}
        {activeTab === 'seguranca' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <strong className="text-gray-900 block text-xs">Autenticação em Duas Etapas (A2F / 2FA)</strong>
                  <p className="text-gray-500 text-[11px]">Exige verificação adicional a cada login para proteger os prontuários</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={twoFactorConfig.enabled}
                    onChange={(e) => setTwoFactorConfig({ ...twoFactorConfig, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--brand-primary)]"></div>
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
                        twoFactorConfig.method === 'whatsapp' ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 font-bold' : 'bg-white'
                      }`}
                    >
                      <span className="text-base">📱</span>
                      <div>
                        <strong className="block text-gray-900">WhatsApp</strong>
                        <span className="text-[10px] text-gray-500">Código por mensagem</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTwoFactorConfig({ ...twoFactorConfig, method: 'authenticator' })}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2 cursor-pointer ${
                        twoFactorConfig.method === 'authenticator' ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 font-bold' : 'bg-white'
                      }`}
                    >
                      <span className="text-base">🔑</span>
                      <div>
                        <strong className="block text-gray-900">Google Authenticator</strong>
                        <span className="text-[10px] text-gray-500">App de senhas</span>
                      </div>
                    </button>
                  </div>

                  {twoFactorConfig.method === 'whatsapp' && (
                    <div>
                      <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">WhatsApp para Receber o Código</label>
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
                      <strong className="text-sm font-mono text-[var(--brand-primary)] tracking-wider block">{twoFactorConfig.secret}</strong>
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
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-5 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-bold rounded-xl cursor-pointer shadow-xs"
              >
                Salvar Configurações de Segurança
              </button>
            </div>
          </div>
        )}

        {/* ABA 5: EXAMES & IA (UX-05.2) */}
        {activeTab === 'examesIA' && (
          <div className="space-y-5 text-xs">
            {examAIConfigStatus === 'carregando' ? (
              <div className="p-8 flex items-center justify-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando preferências...
              </div>
            ) : (
              <>
                {examAIConfigStatus === 'sem-configuracao' && examesAdicionaisList.length === 0 && (
                  <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-gray-400">
                    Nenhuma preferência configurada ainda — a IA usa as regras padrão do MaternaIA até você definir as suas.
                  </div>
                )}

                {/* EXAMES ADICIONAIS */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Exames adicionais</span>
                  <p className="text-gray-500">Exames fora da lista oficial e nomes alternativos (sinônimos) para o reconhecimento automático — não influenciam o resumo da IA.</p>

                  <form onSubmit={handleAddExameAdicional} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Nome do exame"
                        value={novoExameAdicional.nome}
                        onChange={(e) => setNovoExameAdicional({ ...novoExameAdicional, nome: e.target.value })}
                        className="p-2 bg-white border rounded-xl text-xs"
                      />
                      <select
                        value={novoExameAdicional.categoria}
                        onChange={(e) => setNovoExameAdicional({ ...novoExameAdicional, categoria: e.target.value as ExameAdicional['categoria'] })}
                        className="p-2 bg-white border rounded-xl text-xs"
                      >
                        <option value="Ecografia">Ecografia</option>
                        <option value="Laboratorial">Laboratorial</option>
                        <option value="Outro">Outro</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Sinônimos (separados por vírgula)"
                        value={novoExameAdicional.sinonimosTexto}
                        onChange={(e) => setNovoExameAdicional({ ...novoExameAdicional, sinonimosTexto: e.target.value })}
                        className="p-2 bg-white border rounded-xl text-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[var(--brand-primary)] text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer text-xs"
                    >
                      <Plus className="w-4 h-4" /> Adicionar exame
                    </button>
                  </form>

                  {examesAdicionaisList.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed text-xs">
                      Nenhum exame adicional cadastrado.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {examesAdicionaisList.map((ex) => (
                        <div key={ex.id} className="p-3 bg-gray-50 border rounded-2xl grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                          <input
                            type="text"
                            value={ex.nome}
                            onChange={(e) => handleEditarExameAdicional(ex.id, { nome: e.target.value })}
                            className="p-2 bg-white border rounded-xl text-xs font-bold text-gray-900"
                            aria-label="Nome do exame"
                          />
                          <select
                            value={ex.categoria}
                            onChange={(e) => handleEditarExameAdicional(ex.id, { categoria: e.target.value as ExameAdicional['categoria'] })}
                            className="p-2 bg-white border rounded-xl text-xs"
                            aria-label="Categoria do exame"
                          >
                            <option value="Ecografia">Ecografia</option>
                            <option value="Laboratorial">Laboratorial</option>
                            <option value="Outro">Outro</option>
                          </select>
                          <input
                            type="text"
                            value={ex.sinonimos.join(', ')}
                            onChange={(e) => handleEditarExameAdicional(ex.id, { sinonimos: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                            placeholder="Sinônimos"
                            className="p-2 bg-white border rounded-xl text-xs"
                            aria-label="Sinônimos do exame"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExameAdicional(ex.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer justify-self-end"
                            title="Remover exame adicional"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* PREFERÊNCIAS DE LEITURA DA IA */}
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Preferências de leitura da IA</span>
                    <p className="text-gray-500 mt-1">Defina o que você prefere que a IA destaque nos laudos. Essas instruções orientam a análise e não substituem sua avaliação clínica.</p>
                  </div>

                  {(Object.keys(LABEL_MODALIDADE) as ModalidadeExame[]).map((modalidade) => {
                    const texto = instrucoes[modalidade] || '';
                    return (
                      <div key={modalidade}>
                        <label className="font-bold text-gray-700 uppercase text-[10px] block mb-1">{LABEL_MODALIDADE[modalidade].titulo}</label>
                        <textarea
                          value={texto}
                          onChange={(e) => setInstrucoes({ ...instrucoes, [modalidade]: e.target.value.slice(0, LIMITE_CARACTERES_INSTRUCAO_IA) })}
                          placeholder={LABEL_MODALIDADE[modalidade].pergunta}
                          rows={3}
                          maxLength={LIMITE_CARACTERES_INSTRUCAO_IA}
                          className="w-full p-2.5 bg-gray-50 border rounded-xl text-xs resize-y"
                        />
                        <span className="text-[10px] text-gray-400 block text-right mt-0.5">
                          {texto.length} / {LIMITE_CARACTERES_INSTRUCAO_IA}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveExamAIConfig}
                    disabled={isSavingExamAI}
                    className="px-5 py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Save className="w-4 h-4" /> {isSavingExamAI ? 'Salvando...' : 'Salvar Exames & IA'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
