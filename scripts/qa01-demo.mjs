// QA-01A — Ambiente de Teste Cego (seed / reset / verify)
//
// Cria (e sabe desfazer) UM tenant fictício + UMA paciente fictícia, isolados
// num namespace fixo, pra permitir teste de usabilidade cego com pessoas
// externas ao projeto: elas recebem CPF + PIN + a URL raiz do app, entram
// como se fossem uma gestante de verdade, e não têm como descobrir que é um
// ambiente demo nem qual médica real está por trás do sistema.
//
// Investigação prévia (QA-01, sem código) confirmou os pontos que este script
// depende: login por CPF+PIN não olha slug/URL nenhum (só o campo cpfDigits,
// via collectionGroup('patients')); cpfDigits/emailLower não vêm de graça —
// quem os calcula hoje é o caminho de escrita da própria UI (usePatients.ts),
// então este script precisa gravá-los manualmente; e um tenant com
// status !== 'active' (ou trial vencido) trava a paciente no paywall antes
// de qualquer prontuário.
//
// Uso (precisa de uma service account do Firebase — mesmo esquema já usado
// por scripts/migrate-to-multitenant.mjs):
//   1. Firebase Console > Configurações do projeto > Contas de serviço >
//      Gerar nova chave privada
//   2. GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/chave.json node scripts/qa01-demo.mjs seed
//   3. GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/chave.json node scripts/qa01-demo.mjs verify
//   4. GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/chave.json node scripts/qa01-demo.mjs reset
//
// A checagem de login real dentro de "verify" (POST /api/patient-login) só
// roda se QA01_BASE_URL apontar pra uma URL onde o app esteja de fato
// publicado (produção ou preview da Vercel) — sem isso, esse item específico
// aparece como SKIPPED, não como falha, e o resto do verify continua normal:
//   QA01_BASE_URL=https://seu-deploy.vercel.app node scripts/qa01-demo.mjs verify
//
// Este script NUNCA aceita doctorId por argumento — o namespace demo é uma
// constante fixa (DEMO_DOCTOR_ID) e toda escrita/leitura/remoção é validada
// contra ela antes de rodar. Isso é proposital: existe pra que nenhum uso
// acidental deste script consiga tocar em dado de médica/paciente real.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ─── Namespace fixo (não é parâmetro — proposital, ver cabeçalho) ──────────
const DEMO_DOCTOR_ID = 'demo-ux-2026-08';
const DEMO_PATIENT_ID = 'paciente-01';
const DEMO_DOCTOR_PATH = `doctors/${DEMO_DOCTOR_ID}`;
const DEMO_PATIENT_PATH = `${DEMO_DOCTOR_PATH}/patients/${DEMO_PATIENT_ID}`;

// CPF/PIN fixos (idempotentes — rodar "seed" de novo não troca as credenciais
// que já foram entregues a quem está testando). O sistema hoje não valida
// CPF (nem dígito verificador, nem formato) — ver investigação QA-01 — então
// qualquer sequência de 11 dígitos funciona; a única exigência real é
// cpfDigits bater exatamente com cpf normalizado.
const DEMO_CPF = '38520617400';
const DEMO_PIN = '4821';

function assertDemoPath(path) {
  if (path !== DEMO_DOCTOR_PATH && !path.startsWith(`${DEMO_DOCTOR_PATH}/`)) {
    throw new Error(
      `Recusado: tentativa de operar fora do namespace demo (${DEMO_DOCTOR_ID}). Caminho pedido: ${path}`
    );
  }
  return path;
}

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

function docDemo(path) {
  return db.doc(assertDemoPath(path));
}

// ─── Datas relativas a "hoje" — a gestação sempre cai em ~28-32 semanas no
// momento em que "seed" é executado, não numa data fixa do passado. ────────
const MS_DIA = 24 * 60 * 60 * 1000;
function addDias(baseIso, dias) {
  const d = new Date(`${baseIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
function hojeIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeCpf(cpf) {
  return String(cpf || '').replace(/\D/g, '');
}

// ─── Construção dos dados fictícios ────────────────────────────────────────

function buildDemoDoctor() {
  return {
    id: DEMO_DOCTOR_ID,
    // Sem slug de propósito (QA-01, seção 13): a URL raiz sem slug já cai na
    // landing genérica — não existe rota pessoal nenhuma pra descobrir.
    nome: 'Dra. Marina Duarte',
    email: 'contato@clinicamaterna-demo.invalid',
    crm: '00000-XX',
    telefone: '(41) 90000-0000',
    clinicaNome: 'Clínica Materna',
    especialidade: 'Ginecologia e Obstetrícia',
    enderecoConsultorio: 'Curitiba - PR',
    // Cor própria, deliberadamente diferente do verde padrão do index.css e
    // de qualquer médica real cadastrada — sem logoUrl/instagram (nenhum dos
    // dois é necessário e omitir os dois evita qualquer superfície real).
    corPrimaria: '#2A5C6B',
    plano: 'individual_pro',
    status: 'active', // nunca 'trial' com trialEndsAt vencido — travaria a paciente no paywall
    trialEndsAt: '2099-12-31',
    totalPacientes: 1,
    dataCadastro: hojeIso(),
    valorMensalidade: 0
  };
}

function buildDemoPatient() {
  const hoje = hojeIso();
  // DUM calculada pra cair em 30 semanas exatas hoje (meio do intervalo
  // 28-32 pedido) — assim a idade gestacional está sempre certa,
  // independente de quando "seed" for rodado.
  const dum = addDias(hoje, -30 * 7);
  const dpp = addDias(dum, 280);

  const dataConsulta = (igSem) => addDias(dum, igSem * 7);

  const idConsulta1 = 'qa01-consulta-1'; // 8 sem — primeira consulta
  const idConsulta2 = 'qa01-consulta-2'; // 14 sem
  const idConsulta3 = 'qa01-consulta-3'; // 20 sem — morfológica solicitada
  const idConsulta4 = 'qa01-consulta-4'; // 24 sem — solicitação vinculada nasce daqui
  const idConsulta5 = 'qa01-consulta-5'; // 28 sem — mais recente, CID leve

  const consultasEvolucao = [
    {
      id: idConsulta1,
      data: dataConsulta(8),
      igSem: 8,
      peso: 62.4,
      pa: '110/70',
      au: 'NP',
      bcfMf: 'Visível USG',
      edema: 'Ausente',
      queixas: 'Náuseas matinais leves.',
      conduta: 'Início de ácido fólico. Solicitados exames de rotina do 1º trimestre.'
    },
    {
      id: idConsulta2,
      data: dataConsulta(14),
      igSem: 14,
      peso: 64.1,
      pa: '112/72',
      au: 'NP',
      bcfMf: '150 bpm / MF-',
      edema: 'Ausente',
      // Campo opcional (queixas) deliberadamente ausente nesta consulta.
      conduta: 'Retorno em 6 semanas com ecografia morfológica.'
    },
    {
      id: idConsulta3,
      data: dataConsulta(20),
      igSem: 20,
      peso: 66.0,
      pa: '108/68',
      au: '19 cm',
      bcfMf: '148 bpm / MF+',
      edema: 'Ausente',
      queixas: 'Sem queixas relevantes.',
      diagnostico: { codigo: 'Z34.0', descricao: 'Supervisão de gravidez normal, primeiro trimestre' },
      conduta: 'Ecografia morfológica do 2º trimestre solicitada.'
    },
    {
      id: idConsulta4,
      data: dataConsulta(24),
      igSem: 24,
      peso: 67.8,
      pa: '114/74',
      au: '23 cm',
      bcfMf: '152 bpm / MF+',
      edema: 'Leve (tornozelos, fim do dia)',
      queixas: 'Relata leve inchaço nos pés ao final do dia.',
      conduta: 'Orientada hidratação e repouso com pernas elevadas. Suplementação de ferro iniciada.'
    },
    {
      id: idConsulta5,
      data: dataConsulta(28),
      igSem: 28,
      peso: 69.5,
      pa: '110/70',
      au: '27 cm',
      bcfMf: '146 bpm / MF+',
      edema: 'Ausente',
      queixas: 'Sem queixas.',
      conduta: 'Solicitado TOTG e hemograma de controle do 3º trimestre. Retorno em 4 semanas.'
    }
  ];

  const agendaConsultas = [
    {
      id: 'qa01-agenda-1',
      data: dataConsulta(28),
      horario: '09:30',
      tipo: 'Consulta Pré-Natal de Rotina',
      local: 'Clínica Materna',
      status: 'realizada'
    },
    {
      id: 'qa01-agenda-2',
      // Futura, relativa a hoje — cai por volta da semana 32.
      data: addDias(hoje, 16),
      horario: '15:00',
      tipo: 'Consulta Pré-Natal de Rotina',
      local: 'Clínica Materna',
      observacoes: 'Trazer exames de sangue do 3º trimestre.',
      status: 'confirmada'
    }
  ];

  // 2-3 conjuntos por data — deliberadamente incompletos (nem todo exame da
  // lista oficial tem resultado).
  const examesTabela = {
    hbVg: [
      { data: dataConsulta(24), resultado: '11.4 g/dL / 35%' },
      { data: dataConsulta(8), resultado: '12.6 g/dL / 37%' }
    ],
    glicemiaTotg: [
      { data: dataConsulta(24), resultado: 'Jejum 78 / 1h 132 / 2h 108 mg/dL' },
      { data: dataConsulta(8), resultado: '80 mg/dL (jejum)' }
    ],
    tsh: [{ data: dataConsulta(8), resultado: '2.1 mIU/L' }],
    toxo: [{ data: dataConsulta(8), resultado: 'IgG+ IgM-' }],
    ferritina: [{ data: dataConsulta(24), resultado: '42 ng/mL' }],
    urinaUrocultura: [{ data: dataConsulta(24), resultado: 'Normal / Ausência de germes' }]
    // hiv, sifilis, hbsag, rubeola, cmv, vitD, vitB12, htlv, antiHcv, gbs,
    // plaquetas: sem resultado ainda — de propósito, pra exercitar exame
    // pendente na mesma tela.
  };

  // 1x1 PNG transparente — só pra exercitar de verdade o caminho de preview
  // de imagem (DocumentoExameCard) sem usar nenhum arquivo real.
  const pixelPngBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

  const examesEnviados = [
    {
      id: 'qa01-doc-1',
      nome: 'Ecografia Morfológica de 2º Trimestre',
      tipo: 'Ecografia',
      dataUpload: dataConsulta(20),
      fileData: pixelPngBase64
    },
    {
      id: 'qa01-doc-2',
      // Nome de arquivo bruto (sem título clínico) — exercita o fallback
      // "Ecografia" de pareceNomeDeArquivo, e fica sem fileData de propósito
      // (documento sem preview).
      nome: 'IMG_20260702_101533.jpg',
      tipo: 'Ecografia',
      dataUpload: dataConsulta(14)
    },
    {
      id: 'qa01-doc-3',
      nome: 'Doppler Obstétrico',
      tipo: 'Outro',
      dataUpload: dataConsulta(28),
      notaDra: 'Fluxo normal, sem alterações.'
    }
  ];

  const solicitacoes = [
    {
      // Vinculada a um atendimento (consultaEvolucaoId aponta pra uma
      // consulta que existe de verdade em consultasEvolucao acima).
      id: 'qa01-solicitacao-1',
      data: dataConsulta(24),
      prescricoes: [{ id: 'qa01-presc-1', medicamento: 'Sulfato Ferroso 40mg', posologia: '1 comprimido ao dia, em jejum' }],
      exames: [],
      consultaEvolucaoId: idConsulta4
    },
    {
      // Avulsa — sem consultaEvolucaoId, mesmo caminho de "+ Nova
      // Solicitação" na Central de Exames.
      id: 'qa01-solicitacao-2',
      data: dataConsulta(28),
      prescricoes: [],
      exames: [
        { id: 'qa01-exsol-1', nome: 'Hemograma Completo', tipo: 'Laboratorial' },
        { id: 'qa01-exsol-2', nome: 'Ecografia Obstétrica com Doppler', tipo: 'Ecografia' }
      ]
    }
  ];

  const vacinas = {
    influenza: { realizada: true, data: dataConsulta(10), lote: 'INF-2026-DEMO' },
    dtpa: { realizada: true, data: dataConsulta(21), lote: 'DTPA-2026-DEMO' },
    vsr: {}, // pendente (32 semanas ainda não chegou)
    covid19: {}, // pendente
    hepatiteB: { d1: dataConsulta(8), d2: dataConsulta(12), d3: '' } // 3ª dose pendente
  };

  const cpfDigits = normalizeCpf(DEMO_CPF);

  return {
    id: DEMO_PATIENT_ID,
    doctorId: DEMO_DOCTOR_ID,
    cpf: DEMO_CPF,
    cpfDigits, // calculado manualmente — ver nota no cabeçalho do arquivo
    senhaAcc: DEMO_PIN,
    nome: 'Camila Fernandes Rocha',
    idade: '27',
    pai: 'Rafael Andrade',
    nomeBebe: 'Sofia',
    dum,
    dpp,
    g: '1', p: '0', c: '0', a: '0',
    pesoInicial: '62.0',
    altura: '1.63',
    tipoSanguineo: 'O+',
    doencasPrevias: 'Nenhuma relatada',
    vacinas,
    examesTabela,
    consultasEvolucao,
    agendaConsultas,
    examesEnviados,
    solicitacoes
  };
}

// ─── Comandos ───────────────────────────────────────────────────────────────

async function seed() {
  const doctor = buildDemoDoctor();
  const patient = buildDemoPatient();

  await docDemo(DEMO_DOCTOR_PATH).set(doctor, { merge: false });
  await docDemo(DEMO_PATIENT_PATH).set(patient, { merge: false });

  const baseUrl = process.env.QA01_BASE_URL || '<URL raiz do deploy — sem slug>';

  console.log('\nQA-01A criada\n');
  console.log(`Tenant:      ${doctor.clinicaNome}`);
  console.log(`Paciente:    ${patient.nome}`);
  console.log(`CPF:         ${DEMO_CPF}`);
  console.log(`PIN:         ${DEMO_PIN}`);
  console.log(`URL:         ${baseUrl}`);
  console.log(`Doctor ID (uso interno):  ${DEMO_DOCTOR_ID}`);
  console.log(`Patient ID (uso interno): ${DEMO_PATIENT_ID}`);
  console.log(`\nExecute "verify" antes de entregar o acesso.\n`);
}

async function reset() {
  // Escopo da remoção é o próprio caminho fixo do namespace — não há query
  // nem coleção ampla envolvida, só os dois documentos que "seed" cria.
  const patientRef = docDemo(DEMO_PATIENT_PATH);
  const doctorRef = docDemo(DEMO_DOCTOR_PATH);

  const patientSnap = await patientRef.get();
  const doctorSnap = await doctorRef.get();
  const patientExisted = patientSnap.exists;
  const doctorExisted = doctorSnap.exists;

  if (patientExisted) await patientRef.delete();
  if (doctorExisted) await doctorRef.delete();

  console.log(
    patientExisted || doctorExisted
      ? `Removido: ${doctorExisted ? DEMO_DOCTOR_PATH : ''}${doctorExisted && patientExisted ? ' + ' : ''}${patientExisted ? DEMO_PATIENT_PATH : ''}`
      : 'Nada a remover — namespace demo já estava vazio (reset é idempotente).'
  );
  console.log('\nQA-01 RESET: PASS\n');
}

async function verify() {
  const falhas = [];
  const avisos = [];

  const doctorSnap = await docDemo(DEMO_DOCTOR_PATH).get();
  if (!doctorSnap.exists) {
    console.log('QA-01 VERIFY: FAIL — tenant demo não existe. Rode "seed" primeiro.');
    process.exitCode = 1;
    return;
  }
  const doctor = doctorSnap.data();

  if (doctor.status !== 'active') falhas.push(`tenant.status esperado 'active', encontrado '${doctor.status}'`);
  if (doctor.slug) falhas.push(`tenant não deveria ter slug (encontrado: '${doctor.slug}')`);
  if (!doctor.nome || doctor.nome.includes('Priscila')) falhas.push('tenant.nome ausente ou não-fictício');
  if (!doctor.crm || doctor.crm === '24734-PR') falhas.push('tenant.crm ausente ou igual ao CRM real conhecido');

  const patientSnap = await docDemo(DEMO_PATIENT_PATH).get();
  if (!patientSnap.exists) {
    console.log('QA-01 VERIFY: FAIL — paciente demo não existe. Rode "seed" primeiro.');
    process.exitCode = 1;
    return;
  }
  const patient = patientSnap.data();

  if (!patient.cpf) falhas.push('patient.cpf ausente');
  if (!patient.senhaAcc) falhas.push('patient.senhaAcc ausente');
  if (!patient.nome) falhas.push('patient.nome ausente');
  if (!patient.dum || !patient.dpp) falhas.push('patient.dum/dpp ausente');
  if (patient.cpfDigits !== normalizeCpf(patient.cpf)) {
    falhas.push(`patient.cpfDigits ('${patient.cpfDigits}') não bate com cpf normalizado ('${normalizeCpf(patient.cpf)}')`);
  }

  const consultas = patient.consultasEvolucao || [];
  if (consultas.length === 0) falhas.push('patient.consultasEvolucao vazio');
  const examesPreenchidos = Object.values(patient.examesTabela || {}).filter((l) => Array.isArray(l) && l.length > 0);
  if (examesPreenchidos.length === 0) falhas.push('patient.examesTabela sem nenhum resultado');
  if ((patient.solicitacoes || []).length === 0) falhas.push('patient.solicitacoes vazio');
  if ((patient.agendaConsultas || []).some((a) => a.status === 'confirmada') === false) {
    falhas.push('nenhuma agendaConsulta futura com status confirmada');
  }

  // Integridade: toda solicitação com consultaEvolucaoId precisa apontar
  // pra uma consulta que realmente existe.
  const idsConsultas = new Set(consultas.map((c) => c.id));
  for (const s of patient.solicitacoes || []) {
    if (s.consultaEvolucaoId && !idsConsultas.has(s.consultaEvolucaoId)) {
      falhas.push(`solicitacao '${s.id}' aponta pra consultaEvolucaoId '${s.consultaEvolucaoId}', que não existe`);
    }
  }

  // Login real — só roda se QA01_BASE_URL foi informado (depende de um
  // deploy alcançável; não é algo que este script possa adivinhar).
  const baseUrl = process.env.QA01_BASE_URL;
  if (!baseUrl) {
    avisos.push(
      'Checagem de login real (POST /api/patient-login) foi PULADA — defina QA01_BASE_URL=https://seu-deploy.vercel.app pra rodar esse passo.'
    );
  } else {
    try {
      const resp = await fetch(new URL('/api/patient-login', baseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: DEMO_CPF, senha: DEMO_PIN })
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.status !== 200 || !data.token) {
        falhas.push(`POST /api/patient-login retornou status ${resp.status} (esperado 200 + token)`);
      } else {
        // O token retornado é um Firebase custom token — verificar as claims
        // (role/doctorId/patientId) nele exigiria trocá-lo por um id token
        // (signInWithCustomToken, fluxo de cliente), que um script Admin puro
        // não faz. Em vez disso, confirmamos o que a própria resposta do
        // endpoint já expõe antes de emitir o token: doctorId/patientId
        // batem com o namespace demo — é a mesma informação que vira claim.
        if (data.doctorId !== DEMO_DOCTOR_ID) falhas.push(`login retornou doctorId '${data.doctorId}', esperado '${DEMO_DOCTOR_ID}'`);
        if (data.patientId !== DEMO_PATIENT_ID) falhas.push(`login retornou patientId '${data.patientId}', esperado '${DEMO_PATIENT_ID}'`);
      }
    } catch (err) {
      falhas.push(`Erro ao chamar /api/patient-login em ${baseUrl}: ${err.message}`);
    }
  }

  for (const a of avisos) console.log(`AVISO: ${a}`);

  if (falhas.length > 0) {
    console.log('\nQA-01 VERIFY: FAIL');
    for (const f of falhas) console.log(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log('\nQA-01 VERIFY: PASS');
  }
}

// ─── CLI ────────────────────────────────────────────────────────────────────

const [, , comando, ...resto] = process.argv;

if (resto.length > 0) {
  console.error(`Uso: node scripts/qa01-demo.mjs <seed|reset|verify>  (sem argumentos adicionais — o namespace demo é fixo no script)`);
  process.exit(1);
}

const comandos = { seed, reset, verify };
if (!comandos[comando]) {
  console.error('Uso: node scripts/qa01-demo.mjs <seed|reset|verify>');
  process.exit(1);
}

comandos[comando]().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
