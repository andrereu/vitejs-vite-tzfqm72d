import React from 'react';
import { createPortal } from 'react-dom';
import type { Patient } from '../types/prenatal';

interface PrintableCarteirinhaProps {
  patient?: Patient | null;
  weeks?: number;
}

export const PrintableCarteirinha: React.FC<PrintableCarteirinhaProps> = ({ 
  patient, 
  weeks = 30 
}) => {
  if (!patient || typeof document === 'undefined') return null;

  const consultas = patient.consultasEvolucao || [];

  const content = (
    <div id="print-carteirinha-wrapper">
      <style>{`
        @media screen {
          #print-carteirinha-wrapper {
            display: none !important;
          }
        }
        @media print {
          @page {
            size: 297mm 210mm landscape;
            margin: 0mm !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 297mm !important;
            height: 210mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #root {
            display: none !important;
          }
          #print-carteirinha-wrapper {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            z-index: 999999 !important;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          }
          .folha-a4 {
            width: 297mm !important;
            height: 210mm !important;
            max-height: 210mm !important;
            box-sizing: border-box !important;
            padding: 10mm 12mm !important;
            display: flex !important;
            flex-direction: row !important;
            gap: 14mm !important;
            background: #ffffff !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
          }
          .folha-a4:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .coluna-a4 {
            width: 50% !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {/* ================= PÁGINA 1: CAPA + GPG ================= */}
      <div className="folha-a4 text-gray-800 text-[11px] leading-tight">
        
        {/* COLUNA ESQUERDA: CAPA & DADOS */}
        <div className="coluna-a4 border-r-2 border-dashed border-[#2E482A]/30 pr-5">
          <div className="space-y-3">
            <div className="bg-[#2E482A] text-white p-3.5 rounded-xl flex items-center justify-between shadow-xs">
              <div>
                <h1 className="text-base font-black tracking-wider uppercase">Dra. Priscila Gapski</h1>
                <p className="text-[10px] text-[#E8ECD8] font-medium">Médica Obstetra • CRM 24734</p>
              </div>
              <span className="bg-white/20 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                Carteirinha Oficial
              </span>
            </div>

            <div className="bg-[#F8FAF6] border border-[#2E482A]/20 p-3 rounded-xl space-y-2">
              <h2 className="text-xs font-bold text-[#2E482A] uppercase border-b border-[#2E482A]/10 pb-1">
                Identificação da Gestante
              </h2>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="font-bold text-gray-600">Nome:</span> <span className="font-semibold text-gray-900">{patient?.nome || 'Gestante'}</span></div>
                <div><span className="font-bold text-gray-600">Idade:</span> {patient?.idade || '—'} anos</div>
                <div><span className="font-bold text-gray-600">Bebê:</span> <span className="font-semibold text-emerald-800">{patient?.nomeBebe || 'Bebê'}</span></div>
                <div><span className="font-bold text-gray-600">Tipo Sanguíneo:</span> <span className="bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded">{patient?.tipoSanguineo || 'A+'}</span></div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-3 rounded-xl space-y-2">
              <h2 className="text-xs font-bold text-[#2E482A] uppercase border-b border-gray-100 pb-1">
                Parâmetros Gestacionais
              </h2>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="bg-[#F8FAF6] p-2 rounded-lg border border-[#2E482A]/10">
                  <span className="text-gray-500 block text-[9px]">DUM</span>
                  <strong className="text-gray-800">{patient?.dum || '—'}</strong>
                </div>
                <div className="bg-[#F8FAF6] p-2 rounded-lg border border-[#2E482A]/10">
                  <span className="text-gray-500 block text-[9px]">DPP</span>
                  <strong className="text-emerald-800">{patient?.dpp || '—'}</strong>
                </div>
                <div className="bg-[#2E482A]/10 p-2 rounded-lg border border-[#2E482A]/20">
                  <span className="text-gray-600 block text-[9px]">Idade Atual</span>
                  <strong className="text-[#2E482A]">{weeks} semanas</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-[9px] text-amber-950">
            <strong className="block text-amber-900 mb-0.5">⚠️ SINAIS DE ALERTA (Urgência Obstétrica):</strong>
            Sangramento vaginal, perda contínua de líquido, dor abdominal persistente ou ausência de movimentos fetais.
          </div>
        </div>

        {/* COLUNA DIREITA: GPG */}
        <div className="coluna-a4 pl-2">
          <div className="space-y-3">
            <div className="bg-[#2E482A]/10 p-2.5 rounded-xl border border-[#2E482A]/20">
              <h2 className="text-xs font-bold text-[#2E482A] uppercase">
                Curva de Ganho Ponderal Gestacional (MS)
              </h2>
              <p className="text-[9px] text-gray-600">Acompanhamento do IMC e peso ao longo das semanas</p>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-[9px]">
                <thead className="bg-gray-100 text-gray-700 font-bold">
                  <tr>
                    <th className="p-1.5 border-b">Semana</th>
                    <th className="p-1.5 border-b">Peso</th>
                    <th className="p-1.5 border-b">Ganho</th>
                    <th className="p-1.5 border-b">Faixa (MS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="p-1.5 font-bold">Inicial</td>
                    <td className="p-1.5">{patient?.pesoInicial || '63.5'} kg</td>
                    <td className="p-1.5">—</td>
                    <td className="p-1.5 text-emerald-700 font-semibold">Adequado</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-bold">20ª Sem.</td>
                    <td className="p-1.5">66.2 kg</td>
                    <td className="p-1.5">+ 2.7 kg</td>
                    <td className="p-1.5 text-emerald-700 font-semibold">Adequado</td>
                  </tr>
                  <tr className="bg-emerald-50">
                    <td className="p-1.5 font-black text-[#2E482A]">Atual ({weeks}s)</td>
                    <td className="p-1.5 font-black text-[#2E482A]">71.2 kg</td>
                    <td className="p-1.5 font-black text-[#2E482A]">+ 7.7 kg</td>
                    <td className="p-1.5 font-black text-emerald-800">Ideal</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[9px]">
              <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-gray-500 block">Altura:</span>
                <strong>{patient?.altura || '1.65'} m</strong>
              </div>
              <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-gray-500 block">IMC Inicial:</span>
                <strong className="text-emerald-700">23.3 (Eutrófico)</strong>
              </div>
            </div>
          </div>

          <div className="text-right text-[8px] text-gray-400">
            Página 1/2 • Dra. Priscila Gapski
          </div>
        </div>
      </div>

      {/* ================= PÁGINA 2: CONSULTAS + EXAMES ================= */}
      <div className="folha-a4 text-gray-800 text-[11px] leading-tight">
        
        {/* COLUNA ESQUERDA: CONSULTAS */}
        <div className="coluna-a4 border-r-2 border-dashed border-[#2E482A]/30 pr-5">
          <div>
            <div className="bg-[#2E482A] text-white p-2.5 rounded-xl mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider">
                Evolução & Consultas Pré-Natais
              </h2>
            </div>

            <table className="w-full text-left text-[9px] border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 font-bold text-gray-700">
                <tr>
                  <th className="p-1.5 border-b">Data</th>
                  <th className="p-1.5 border-b">IG</th>
                  <th className="p-1.5 border-b">Peso</th>
                  <th className="p-1.5 border-b">PA</th>
                  <th className="p-1.5 border-b">AU</th>
                  <th className="p-1.5 border-b">BCF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {consultas.length > 0 ? (
                  consultas.map((c: any, i: number) => (
                    <tr key={c.id || i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                      <td className="p-1.5">{c.data}</td>
                      <td className="p-1.5">{c.igSem}s</td>
                      <td className="p-1.5">{c.peso}</td>
                      <td className="p-1.5">{c.pa}</td>
                      <td className="p-1.5">{c.au || '—'}</td>
                      <td className="p-1.5">{c.bcfMf || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-2 text-center text-gray-400">Nenhuma consulta registrada</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200 pt-2 text-[8px] text-gray-500">
            AU: Altura Uterina | BCF: Batimentos Fetais | PA: Pressão Arterial
          </div>
        </div>

        {/* COLUNA DIREITA: EXAMES */}
        <div className="coluna-a4 pl-2">
          <div>
            <div className="bg-[#2E482A] text-white p-2.5 rounded-xl mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider">
                Exames Laboratoriais & Sorologias
              </h2>
            </div>

            <table className="w-full text-left text-[9px] border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 font-bold text-gray-700">
                <tr>
                  <th className="p-1.5 border-b">Exame</th>
                  <th className="p-1.5 border-b">1º Trim.</th>
                  <th className="p-1.5 border-b">2º Trim.</th>
                  <th className="p-1.5 border-b">3º Trim.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="p-1.5 font-semibold">Hemoglobina / Ht</td>
                  <td className="p-1.5 text-emerald-800 font-medium">12.8 / 38%</td>
                  <td className="p-1.5 text-emerald-800 font-medium">12.2 / 36%</td>
                  <td className="p-1.5 text-gray-400">Pendente</td>
                </tr>
                <tr>
                  <td className="p-1.5 font-semibold">Glicemia Jejum</td>
                  <td className="p-1.5 text-emerald-800 font-medium">82 mg/dL</td>
                  <td className="p-1.5 text-emerald-800 font-medium">TOTG: 84/120</td>
                  <td className="p-1.5 text-gray-400">—</td>
                </tr>
                <tr>
                  <td className="p-1.5 font-semibold">HIV / VDRL</td>
                  <td className="p-1.5 text-emerald-800 font-medium">Não Reag.</td>
                  <td className="p-1.5 text-emerald-800 font-medium">Não Reag.</td>
                  <td className="p-1.5 text-gray-400">Pendente</td>
                </tr>
                <tr>
                  <td className="p-1.5 font-semibold">Strepto B (Swab)</td>
                  <td className="p-1.5 text-gray-400">—</td>
                  <td className="p-1.5 text-gray-400">—</td>
                  <td className="p-1.5 text-amber-700 font-bold">35-37 sem</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-right text-[8px] text-gray-400">
            Página 2/2 • Dra. Priscila Gapski (CRM 24734)
          </div>
        </div>
      </div>

    </div>
  );

  return createPortal(content, document.body);
};

export default PrintableCarteirinha;
