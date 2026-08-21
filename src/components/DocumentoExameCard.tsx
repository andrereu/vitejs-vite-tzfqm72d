import React, { useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { pareceNomeDeArquivo } from '../utils/examesOrganizacao';
import { formatDateBR } from '../utils/formatters';

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

// Card expansível de um documento anexado (ecografia ou outro laudo) — UX-05,
// refinado na UX-05.1. Mesmo padrão de interação já estabelecido em
// ConsultaEvolucaoCard (UX-03): fechado mostra só o essencial pra escanear
// (data + nome), expandido revela o resto. Ordem de dentro: Documento
// (preview) → Observação da Dra. — a análise do Gemini (resumoIA) não é mais
// renderizada aqui (decisão de produto da UX-05.1: a paciente não deve ver
// interpretação de IA, só o que a médica escreveu). O dado continua existindo
// no objeto — só a apresentação deixou de mostrá-lo; nada foi apagado do
// Firestore nem desligado no Gemini.
//
// Só apresentação: recebe o exame já pronto, não acessa Firestore, não
// conhece upload/OCR/Gemini — notaDra é só texto que já veio preenchido (ou
// não) no objeto.
export const DocumentoExameCard: React.FC<DocumentoExameCardProps> = ({ exame }) => {
  const [aberto, setAberto] = useState(false);
  const detalhesId = `documento-${exame.id}-detalhes`;
  const temPreview = Boolean(exame.fileData);
  const temNotaDra = Boolean(exame.notaDra?.trim());
  // UX-05.1 — `nome` às vezes é o título clínico digitado no upload, às
  // vezes (quando ficou em branco) é o nome bruto do arquivo do celular —
  // ver pareceNomeDeArquivo() pra não exibir esse segundo caso como se fosse
  // o nome do exame.
  const nomeEhArquivo = pareceNomeDeArquivo(exame.nome);
  const tituloExibido = nomeEhArquivo ? (exame.tipo === 'Ecografia' ? 'Ecografia' : 'Documento') : exame.nome;

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
          <strong className="text-sm font-bold text-gray-900 block truncate">{tituloExibido}</strong>
          <span className="text-[10px] text-gray-500 uppercase font-bold">{exame.tipo} • {formatDateBR(exame.dataUpload)}</span>
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
          {/* Nome de arquivo original, área secundária — só quando o título
              exibido acima já não é o próprio nome (seção 4 da UX-05.1) */}
          {temPreview && nomeEhArquivo && (
            <span className="text-[10px] text-gray-400 block -mt-1.5">Documento original: {exame.nome}</span>
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
