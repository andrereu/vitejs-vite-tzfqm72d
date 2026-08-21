import React, { useState } from 'react';
import { ChevronDown, Download, Sparkles } from 'lucide-react';

interface DocumentoExameCardProps {
  exame: {
    id: string;
    nome: string;
    tipo: string;
    dataUpload: string;
    fileData?: string;
    resumoIA?: string;
    notaDra?: string;
  };
}

// Card expansível de um documento anexado (ecografia ou outro laudo) — UX-05.
// Mesmo padrão de interação já estabelecido em ConsultaEvolucaoCard (UX-03):
// fechado mostra só o essencial pra escanear (data + nome), expandido revela
// o resto. Aqui a ordem de dentro segue a hierarquia pedida pela fase —
// Documento (preview) → Análise da IA → Observação da médica — pra nunca
// confundir o que o Gemini escreveu com o que a médica escreveu.
//
// Só apresentação: recebe o exame já pronto, não acessa Firestore, não
// conhece upload/OCR/Gemini — resumoIA/notaDra são só texto que já veio
// preenchido (ou não) no objeto.
export const DocumentoExameCard: React.FC<DocumentoExameCardProps> = ({ exame }) => {
  const [aberto, setAberto] = useState(false);
  const detalhesId = `documento-${exame.id}-detalhes`;
  const temPreview = Boolean(exame.fileData);
  const temResumoIA = Boolean(exame.resumoIA?.trim());
  const temNotaDra = Boolean(exame.notaDra?.trim());

  return (
    <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls={detalhesId}
        className="w-full flex items-center justify-between gap-3 p-3.5 text-left cursor-pointer hover:bg-gray-50"
      >
        <div className="min-w-0">
          <strong className="text-sm font-bold text-gray-900 block truncate">{exame.nome}</strong>
          <span className="text-[10px] text-gray-500 uppercase font-bold">{exame.tipo} • {exame.dataUpload}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {aberto && (
        <div id={detalhesId} className="px-3.5 pb-3.5 pt-3 border-t border-gray-100 space-y-3">
          {/* DOCUMENTO */}
          {temPreview && (
            exame.fileData!.startsWith('data:application/pdf') ? (
              <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📄</span>
                  <div>
                    <strong className="text-gray-800 block font-bold">Documento em PDF</strong>
                    <span className="text-[10px] text-gray-500">Arquivo processado pelo Gemini IA</span>
                  </div>
                </div>
                <a
                  href={exame.fileData}
                  download={`${exame.nome || 'laudo'}.pdf`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--brand-primary)] hover:opacity-90 text-white rounded-lg font-bold text-[10px] transition-all cursor-pointer"
                >
                  <Download className="w-3 h-3" /> Baixar PDF
                </a>
              </div>
            ) : (
              <img
                src={exame.fileData}
                alt={exame.nome}
                className="max-h-68 rounded-xl object-contain border bg-black/5 p-1"
              />
            )
          )}

          {/* ANÁLISE DA IA — secundária ao documento, nunca a primeira coisa que se lê */}
          {temResumoIA && (
            <div>
              <span className="text-[10px] font-bold text-pink-500 uppercase flex items-center gap-1 mb-1">
                <Sparkles className="w-3 h-3" /> Análise da IA
              </span>
              <div className="bg-pink-50/60 p-3 rounded-xl text-xs text-gray-700 whitespace-pre-line border border-pink-100">
                {exame.resumoIA}
              </div>
            </div>
          )}

          {/* OBSERVAÇÃO DA DRA. — identidade visual própria, sem ler como alerta */}
          {temNotaDra && (
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Observação da Dra.</span>
              <div className="bg-gray-50 p-3 rounded-xl text-xs text-gray-800 whitespace-pre-line border border-gray-200">
                {exame.notaDra}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
