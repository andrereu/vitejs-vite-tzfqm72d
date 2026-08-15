import React from 'react';
import { 
  X, User, Syringe, CalendarPlus, Bot, Loader2, Smartphone, Share 
} from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '../firebase';

interface AppModalsProps {
  // PWA Modal
  showInstallModal: boolean;
  setShowInstallModal: (v: boolean) => void;
  isIOS: boolean;
  
  // Profile Modal
  showEditProfileModal: boolean;
  setShowEditProfileModal: (v: boolean) => void;
  editProfileData: any;
  setEditProfileData: (v: any) => void;
  handleSaveProfile: (e: React.FormEvent) => void;
  
  // Vacinas Modal
  showEditVacinasModal: boolean;
  setShowEditVacinasModal: (v: boolean) => void;
  editVacinasData: any;
  setEditVacinasData: (v: any) => void;
  handleSaveVacinas: (e: React.FormEvent) => void;
  
  // Exames Modal
  showEditExamesModal: boolean;
  setShowEditExamesModal: (v: boolean) => void;
  editExamesData: any;
  setEditExamesData: (v: any) => void;
  handleSaveTabelaExames: () => void;
  LISTA_EXAMES_OFICIAIS: Array<{ id: string; label: string; placeholder: string }>;
  
  // Agenda Modal
  showAddAgendaModal: boolean;
  setShowAddAgendaModal: (v: boolean) => void;
  newAgenda: any;
  setNewAgenda: (v: any) => void;
  handleAddAgenda: (e: React.FormEvent) => void;
  
  // Upload Exam Modal
  showUploadExamModal: boolean;
  setShowUploadExamModal: (v: boolean) => void;
  examName: string;
  setExamName: (v: string) => void;
  examCategory: string;
  setExamCategory: (v: string) => void;
  setSelectedFile: (file: File | null) => void;
  isUploading: boolean;
  handleFileUpload: (e: React.FormEvent) => void;
  
  // Add Consulta Modal
  showAddConsultaModal: boolean;
  setShowAddConsultaModal: (v: boolean) => void;
  newConsulta: any;
  setNewConsulta: (v: any) => void;
  handleAddConsulta: (e: React.FormEvent) => void;
  
  // New Patient Modal
  showNewPatientModal: boolean;
  setShowNewPatientModal: (v: boolean) => void;
  newPatient: any;
  setNewPatient: (v: any) => void;
  handleCreatePatient: (e: React.FormEvent) => void;

    // Super Admin Modal
  showMasterLoginModal: boolean;
  setShowMasterLoginModal: (v: boolean) => void;
  masterEmail: string;
  setMasterEmail: (v: string) => void;
  masterPassword: string;
  setMasterPassword: (v: string) => void;
  handleMasterLogin: (e: React.FormEvent) => void;

  
  // Login Modals
  showPatientLoginModal: boolean;
  setShowPatientLoginModal: (v: boolean) => void;
  loginCpf: string;
  setLoginCpf: (v: string) => void;
  handlePatientLogin: (e: React.FormEvent) => void;
  handleGooglePatientLogin: () => void;
  
  showDoctorLoginModal: boolean;
  setShowDoctorLoginModal: (v: boolean) => void;
  doctorEmail: string;
  setDoctorEmail: (v: string) => void;
  doctorPassword: string;
  setDoctorPassword: (v: string) => void;
  handleDoctorLogin: (e: React.FormEvent) => void;
  loginError: string;
}

export const AppModals: React.FC<AppModalsProps> = (props) => {
  return (
    <>
      {/* MODAL GUIADO DE INSTALAÇÃO PWA */}
      {props.showInstallModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#2E482A]" />
                Instalar no Telemóvel
              </h3>
              <button onClick={() => props.setShowInstallModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {props.isIOS ? (
              <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
                <p>Para instalar no seu iPhone ou iPad:</p>
                <ol className="list-decimal pl-4 space-y-1.5 font-medium">
                  <li>Toque no botão de <strong>Compartilhar</strong> <Share className="w-3.5 h-3.5 inline text-blue-600" /> no menu do Safari.</li>
                  <li>Role a lista para baixo e selecione <strong>Adicionar à Tela Inicial</strong>.</li>
                  <li>Confirme o nome e toque em <strong>Adicionar</strong>.</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
                <p>Para instalar no seu dispositivo Android ou computador:</p>
                <ol className="list-decimal pl-4 space-y-1.5 font-medium">
                  <li>Toque nos <strong>três pontos</strong> do menu do Chrome (canto superior direito).</li>
                  <li>Selecione <strong>Instalar Aplicativo</strong> ou <strong>Adicionar à Tela Inicial</strong>.</li>
                  <li>Siga as instruções na tela.</li>
                </ol>
              </div>
            )}

            <button
              onClick={() => props.setShowInstallModal(false)}
              className="w-full py-2.5 bg-[#2E482A] text-white font-bold text-xs rounded-xl"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PERFIL & ANAMNESE */}
      {props.showEditProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white p-6 rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto space-y-4">
            <h3 className="font-bold text-gray-900 text-base border-b pb-2 flex items-center gap-2">
              <User className="w-5 h-5 text-[#2E482A]" />
              Editar Dados da Gestante & Anamnese
            </h3>
            
            <form onSubmit={props.handleSaveProfile} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Nome Completo</label>
                  <input 
                    type="text" 
                    value={props.editProfileData.nome || ''} 
                    onChange={(e) => props.setEditProfileData({ ...props.editProfileData, nome: e.target.value })} 
                    className="w-full p-2.5 border rounded-xl" 
                    required 
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-500 uppercase text-[10px] block mb-1">CPF</label>
                  <input 
                    type="text" 
                    value={props.editProfileData.cpf || ''} 
                    onChange={(e) => props.setEditProfileData({ ...props.editProfileData, cpf: e.target.value })} 
                    className="w-full p-2.5 border rounded-xl" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-500 uppercase text-[10px] block mb-1">WhatsApp / Telefone</label>
                  <input 
                    type="text" 
                    placeholder="(41) 99999-9999"
                    value={props.editProfileData.telefone || ''} 
                    onChange={(e) => props.setEditProfileData({ ...props.editProfileData, telefone: e.target.value })} 
                    className="w-full p-2.5 border rounded-xl" 
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Idade (anos)</label>
                  <input 
                    type="text" 
                    value={props.editProfileData.idade || ''} 
                    onChange={(e) => props.setEditProfileData({ ...props.editProfileData, idade: e.target.value })} 
                    className="w-full p-2.5 border rounded-xl" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Altura (m)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 1.65" 
                    value={props.editProfileData.altura || ''} 
                    onChange={(e) => props.setEditProfileData({ ...props.editProfileData, altura: e.target.value })} 
                    className="w-full p-2.5 border rounded-xl" 
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Peso Inicial (kg)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 65.0" 
                    value={props.editProfileData.pesoInicial || ''} 
                    onChange={(e) => props.setEditProfileData({ ...props.editProfileData, pesoInicial: e.target.value })} 
                    className="w-full p-2.5 border rounded-xl" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Pai / Acompanhante</label>
                  <input 
                    type="text" 
                    value={props.editProfileData.pai || ''} 
                    onChange={(e) => props.setEditProfileData({ ...props.editProfileData, pai: e.target.value })} 
                    className="w-full p-2.5 border rounded-xl" 
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Nome do Bebê</label>
                  <input 
                    type="text" 
                    value={props.editProfileData.nomeBebe || ''} 
                    onChange={(e) => props.setEditProfileData({ ...props.editProfileData, nomeBebe: e.target.value })} 
                    className="w-full p-2.5 border rounded-xl" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-500 uppercase text-[10px] block mb-1">DUM</label>
                  <input 
                    type="date" 
                    value={props.editProfileData.dum || ''} 
                    onChange={(e) => props.setEditProfileData({ ...props.editProfileData, dum: e.target.value })} 
                    className="w-full p-2.5 border rounded-xl bg-white" 
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Tipo Sanguíneo</label>
                  <select 
                    value={props.editProfileData.tipoSanguineo || 'A+'} 
                    onChange={(e) => props.setEditProfileData({ ...props.editProfileData, tipoSanguineo: e.target.value })} 
                    className="w-full p-2.5 border rounded-xl bg-white"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(ts => (
                      <option key={ts} value={ts}>{ts}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* GPCA */}
              <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200">
                <span className="font-bold text-emerald-900 block uppercase text-[10px] mb-1.5">Histórico Obstétrico (GPCA)</span>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <label className="font-bold text-[#2E482A] text-[10px] block">G</label>
                    <input 
                      type="number" min="1" 
                      value={props.editProfileData.g || '1'} 
                      onChange={(e) => props.setEditProfileData({ ...props.editProfileData, g: e.target.value })} 
                      className="w-full p-1.5 border rounded-lg text-center font-bold text-xs bg-white" 
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#2E482A] text-[10px] block">P</label>
                    <input 
                      type="number" min="0" 
                      value={props.editProfileData.p || '0'} 
                      onChange={(e) => props.setEditProfileData({ ...props.editProfileData, p: e.target.value })} 
                      className="w-full p-1.5 border rounded-lg text-center font-bold text-xs bg-white" 
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#2E482A] text-[10px] block">C</label>
                    <input 
                      type="number" min="0" 
                      value={props.editProfileData.c || '0'} 
                      onChange={(e) => props.setEditProfileData({ ...props.editProfileData, c: e.target.value })} 
                      className="w-full p-1.5 border rounded-lg text-center font-bold text-xs bg-white" 
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#2E482A] text-[10px] block">A</label>
                    <input 
                      type="number" min="0" 
                      value={props.editProfileData.a || '0'} 
                      onChange={(e) => props.setEditProfileData({ ...props.editProfileData, a: e.target.value })} 
                      className="w-full p-1.5 border rounded-lg text-center font-bold text-xs bg-white" 
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-500 uppercase text-[10px] block mb-1">Doenças Prévias / Alergias</label>
                <textarea 
                  value={props.editProfileData.doencasPrevias || ''} 
                  onChange={(e) => props.setEditProfileData({ ...props.editProfileData, doencasPrevias: e.target.value })} 
                  className="w-full p-2.5 border rounded-xl h-20 text-xs" 
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => props.setShowEditProfileModal(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-[#2E482A] text-white font-bold text-xs rounded-xl">Salvar Perfil</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VACINAS */}
      {props.showEditVacinasModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white p-6 rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto space-y-4">
            <h3 className="font-bold text-gray-900 text-base border-b pb-2 flex items-center gap-2">
              <Syringe className="w-5 h-5 text-[#2E482A]" />
              Registrar Vacinas da Gestante
            </h3>

            <form onSubmit={props.handleSaveVacinas} className="space-y-3 text-xs">
              {[
                { key: 'influenza', label: 'INFLUENZA (Gripe)' },
                { key: 'vsr', label: 'VSR (Vírus Sincicial Respiratório)' },
                { key: 'dtpa', label: 'dTpa (Coqueluche / Tétano)' },
                { key: 'covid19', label: 'COVID-19' },
              ].map(v => {
                const currentVac = props.editVacinasData[v.key] || { realizada: false, data: '', lote: '' };
                return (
                  <div key={v.key} className="p-3 bg-gray-50 rounded-2xl border space-y-2">
                    <div className="flex justify-between items-center">
                      <strong className="text-xs text-[#2E482A] block uppercase font-bold">{v.label}</strong>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={currentVac.realizada || false} 
                          onChange={(e) => props.setEditVacinasData({
                            ...props.editVacinasData,
                            [v.key]: { ...currentVac, realizada: e.target.checked }
                          })}
                          className="rounded text-[#2E482A]"
                        />
                        <span>Vacina Aplicada</span>
                      </label>
                    </div>

                    {currentVac.realizada && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold block">Data de Aplicação</span>
                          <input 
                            type="date" 
                            value={currentVac.data || ''} 
                            onChange={(e) => props.setEditVacinasData({
                              ...props.editVacinasData,
                              [v.key]: { ...currentVac, data: e.target.value }
                            })} 
                            className="w-full p-1.5 border rounded-lg text-xs bg-white" 
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold block">Número do Lote</span>
                          <input 
                            type="text" 
                            placeholder="Ex: LOTE-882" 
                            value={currentVac.lote || ''} 
                            onChange={(e) => props.setEditVacinasData({
                              ...props.editVacinasData,
                              [v.key]: { ...currentVac, lote: e.target.value }
                            })} 
                            className="w-full p-1.5 border rounded-lg text-xs bg-white" 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* HEPATITE B */}
              <div className="p-3 bg-gray-50 rounded-2xl border space-y-2">
                <strong className="text-xs text-[#2E482A] block uppercase font-bold">HEPATITE B (3 Doses)</strong>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block">1ª Dose</span>
                    <input 
                      type="date" 
                      value={props.editVacinasData.hepatiteB?.d1 || ''} 
                      onChange={(e) => props.setEditVacinasData({
                        ...props.editVacinasData,
                        hepatiteB: { ...(props.editVacinasData.hepatiteB || {}), d1: e.target.value }
                      })} 
                      className="w-full p-1.5 border rounded-lg text-xs bg-white" 
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block">2ª Dose</span>
                    <input 
                      type="date" 
                      value={props.editVacinasData.hepatiteB?.d2 || ''} 
                      onChange={(e) => props.setEditVacinasData({
                        ...props.editVacinasData,
                        hepatiteB: { ...(props.editVacinasData.hepatiteB || {}), d2: e.target.value }
                      })} 
                      className="w-full p-1.5 border rounded-lg text-xs bg-white" 
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold block">3ª Dose</span>
                    <input 
                      type="date" 
                      value={props.editVacinasData.hepatiteB?.d3 || ''} 
                      onChange={(e) => props.setEditVacinasData({
                        ...props.editVacinasData,
                        hepatiteB: { ...(props.editVacinasData.hepatiteB || {}), d3: e.target.value }
                      })} 
                      className="w-full p-1.5 border rounded-lg text-xs bg-white" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => props.setShowEditVacinasModal(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-[#2E482A] text-white font-bold text-xs rounded-xl">Salvar Vacinas</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EXAMES LABORATORIAIS */}
      {props.showEditExamesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white p-6 rounded-3xl max-w-xl w-full max-h-[85vh] overflow-y-auto space-y-4">
            <h3 className="font-bold text-gray-900 text-base border-b pb-2">Preencher Tabela de Exames Laboratoriais</h3>
            
            <div className="space-y-3 text-xs">
              {props.LISTA_EXAMES_OFICIAIS.map(ex => {
                const currentVal = props.editExamesData[ex.id] || { d1: '', r1: '', d2: '', r2: '' };
                return (
                  <div key={ex.id} className="p-3 bg-gray-50 rounded-2xl border space-y-2">
                    <strong className="text-xs text-[#2E482A] block uppercase">{ex.label}</strong>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block mb-0.5">1º TRIMESTRE (Data / Resultado)</span>
                        <div className="grid grid-cols-2 gap-1">
                          <input 
                            type="date" 
                            value={currentVal.d1 || ''} 
                            onChange={(e) => props.setEditExamesData({
                              ...props.editExamesData,
                              [ex.id]: { ...currentVal, d1: e.target.value }
                            })} 
                            className="p-1.5 border rounded-lg text-xs bg-white cursor-pointer" 
                          />
                          <input 
                            type="text" 
                            placeholder={ex.placeholder} 
                            value={currentVal.r1 || ''} 
                            onChange={(e) => props.setEditExamesData({
                              ...props.editExamesData,
                              [ex.id]: { ...currentVal, r1: e.target.value }
                            })} 
                            className="p-1.5 border rounded-lg text-xs bg-white font-medium" 
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 font-bold block mb-0.5">3º TRIMESTRE (Data / Resultado)</span>
                        <div className="grid grid-cols-2 gap-1">
                          <input 
                            type="date" 
                            value={currentVal.d2 || ''} 
                            onChange={(e) => props.setEditExamesData({
                              ...props.editExamesData,
                              [ex.id]: { ...currentVal, d2: e.target.value }
                            })} 
                            className="p-1.5 border rounded-lg text-xs bg-white cursor-pointer" 
                          />
                          <input 
                            type="text" 
                            placeholder={ex.placeholder} 
                            value={currentVal.r2 || ''} 
                            onChange={(e) => props.setEditExamesData({
                              ...props.editExamesData,
                              [ex.id]: { ...currentVal, r2: e.target.value }
                            })} 
                            className="p-1.5 border rounded-lg text-xs bg-white font-medium" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => props.setShowEditExamesModal(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
              <button onClick={props.handleSaveTabelaExames} className="px-5 py-2 bg-[#2E482A] text-white font-bold text-xs rounded-xl">Salvar Tabela</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGENDAR CONSULTA */}
      {props.showAddAgendaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-3">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-[#2E482A]" />
              Agendar Próxima Consulta
            </h3>
            
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Data e Horário</label>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="date" 
                  value={props.newAgenda.data} 
                  onChange={(e) => props.setNewAgenda({ ...props.newAgenda, data: e.target.value })} 
                  className="w-full text-xs p-2.5 border rounded-xl bg-white" 
                />
                <input 
                  type="time" 
                  value={props.newAgenda.horario} 
                  onChange={(e) => props.setNewAgenda({ ...props.newAgenda, horario: e.target.value })} 
                  className="w-full text-xs p-2.5 border rounded-xl bg-white" 
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tipo de Consulta</label>
              <select 
                value={props.newAgenda.tipo} 
                onChange={(e) => props.setNewAgenda({ ...props.newAgenda, tipo: e.target.value })} 
                className="w-full text-xs p-2.5 border rounded-xl bg-white"
              >
                <option value="Consulta Pré-Natal de Rotina">Consulta Pré-Natal de Rotina</option>
                <option value="Retorno de Exames">Retorno de Exames</option>
                <option value="Ecografia Obstétrica / Morfológica">Ecografia Obstétrica / Morfológica</option>
                <option value="Consulta de Alto Risco">Consulta de Alto Risco</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Local</label>
              <input 
                type="text" 
                value={props.newAgenda.local} 
                onChange={(e) => props.setNewAgenda({ ...props.newAgenda, local: e.target.value })} 
                className="w-full text-xs p-2.5 border rounded-xl" 
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Orientações</label>
              <textarea 
                placeholder="Ex: Trazer carteirinha, exames de sangue..." 
                value={props.newAgenda.observacoes} 
                onChange={(e) => props.setNewAgenda({ ...props.newAgenda, observacoes: e.target.value })} 
                className="w-full text-xs p-2.5 border rounded-xl h-16" 
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => props.setShowAddAgendaModal(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
              <button onClick={props.handleAddAgenda} className="px-4 py-1.5 bg-[#2E482A] text-white font-bold text-xs rounded-xl">Salvar Agendamento</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UPLOAD EXAME & IA */}
      {props.showUploadExamModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-3">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#2E482A]" />
              Anexar Laudo / Ecografia com IA
            </h3>
            
            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Título do Exame</label>
              <input 
                type="text" 
                placeholder="Ex: Hemograma 1º Trimestre" 
                value={props.examName} 
                onChange={(e) => props.setExamName(e.target.value)} 
                className="w-full text-xs p-2.5 border rounded-xl" 
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Tipo de Exame</label>
              <select 
                value={props.examCategory} 
                onChange={(e) => props.setExamCategory(e.target.value)} 
                className="w-full text-xs p-2.5 border rounded-xl bg-white"
              >
                <option value="Ecografia">Ecografia / Ultrassom</option>
                <option value="Laboratorial">Exame Laboratorial / Sangue</option>
                <option value="Outro">Outro Documento</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Selecione o Arquivo</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => props.setSelectedFile(e.target.files?.[0] || null)} 
                className="w-full text-xs p-2 border bg-gray-50 rounded-xl" 
              />
            </div>

            {props.isUploading && (
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                <span>Gemini IA analisando foto do laudo...</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => props.setShowUploadExamModal(false)} className="px-3 py-1.5 text-xs text-gray-500" disabled={props.isUploading}>
                Cancelar
              </button>
              <button 
                onClick={props.handleFileUpload} 
                disabled={props.isUploading} 
                className="px-4 py-1.5 bg-[#2E482A] text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
              >
                {props.isUploading ? "Processando..." : "Analisar com IA & Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR CONSULTA */}
      {props.showAddConsultaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-3">
            <h3 className="font-bold text-gray-900 text-base">Registrar Nova Consulta</h3>
            <input type="date" value={props.newConsulta.data} onChange={(e) => props.setNewConsulta({ ...props.newConsulta, data: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="Semanas (IG)" value={props.newConsulta.igSem} onChange={(e) => props.setNewConsulta({ ...props.newConsulta, igSem: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
              <input type="text" placeholder="Peso (kg)" value={props.newConsulta.peso} onChange={(e) => props.setNewConsulta({ ...props.newConsulta, peso: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="P.A." value={props.newConsulta.pa} onChange={(e) => props.setNewConsulta({ ...props.newConsulta, pa: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
              <input type="text" placeholder="A.U." value={props.newConsulta.au} onChange={(e) => props.setNewConsulta({ ...props.newConsulta, au: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            </div>
            <input type="text" placeholder="BCF / Mov. Fetal" value={props.newConsulta.bcfMf} onChange={(e) => props.setNewConsulta({ ...props.newConsulta, bcfMf: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
            <textarea placeholder="Conduta / Recomendações" value={props.newConsulta.conduta} onChange={(e) => props.setNewConsulta({ ...props.newConsulta, conduta: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl h-20" />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => props.setShowAddConsultaModal(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
              <button onClick={props.handleAddConsulta} className="px-4 py-1.5 bg-[#2E482A] text-white font-bold text-xs rounded-xl">Salvar Registro</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CADASTRAR PACIENTE */}
      {props.showNewPatientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white p-6 rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto space-y-3">
            <h3 className="font-bold text-gray-900 text-base border-b pb-2">Cadastrar Gestante no Banco de Dados</h3>
            
            <form onSubmit={props.handleCreatePatient} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Nome Completo *" required value={props.newPatient.nome} onChange={(e) => props.setNewPatient({ ...props.newPatient, nome: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
                <input type="text" placeholder="CPF *" required value={props.newPatient.cpf} onChange={(e) => props.setNewPatient({ ...props.newPatient, cpf: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="WhatsApp / Telefone" value={props.newPatient.telefone || ''} onChange={(e) => props.setNewPatient({ ...props.newPatient, telefone: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
                <input type="text" placeholder="Idade (anos)" value={props.newPatient.idade} onChange={(e) => props.setNewPatient({ ...props.newPatient, idade: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Altura (ex: 1.65)" value={props.newPatient.altura} onChange={(e) => props.setNewPatient({ ...props.newPatient, altura: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
                <input type="text" placeholder="Peso Inicial (kg)" value={props.newPatient.pesoInicial} onChange={(e) => props.setNewPatient({ ...props.newPatient, pesoInicial: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Nome do Pai / Acompanhante" value={props.newPatient.pai} onChange={(e) => props.setNewPatient({ ...props.newPatient, pai: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
                <input type="text" placeholder="Nome do Bebê" value={props.newPatient.nomeBebe} onChange={(e) => props.setNewPatient({ ...props.newPatient, nomeBebe: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-0.5 uppercase">DUM</label>
                  <input type="date" value={props.newPatient.dum} onChange={(e) => props.setNewPatient({ ...props.newPatient, dum: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl bg-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-0.5 uppercase">Tipo Sanguíneo</label>
                  <select value={props.newPatient.tipoSanguineo} onChange={(e) => props.setNewPatient({ ...props.newPatient, tipoSanguineo: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl bg-white">
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(ts => (
                      <option key={ts} value={ts}>{ts}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200">
                <span className="font-bold text-emerald-900 block uppercase text-[10px] mb-1">Histórico Obstétrico (GPCA)</span>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <span className="font-bold text-[#2E482A] text-[10px] block">G</span>
                    <input type="number" min="1" value={props.newPatient.g} onChange={(e) => props.setNewPatient({ ...props.newPatient, g: e.target.value })} className="w-full p-1.5 border rounded-lg text-center font-bold text-xs bg-white" />
                  </div>
                  <div>
                    <span className="font-bold text-[#2E482A] text-[10px] block">P</span>
                    <input type="number" min="0" value={props.newPatient.p} onChange={(e) => props.setNewPatient({ ...props.newPatient, p: e.target.value })} className="w-full p-1.5 border rounded-lg text-center font-bold text-xs bg-white" />
                  </div>
                  <div>
                    <span className="font-bold text-[#2E482A] text-[10px] block">C</span>
                    <input type="number" min="0" value={props.newPatient.c} onChange={(e) => props.setNewPatient({ ...props.newPatient, c: e.target.value })} className="w-full p-1.5 border rounded-lg text-center font-bold text-xs bg-white" />
                  </div>
                  <div>
                    <span className="font-bold text-[#2E482A] text-[10px] block">A</span>
                    <input type="number" min="0" value={props.newPatient.a} onChange={(e) => props.setNewPatient({ ...props.newPatient, a: e.target.value })} className="w-full p-1.5 border rounded-lg text-center font-bold text-xs bg-white" />
                  </div>
                </div>
              </div>

              <textarea placeholder="Doenças Prévias / Alergias" value={props.newPatient.doencasPrevias} onChange={(e) => props.setNewPatient({ ...props.newPatient, doencasPrevias: e.target.value })} className="w-full text-xs p-2.5 border rounded-xl h-16" />

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => props.setShowNewPatientModal(false)} className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 bg-[#2E482A] text-white font-bold text-xs rounded-xl">Salvar Paciente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LOGIN DA PACIENTE (GOOGLE + CPF) */}
      {props.showPatientLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                👶 Área da Gestante
              </h3>
              <button 
                type="button"
                onClick={() => props.setShowPatientLoginModal(false)} 
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {props.loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium leading-relaxed">
                {props.loginError}
              </div>
            )}

            {/* BOTÃO PRINCIPAL: LOGIN COM CONTA GOOGLE */}
            <button
              onClick={props.handleGooglePatientLogin}
              type="button"
              className="w-full py-3 px-4 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 rounded-2xl font-bold text-xs flex items-center justify-center gap-3 shadow-xs transition-all cursor-pointer active:scale-98"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continuar com o Google</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ou com CPF</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* ENTRADA POR CPF */}
            <form onSubmit={props.handlePatientLogin} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-600 block mb-1 uppercase">Seu CPF</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={props.loginCpf}
                  onChange={(e) => props.setLoginCpf(e.target.value)}
                  className="w-full text-xs p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-[#2E482A]"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#2E482A] hover:bg-[#233820] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
              >
                Entrar com CPF
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LOGIN MÉDICA */}
      {props.showDoctorLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full space-y-3">
            <h3 className="font-bold text-gray-900">Acesso Médico Seguro</h3>
            {props.loginError && <p className="text-red-500 text-xs font-semibold">{props.loginError}</p>}
            <input 
              type="email" 
              placeholder="E-mail" 
              value={props.doctorEmail} 
              onChange={(e) => props.setDoctorEmail(e.target.value)} 
              className="w-full text-xs p-3 border rounded-xl" 
            />
            <input 
              type="password" 
              placeholder="Senha" 
              value={props.doctorPassword} 
              onChange={(e) => props.setDoctorPassword(e.target.value)} 
              className="w-full text-xs p-3 border rounded-xl" 
            />
            <button 
              onClick={props.handleDoctorLogin} 
              className="w-full py-2.5 bg-[#D4AF37] text-gray-900 rounded-xl text-xs font-bold shadow-md cursor-pointer"
            >
              Entrar no Painel
            </button>
            <button 
              type="button"
              onClick={() => props.setShowDoctorLoginModal(false)} 
              className="w-full text-xs text-gray-500 pt-1 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
            {/* MODAL LOGIN SUPER ADMIN / MASTER */}
      {props.showMasterLoginModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                ⚡ MaternaIA • Master Admin
              </h3>
              <button 
                type="button" 
                onClick={() => props.setShowMasterLoginModal(false)} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {props.loginError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs rounded-xl font-medium">
                {props.loginError}
              </div>
            )}

            <form onSubmit={props.handleMasterLogin} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                  E-mail Super Admin
                </label>
                <input 
                  type="email" 
                  required
                  placeholder="admin@maternaia.com.br" 
                  value={props.masterEmail} 
                  onChange={(e) => props.setMasterEmail(e.target.value)} 
                  className="w-full text-xs p-3 border border-slate-700 rounded-xl bg-slate-800 text-white focus:outline-amber-500" 
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                  Senha Master
                </label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••" 
                  value={props.masterPassword} 
                  onChange={(e) => props.setMasterPassword(e.target.value)} 
                  className="w-full text-xs p-3 border border-slate-700 rounded-xl bg-slate-800 text-white focus:outline-amber-500" 
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer mt-2"
              >
                Acessar Painel Franqueador
              </button>
            </form>
          </div>
        </div>
      )}

    </>
  );
};
