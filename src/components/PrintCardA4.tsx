import React from 'react';
import type { Patient } from '../types/prenatal';
import { formatDateDisplay } from '../utils/formatters';

interface PrintCardA4Props {
  currentPatient: Patient;
  LISTA_EXAMES_OFICIAIS: Array<{ id: string; label: string; placeholder: string }>;
}

export const PrintCardA4: React.FC<PrintCardA4Props> = ({ currentPatient, LISTA_EXAMES_OFICIAIS }) => {
  return (
    <div className="hidden print:block font-sans text-black w-full text-[8.5px] leading-tight">
      <div className="grid grid-cols-3 gap-3 border-2 border-[var(--brand-primary)] p-2 bg-white rounded-sm">
        
        {/* DOBRA 1: CAPA + IDENTIFICAÇÃO + QUADRO VACINAL + POEMA */}
        <div className="border-r border-gray-400 pr-2 space-y-2 flex flex-col justify-between">
          <div>
            <div className="text-center border-b pb-1 mb-2">
              <h1 className="font-serif font-bold text-sm text-[var(--brand-primary)]">Dra. Priscila Gapski</h1>
              <p className="text-[7.5px] font-bold text-gray-700">CRM: 33439/PR • RQE 24734</p>
              <p className="text-[7.5px] text-[var(--brand-primary)] font-medium">@prigapski.obstetra • Obstetra</p>
            </div>

            <div className="space-y-1 bg-gray-50 p-1.5 border rounded-xs mb-2">
              <span className="font-bold text-[8px] uppercase block border-b text-[var(--brand-primary)]">DADOS DA GESTANTE</span>
              <p><strong>NOME:</strong> {currentPatient.nome}</p>
              <p><strong>IDADE:</strong> {currentPatient.idade} anos • <strong>ALTURA:</strong> {currentPatient.altura}m</p>
              <p><strong>PAI:</strong> {currentPatient.pai}</p>
              <p><strong>DOENÇAS PRÉVIAS:</strong> {currentPatient.doencasPrevias}</p>
            </div>

            <div className="bg-gray-50 p-1.5 border rounded-xs space-y-1 mb-2">
              <div className="grid grid-cols-2 gap-1">
                <p><strong>G:</strong> {currentPatient.g} <strong>P:</strong> {currentPatient.p} <strong>C:</strong> {currentPatient.c} <strong>A:</strong> {currentPatient.a}</p>
                <p><strong>DPP:</strong> {new Date(currentPatient.dpp).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <p><strong>PESO INICIAL:</strong> {currentPatient.pesoInicial}kg</p>
                <p><strong>TIPO SANGUÍNEO:</strong> {currentPatient.tipoSanguineo}</p>
              </div>
              <p><strong>NOME DO BEBÊ:</strong> {currentPatient.nomeBebe}</p>
            </div>

            {/* QUADRO VACINAL */}
            <div className="border p-1 space-y-1 bg-emerald-50/40">
              <span className="font-bold text-[8px] uppercase block border-b text-[var(--brand-primary)] text-center">QUADRO VACINAL</span>
              <div className="grid grid-cols-3 text-[7px] text-center gap-0.5">
                <div className="border bg-white p-0.5"><strong>INFLUENZA</strong><br />ANUAL<br />{currentPatient.vacinas?.influenza?.data || '____/____/____'}</div>
                <div className="border bg-white p-0.5"><strong>VSR</strong><br />32 SEMANAS<br />{currentPatient.vacinas?.vsr?.data || '____/____/____'}</div>
                <div className="border bg-white p-0.5"><strong>dTpa</strong><br />20 SEMANAS<br />{currentPatient.vacinas?.dtpa?.data || '____/____/____'}</div>
              </div>
              <div className="border bg-white p-0.5 text-[7px]">
                <strong>HEPATITE B:</strong> 1ª Dose: {currentPatient.vacinas?.hepatiteB?.d1 || '____/____'} | 2ª Dose: {currentPatient.vacinas?.hepatiteB?.d2 || '____/____'} | 3ª Dose: {currentPatient.vacinas?.hepatiteB?.d3 || '____/____'}
              </div>
            </div>
          </div>

          <div className="italic text-[7.5px] text-center text-gray-700 bg-pink-50/50 p-1 border border-pink-200">
            "Antes de você existir eu já te queria, antes de você nascer eu já te amava, em menos de um minuto de nascido já daria minha vida por você."
          </div>
        </div>

        {/* DOBRA 2: MATRIZ COMPLETA DE EXAMES LABORATORIAIS & USG */}
        <div className="border-r border-gray-400 pr-2 space-y-2">
          <div>
            <span className="font-bold text-[8px] uppercase block border-b text-[var(--brand-primary)] text-center mb-1">EXAMES LABORATORIAIS</span>
            <table className="w-full text-[6.8px] border-collapse text-left">
              <thead>
                <tr className="border-b bg-gray-100 font-bold">
                  <th className="p-0.5">EXAME</th>
                  <th className="p-0.5">DATA / RESULTADO</th>
                  <th className="p-0.5">DATA / RESULTADO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {LISTA_EXAMES_OFICIAIS.map((ex) => {
                  const [ultimo, anterior] = currentPatient.examesTabela?.[ex.id] || [];
                  return (
                    <tr key={ex.id}>
                      <td className="p-0.5 font-semibold">{ex.label}</td>
                      <td className="p-0.5">{ultimo ? `${formatDateDisplay(ultimo.data)}: ${ultimo.resultado}` : '____/____ - __________'}</td>
                      <td className="p-0.5">{anterior ? `${formatDateDisplay(anterior.data)}: ${anterior.resultado}` : '____/____ - __________'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-1 border-t">
            <span className="font-bold text-[8px] uppercase block text-[var(--brand-primary)] text-center mb-1">U.S. OBSTÉTRICO</span>
            <table className="w-full text-[7px] border-collapse text-center">
              <thead>
                <tr className="border-b bg-gray-100 font-bold">
                  <th className="p-0.5">DATA</th>
                  <th className="p-0.5">IG</th>
                  <th className="p-0.5">PF</th>
                  <th className="p-0.5">LA</th>
                  <th className="p-0.5">PL</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-0.5 text-gray-400">____/____/____</td>
                    <td className="p-0.5 text-gray-400">____w</td>
                    <td className="p-0.5 text-gray-400">______g</td>
                    <td className="p-0.5 text-gray-400">______</td>
                    <td className="p-0.5 text-gray-400">______</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* DOBRA 3: CONSULTAS DE PRÉ-NATAL E CALENDÁRIO DE AGENDAMENTOS */}
        <div className="space-y-2">
          <div>
            <span className="font-bold text-[8px] uppercase block border-b text-[var(--brand-primary)] text-center mb-1">REGISTRO DE CONSULTAS (EVOLUÇÃO)</span>
            <table className="w-full text-[7px] border-collapse text-left">
              <thead>
                <tr className="border-b bg-gray-100 font-bold">
                  <th className="p-0.5">DATA</th>
                  <th className="p-0.5">IG</th>
                  <th className="p-0.5">PESO</th>
                  <th className="p-0.5">PA</th>
                  <th className="p-0.5">AU</th>
                  <th className="p-0.5">BCF/MF</th>
                  <th className="p-0.5">CONDUTA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentPatient.consultasEvolucao.map(c => (
                  <tr key={c.id}>
                    <td className="p-0.5 font-bold">{c.data}</td>
                    <td className="p-0.5">{c.igSem}w</td>
                    <td className="p-0.5">{c.peso}k</td>
                    <td className="p-0.5">{c.pa}</td>
                    <td className="p-0.5">{c.au}</td>
                    <td className="p-0.5">{c.bcfMf}</td>
                    <td className="p-0.5 text-[6.5px]">{c.conduta}</td>
                  </tr>
                ))}
                {[1, 2, 3, 4, 5, 6].map((_, i) => (
                  <tr key={`blank-${i}`}>
                    <td className="p-0.5 text-gray-300">__/____</td>
                    <td className="p-0.5 text-gray-300">__w</td>
                    <td className="p-0.5 text-gray-300">__k</td>
                    <td className="p-0.5 text-gray-300">____</td>
                    <td className="p-0.5 text-gray-300">__</td>
                    <td className="p-0.5 text-gray-300">____</td>
                    <td className="p-0.5 text-gray-300">_________________</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-1 border-t">
            <span className="font-bold text-[8px] uppercase block text-[var(--brand-primary)] text-center mb-1">CALENDÁRIO DE CONSULTAS (PRÓXIMAS)</span>
            <div className="grid grid-cols-2 gap-1 text-[7px] border p-1 bg-gray-50">
              {Array.from({ length: 4 }).map((_, idx) => {
                const item = currentPatient.agendaConsultas?.[idx];
                return (
                  <div key={idx} className="truncate font-medium">
                    {item ? (
                      `DATA: ${formatDateDisplay(item.data)} - ${item.horario}`
                    ) : (
                      'DATA: ____/____/____ - ____:____'
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
