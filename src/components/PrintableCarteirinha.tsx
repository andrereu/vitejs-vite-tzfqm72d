import React from 'react';
import { createPortal } from 'react-dom';
import { Patient } from '../types/prenatal';

interface PrintableCarteirinhaProps {
  patient?: Patient | null;
  weeks?: number;
}

export const PrintableCarteirinha: React.FC<PrintableCarteirinhaProps> = ({ 
  patient, 
  weeks = 30 
}) => {
  if (!patient || typeof document === 'undefined') return null;

  const content = (
    <div id="print-carteirinha-root" className="hidden print:block text-gray-800 text-[11px] leading-tight font-sans">
      
      {/* PÁGINA 1: CAPA OFICIAL + GRÁFICO GPG */}
      <div className="print-page w-full h-full flex gap-6 bg-white border-2 border-gray-200 rounded-2xl">
        
        {/* COLUNA ESQUERDA: CAPA */}
        <div className="w-1/2 flex flex-col justify-between border-r-2 border-dashed border-[#2E482A]/30 pr-6">
          <div>
            <div className="bg-[#2E482A] text-white p-4 rounded-xl flex items-center justify-between">
              <div>
                <h1 className="text-base font-black tracking-wider uppercase">Dra. Priscila Gapski</h1>
                <p className="text-[10px] text-[#E8ECD8] font-medium">Médica Obstetra • CRM 24734</p>
              </div>
              <div className="text-right">
                <span className="bg-white/20 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Carteirinha Oficial
                </span>
              </div>
            </div>

            <div className="mt-4 bg-[#F8FAF6] border border-[#2E482A]/20 p-3 rounded-xl space-y-2">
              <h2 className="text-xs font-bold text-[#2E482A] uppercase border-b border-[#2E482A]/10 pb-1">
                Identificação da Gestante
              </h2>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="font-bold text-gray-600">Nome:</span> <span className="font-semibold text-gray-900">{patient?.nome || 'Gestante'}</span></div>
                <div><span className="font-bold text-gray-600">Idade:</span> {patient?.idade || '—'} anos</div>
                <div><span className="font-bold text-gray-600">Bebê:</span> <span className="font-semibold text-emerald-800">{patient?.nomeBebe || 'Bebê'}</span></div>
                <div><span className="font-bold text-gray-600">Tipo Sanguíneo:</span> <span className="bg-rose-100 text-rose-800 font-bold px-1 rounded">{patient?.tipoSanguineo || 'A+'}</span></div>
              </div>
            </div>

            <div className="mt-3 bg-white border border-gray-200 p-3 rounded-xl space-y-2">
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
        <div className="w-1/2 flex flex-col justify-between pl-2">
          <div>
            <div className="bg-[#2E482A]/10 p-2.5 rounded-xl border border-[#2E482A]/20 mb-3">
              <h2 className="text-xs font-bold text-[#2E482A] uppercase">
                Curva de Ganho Ponderal Gestacional (MS)
              </h2>
              <p className="text-[9px] text-gray-600">Acompanhamento do IMC e peso ao longo das semanas</p>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
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

      {/* PÁGINA 2: CONSULTAS + EXAMES */}
      <div className="print-page w-full h-full flex gap-6 bg-white border-2 border-gray-200 rounded-2xl">
        
        {/* COLUNA ESQUERDA: CONSULTAS */}
        <div className="w-1/2 flex flex-col justify-between border-r-2 border-dashed border-[#2E482A]/30 pr-6">
          <div>
            <div className="bg-[#2E482A] text-white p-2.5 rounded-xl mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider">
                Evolução & Consultas Pré-Natais
              </h2>
            </div>

            <table className="w-full text-left text-[9px] border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 font-bold text-gray-700">
                <tr>
                  <th className="p-1 border-b">Data</th>
                  <th className="p-1 border-b">IG</th>
                  <th className="p-1 border-b">Peso</th>
                  <th className="p-1 border-b">PA</th>
                  <th className="p-1 border-b">AU</th>
                  <th className="p-1 border-b">BCF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="p-1">12/03</td>
                  <td className="p-1">08s</td>
                  <td className="p-1">63.5</td>
                  <td className="p-1">110x70</td>
                  <td className="p-1">—</td>
                  <td className="p-1">—</td>
                </tr>
                <tr>
                  <td className="p-1">10/04</td>
                  <td className="p-1">12s</td>
                  <td className="p-1">64.1</td>
                  <td className="p-1">110x70</td>
                  <td className="p-1">12cm</td>
                  <td className="p-1">152bpm</td>
                </tr>
                <tr>
                  <td className="p-1">15/05</td>
                  <td className="p-1">17s</td>
                  <td className="p-1">65.2</td>
                  <td className="p-1">120x70</td>
                  <td className="p-1">16cm</td>
                  <td className="p-1">148bpm</td>
                </tr>
                <tr className="bg-emerald-50 font-semibold">
                  <td className="p-1">14/08</td>
                  <td className="p-1">{weeks}s</td>
                  <td className="p-1">71.2</td>
                  <td className="p-1">110x70</td>
                  <td className="p-1">29cm</td>
                  <td className="p-1">138bpm</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200 pt-2 text-[8px] text-gray-500">
            AU: Altura Uterina | BCF: Batimentos Fetais | PA: Pressão Arterial
          </div>
        </div>

        {/* COLUNA DIREITA: EXAMES */}
        <div className="w-1/2 flex flex-col justify-between pl-2">
          <div>
            <div className="bg-[#2E482A] text-white p-2.5 rounded-xl mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider">
                Exames Laboratoriais & Sorologias
              </h2>
            </div>

            <table className="w-full text-left text-[9px] border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 font-bold text-gray-700">
                <tr>
                  <th className="p-1 border-b">Exame</th>
                  <th className="p-1 border-b">1º Trim.</th>
                  <th className="p-1 border-b">2º Trim.</th>
                  <th className="p-1 border-b">3º Trim.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="p-1 font-semibold">Hemoglobina / Ht</td>
                  <td className="p-1 text-emerald-800">12.8 / 38%</td>
                  <td className="p-1 text-emerald-800">12.2 / 36%</td>
                  <td className="p-1 text-gray-400">Pendente</td>
                </tr>
                <tr>
                  <td className="p-1 font-semibold">Glicemia Jejum</td>
                  <td className="p-1 text-emerald-800">82 mg/dL</td>
                  <td className="p-1 text-emerald-800">TOTG: 84/120</td>
                  <td className="p-1 text-gray-400">—</td>
                </tr>
                <tr>
                  <td className="p-1 font-semibold">HIV / VDRL</td>
                  <td className="p-1 text-emerald-800">Não Reag.</td>
                  <td className="p-1 text-emerald-800">Não Reag.</td>
                  <td className="p-1 text-gray-400">Pendente</td>
                </tr>
                <tr>
                  <td className="p-1 font-semibold">Strepto B (Swab)</td>
                  <td className="p-1 text-gray-400">—</td>
                  <td className="p-1 text-gray-400">—</td>
                  <td className="p-1 text-amber-700 font-bold">35-37 sem</td>
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
