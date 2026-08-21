import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { Patient, ResultadoExame, UserRole } from '../types/prenatal';
import { initialPatientsList } from '../types/prenatal';
import { normalizarDiagnostico } from '../utils/diagnostico';
import { limparParaFirestore } from '../utils/firestoreSanitize';

// examesTabela mudou de "2 colunas fixas" (d1/r1/d2/r2) pra uma lista livre
// de resultados — essa função protege contra prontuários salvos antes dessa
// mudança, convertendo o formato antigo na leitura (sem precisar rodar
// nenhum script de migração nem tocar no que já está gravado no Firestore).
function normalizarExamesTabela(raw: any): Record<string, ResultadoExame[]> {
  const normalizado: Record<string, ResultadoExame[]> = {};
  for (const [key, val] of Object.entries(raw || {})) {
    if (Array.isArray(val)) {
      normalizado[key] = val as ResultadoExame[];
    } else if (val && typeof val === 'object') {
      const v = val as { d1?: string; r1?: string; d2?: string; r2?: string };
      const lista: ResultadoExame[] = [];
      if (v.d2 && v.r2) lista.push({ data: v.d2, resultado: v.r2 });
      if (v.d1 && v.r1) lista.push({ data: v.d1, resultado: v.r1 });
      normalizado[key] = lista;
    }
  }
  return normalizado;
}

// "agendada" nunca foi um status oficial (o modelo sempre foi solicitada/
// confirmada/encaixe_urgente/realizada/cancelada), mas pode existir em
// documentos antigos gravados antes dessa consistência. Trata como
// "confirmada" só na leitura — não escreve nada de volta no Firestore — pra
// não deixar consulta antiga invisível pra filtros que checam status
// explicitamente (ex: lembretes de amanhã).
function normalizarAgendaConsultas(raw: any[] | undefined): Patient['agendaConsultas'] {
  return (raw || []).map((ag) => (ag?.status === 'agendada' ? { ...ag, status: 'confirmada' } : ag));
}

// D2-CID-3C: diagnostico mudou de string solta ("Cefaleia") pra
// { codigo?, descricao } — mesmo padrão de normalizarExamesTabela acima,
// convertido só na leitura. Registros que nunca tiveram esse campo
// continuam sem ele (undefined), exibidos normalmente.
function normalizarConsultasEvolucao(raw: any[] | undefined): Patient['consultasEvolucao'] {
  return (raw || []).map((c) => ({ ...c, diagnostico: normalizarDiagnostico(c?.diagnostico) }));
}

function normalizarPaciente(raw: any): Patient {
  return {
    ...raw,
    examesTabela: normalizarExamesTabela(raw?.examesTabela),
    agendaConsultas: normalizarAgendaConsultas(raw?.agendaConsultas),
    consultasEvolucao: normalizarConsultasEvolucao(raw?.consultasEvolucao)
  } as Patient;
}

interface UsePatientsOptions {
  doctorId: string;
  doctorName?: string;
  userRole: UserRole | null;
  selectedPatientDoctorId: string | null;
  selectedPatientId: string;
}

// Nomes amigáveis dos campos do prontuário, pro log de auditoria — várias
// chaves internas (g/p/c/a, historicoFinanceiro/tipoAtendimentoPadrao)
// caem no mesmo rótulo porque, pra quem lê o histórico, são a mesma seção.
const CAMPOS_LABEL: Record<string, string> = {
  nome: 'Nome', cpf: 'CPF', telefone: 'Telefone', email: 'E-mail', senhaAcc: 'Senha de acesso',
  idade: 'Idade', pai: 'Pai/Acompanhante', nomeBebe: 'Nome do bebê', dum: 'DUM',
  g: 'Histórico obstétrico (GPCA)', p: 'Histórico obstétrico (GPCA)', c: 'Histórico obstétrico (GPCA)', a: 'Histórico obstétrico (GPCA)',
  pesoInicial: 'Peso inicial', altura: 'Altura', tipoSanguineo: 'Tipo sanguíneo', doencasPrevias: 'Doenças prévias',
  vacinas: 'Vacinas', examesTabela: 'Exames laboratoriais', consultasEvolucao: 'Evolução clínica',
  agendaConsultas: 'Agenda', examesEnviados: 'Central de exames', solicitacoes: 'Prescrições e solicitações de exames',
  tipoAtendimentoPadrao: 'Financeiro', convenioNome: 'Financeiro', numeroCarteirinhaConvenio: 'Financeiro',
  historicoFinanceiro: 'Financeiro'
};

// Compara o antes/depois e devolve os nomes das seções que mudaram, sem
// expor os valores em si (o log é "o que mudou", não "virou o quê").
function describeChanges(prev: Patient | undefined, next: Patient): string[] {
  if (!prev) return ['Cadastro criado'];
  const labels = new Set<string>();
  for (const key of Object.keys(CAMPOS_LABEL) as (keyof Patient)[]) {
    if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) {
      labels.add(CAMPOS_LABEL[key]);
    }
  }
  return labels.size > 0 ? Array.from(labels) : ['Cadastro atualizado'];
}

// Pacientes de cada médico ficam em "doctors/{doctorId}/patients/{patientId}" —
// uma subcoleção isolada por tenant, em vez de uma lista global compartilhada por
// todos os médicos (o que vazava dados entre clínicas diferentes).
export function usePatients({ doctorId, doctorName, userRole, selectedPatientDoctorId, selectedPatientId }: UsePatientsOptions) {
  const [patients, setPatients] = useState<Patient[]>(initialPatientsList);

  useEffect(() => {
    if (!doctorId || (userRole !== 'medica' && userRole !== 'secretaria')) return;
    try {
      const colRef = collection(db, 'doctors', doctorId, 'patients');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => setPatients(snapshot.docs.map((d) => normalizarPaciente(d.data()))),
        (err) => console.warn('Modo offline:', err)
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn('Modo offline:', err);
    }
  }, [doctorId, userRole]);

  // Sessão de paciente: assina só o próprio documento (não a subcoleção inteira).
  useEffect(() => {
    if (userRole !== 'paciente' || !selectedPatientDoctorId || !selectedPatientId) return;
    const ref = doc(db, 'doctors', selectedPatientDoctorId, 'patients', selectedPatientId);
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (snapshot.exists()) setPatients([normalizarPaciente(snapshot.data())]);
      },
      (err) => console.warn('Modo offline:', err)
    );
    return () => unsubscribe();
  }, [userRole, selectedPatientDoctorId, selectedPatientId]);

  // Mesma assinatura de sempre (recebe a lista inteira do médico atual), mas por
  // dentro só grava/apaga os pacientes que de fato mudaram, em documentos
  // individuais dentro de "doctors/{doctorId}/patients/{patientId}".
  const actorLabel =
    userRole === 'medica' ? (doctorName || 'Médica') :
    userRole === 'secretaria' ? (auth.currentUser?.email || 'Secretária') :
    userRole === 'paciente' ? 'Paciente (autoatendimento)' :
    userRole === 'master_admin' ? 'Super Admin' :
    'Sistema';

  const saveToFirestore = async (updatedList: Patient[]) => {
    const previous = patients;
    setPatients(updatedList);
    try {
      const prevMap = new Map(previous.map((p) => [p.id, p]));
      const nextIds = new Set(updatedList.map((p) => p.id));
      const changed = updatedList.filter((p) => prevMap.get(p.id) !== p);

      // HOTFIX: o Firestore lança (síncrono) se QUALQUER valor undefined
      // aparecer em qualquer profundidade do documento — inclusive dentro de
      // consultasEvolucao[i].diagnostico quando o atendimento é salvo sem CID
      // selecionado (o caso mais comum). Sem essa limpeza, esse throw
      // acontecia aqui dentro do .map(), antes de "logs"/"deletes" sequer
      // rodarem, e era engolido pelo catch abaixo — nada era escrito, mas a
      // tela já tinha atualizado de forma otimista (setPatients acima),
      // então só sumia no próximo reload.
      const writes = changed.map((p) => {
        const pDoctorId = p.doctorId || doctorId;
        const cpfDigits = (p.cpf || '').replace(/\D/g, '');
        const emailLower = (p.email || '').toLowerCase().trim();
        return setDoc(
          doc(db, 'doctors', pDoctorId, 'patients', p.id),
          limparParaFirestore({ ...p, doctorId: pDoctorId, cpfDigits, emailLower }),
          { merge: true }
        );
      });

      // Log de auditoria: quem mexeu no prontuário, quando e em qual seção —
      // não bloqueia o salvamento principal se falhar (não deixa a médica
      // sem conseguir editar só porque o log deu erro).
      const logs = changed.map((p) => {
        const pDoctorId = p.doctorId || doctorId;
        const campos = describeChanges(prevMap.get(p.id), p);
        return addDoc(collection(db, 'doctors', pDoctorId, 'patients', p.id, 'logs'), {
          quando: serverTimestamp(),
          quem: actorLabel,
          papel: userRole,
          campos
        }).catch((err) => console.warn('Erro ao registrar log de auditoria:', err));
      });

      const deletes = previous
        .filter((p) => !nextIds.has(p.id))
        .map((p) => deleteDoc(doc(db, 'doctors', p.doctorId || doctorId, 'patients', p.id)));

      await Promise.all([...writes, ...logs, ...deletes]);
    } catch (err) {
      console.error('Erro ao salvar no Firestore:', err);
    }
  };

  return { patients, setPatients, saveToFirestore };
}
