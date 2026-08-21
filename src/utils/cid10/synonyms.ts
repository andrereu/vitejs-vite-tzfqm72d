// D2-CID-3C — portado sem alteração de conteúdo do protótipo validado
// (scratchpad/cid10-poc/synonyms.mjs, D2-CID-3A até D2-CID-3B). Camada de
// sinônimos clínicos: não conhece o motor de busca, não conhece MaternaIA —
// só sabe transformar um termo coloquial digitado pela médica em um (ou
// mais) termo(s) de busca a testar contra a base.
//
// Cada entrada tem uma nota (`motivo`) citando a evidência real da base que
// justificou a expansão — nada aqui foi inventado de memória. Sinônimo
// nunca SUBSTITUI a busca original, só ACRESCENTA candidatos.
//
// D2-CID-3C: NÃO reativa "corrimento"→vaginite, "visão turva"→diagnóstico
// nem "sangramento"→hemorragia — removidos deliberadamente na D2-CID-3A.1
// por decisão explícita da Dra. (ver PENDENTES_SEM_SINONIMO). Nenhum
// sinônimo novo foi criado nesta fase.

import type { Cid10Sinonimo } from './types';

export const SINONIMOS: Cid10Sinonimo[] = [
  // ---- sintomas gerais ----
  {
    termos: ['dor de cabeca'],
    expandePara: 'cefaleia',
    categoria: 'sintomas gerais',
    confianca: 'alta',
    motivo: 'R51 "Cefaléia" é o código direto oficial; termo 100% coloquial sem outra leitura médica plausível.'
  },
  {
    termos: ['enjoo', 'enjôo'],
    expandePara: 'nausea',
    categoria: 'sintomas gerais',
    confianca: 'alta',
    motivo: 'R11 "Náusea e vômitos" — "enjoo" é o termo leigo padrão pra náusea, sem ambiguidade relevante.'
  },

  // ---- sintomas obstétricos ----
  {
    termos: ['perda de liquido', 'perda de liquido vaginal', 'bolsa rota', 'bolsa estourou'],
    expandePara: 'ruptura prematura de membranas',
    categoria: 'sintomas obstétricos',
    confianca: 'alta',
    motivo: 'Família O42 "Ruptura prematura de membranas" — termo técnico padrão em obstetrícia pra essas queixas leigas.'
  },
  {
    termos: ['sangramento vaginal', 'sangramento na gestacao', 'sangramento na gravidez'],
    expandePara: 'hemorragia gravidez',
    categoria: 'sintomas obstétricos',
    confianca: 'alta',
    motivo: 'Testado: "hemorragia gravidez" (as duas palavras, nível 3 do motor) acha O20.9 "Hemorragia do início da gravidez, não especificada" e O08.1 — família correta e obstétrica, sem trazer hemorragias de outros sistemas. "sangramento na gestação/gravidez" recebeu a mesma expansão por descrever exatamente o mesmo contexto clínico que "sangramento vaginal".'
  },
  {
    termos: ['hipertensao cronica'],
    expandePara: 'hipertensao pre-existente',
    categoria: 'termos comuns de gestação',
    confianca: 'alta',
    motivo: 'Testado: "hipertensao pre-existente" acha exatamente a família O10 (O10.0, O10.4, O10.9) — "hipertensão crônica" e "hipertensão pré-existente" são sinônimos clínicos padrão em obstetrícia. LIMITAÇÃO DOCUMENTADA: esse sinônimo só traz o lado obstétrico (O10.x) — a médica que quiser ver os dois lados juntos ainda pode digitar só "hipertensão".'
  },
  {
    termos: ['diabetes gestacional'],
    expandePara: 'diabetes gravidez',
    categoria: 'termos comuns de gestação',
    confianca: 'media-alta',
    motivo: 'O24.4 é "Diabetes mellitus que surge durante a gravidez" — a palavra oficial é "gravidez", não "gestacional"; sem essa expansão, "diabetes gestacional" só bate por causa da palavra "diabetes" sozinha (nível mais baixo).'
  },
  {
    termos: ['anemia na gravidez', 'anemia gravidez'],
    expandePara: 'anemia complicando gravidez',
    categoria: 'termos comuns de gestação',
    confianca: 'media-alta',
    motivo: 'O99.0 é "Anemia complicando a gravidez, o parto e o puerpério" — a palavra "complicando" não é intuitiva; a expansão ajuda a achar esse código específico além dos códigos genéricos de anemia (D50-D64).'
  },

  // ---- sintomas urinários ----
  {
    termos: ['infeccao urinaria', 'infeccao de urina', 'itu'],
    expandePara: 'infeccao trato urinario',
    categoria: 'sintomas urinários',
    confianca: 'alta',
    motivo: 'N39.0 "Infecção do trato urinário de localização não especificada" — termo oficial completo; "ITU" é a sigla universal em prontuário brasileiro. Importante: "itu" só passa por AQUI (comparação de termo inteiro), nunca cai numa busca por substring — evita bater dentro de "in situ".'
  },
  {
    termos: ['ardencia ao urinar', 'dor ao urinar'],
    expandePara: 'disuria',
    categoria: 'sintomas urinários',
    confianca: 'alta',
    motivo: 'R30.0 "Disúria" é exatamente a tradução médica de "dor/ardência ao urinar" — termo consolidado, sem ambiguidade.'
  },
  {
    termos: ['pressao baixa'],
    expandePara: 'hipotensao',
    categoria: 'sintomas urinários',
    confianca: 'alta',
    motivo: 'Família I95 "Hipotensão" já existe direto na base; a expansão só conecta o termo leigo ao termo técnico.'
  },
  {
    termos: ['pressao alta', 'pressao elevada'],
    expandePara: 'hipertensao',
    categoria: 'pressão/cardiovascular',
    confianca: 'alta',
    motivo: 'I10 "Hipertensão essencial" e família I1x — sem a expansão, "pressão alta" cai em ruído ("jato de alta pressão").'
  },

  // ---- sintomas gastrointestinais ----
  {
    termos: ['azia'],
    expandePara: 'refluxo gastroesofagico',
    categoria: 'sintomas gastrointestinais',
    confianca: 'alta',
    motivo: 'K21.0/K21.9 "Doença de refluxo gastroesofágico". Expandir só pra "refluxo" trazia Q62.7 (problema urológico congênito) primeiro — usar a frase completa isola só os 2 códigos certos.'
  },
  {
    termos: ['prisao de ventre'],
    expandePara: 'constipacao',
    categoria: 'sintomas gastrointestinais',
    confianca: 'alta',
    motivo: 'K59.0 "Constipação" — sinônimo coloquial consolidado, sem outra leitura médica.'
  },
  {
    termos: ['dor na barriga', 'dor abdominal'],
    expandePara: 'dores abdominais',
    categoria: 'sintomas gastrointestinais',
    confianca: 'alta',
    motivo: 'A base tem R10.4 "Outras dores abdominais e as não especificadas" — no PLURAL. "dor abdominal" (singular) não batia por pura diferença de número gramatical.'
  },

  // ---- pressão/cardiovascular ----
  {
    termos: ['falta de ar'],
    expandePara: 'dispneia',
    categoria: 'pressão/cardiovascular',
    confianca: 'alta',
    motivo: 'R06.0 "Dispnéia" — tradução médica direta e sem ambiguidade de "falta de ar".'
  },
  {
    termos: ['dor no peito'],
    expandePara: 'dor precordial',
    categoria: 'pressão/cardiovascular',
    confianca: 'alta',
    motivo: 'R07.2 "Dor precordial" é a leitura mais provável pra "dor no peito" num contexto clínico.'
  },
  {
    termos: ['palpitacao'],
    expandePara: 'palpitacoes',
    categoria: 'pressão/cardiovascular',
    confianca: 'alta',
    motivo: 'R00.2 é "Palpitações", só no plural — sinônimo pontual de número gramatical.'
  },
  {
    termos: ['desmaio'],
    expandePara: 'sincope',
    categoria: 'pressão/cardiovascular',
    confianca: 'alta',
    motivo: 'R55 "Síncope e colapso" — tradução médica padrão e direta de "desmaio".'
  }
];

// ---------------------------------------------------------------------------
// Termos investigados e DELIBERADAMENTE NÃO transformados em sinônimo —
// nenhum entra na busca por expansão. Preservado por transparência (mesmo
// critério do protótipo: "se houver dúvida clínica, não invente, marque
// como pendente").
export const PENDENTES_SEM_SINONIMO: Array<{ termos: string[]; motivo: string }> = [
  {
    termos: ['sangramento', 'perda de sangue'],
    motivo: 'LIMITAÇÃO CONFIRMADA EM TESTE: "hemorragia" sozinha, sem qualificador de local/contexto, bate em hemorragia de QUALQUER sistema do corpo — inclusive hemorragia intracraniana, sem relação com pré-natal. Isolado, "sangramento" fica sem sinônimo. "sangramento vaginal" ou "sangramento na gestação/gravidez" (ver SINONIMOS) resolvem isso com segurança.'
  },
  {
    termos: ['corrimento', 'corrimento vaginal'],
    motivo: 'PENDENTE DE VALIDAÇÃO CLÍNICA. Não existe código de "corrimento" em si — "vaginite" seria inferência sintoma→diagnóstico, não tradução de vocabulário.'
  },
  {
    termos: ['visao turva'],
    motivo: 'PENDENTE DE VALIDAÇÃO CLÍNICA. H53.1 é uma categoria ampla — inferência clínica, não tradução direta.'
  },
  {
    termos: ['contracao', 'contracao uterina', 'contracoes', 'barriga dura'],
    motivo: 'Ambíguo de propósito: pode ser falso trabalho de parto, trabalho de parto verdadeiro ou contração de Braxton-Hicks. Mapear sem contexto da consulta seria arriscado.'
  },
  {
    termos: ['vontade frequente de urinar'],
    motivo: 'A base tem "Poliúria" (aumento de volume) e "Disúria" (dor ao urinar) — nenhum dos dois é exatamente "aumento de frequência" (polaciúria).'
  },
  {
    termos: ['dor de estomago', 'dor no estomago'],
    motivo: 'Não encontrei "epigastralgia" nem "gastralgia" na base. Mapear pra "dor abdominal" genérico perderia a localização específica.'
  },
  {
    termos: ['calafrio', 'calafrios'],
    motivo: 'Zero ocorrências na base, mesmo como substring.'
  },
  {
    termos: ['escotoma', 'escotomas'],
    motivo: 'Zero ocorrências na base — não há código específico pra escotoma nesta versão da CID-10 brasileira.'
  },
  {
    termos: ['mal estar', 'mal-estar'],
    motivo: 'Genérico demais — não existe "mal-estar" como diagnóstico único; dezenas de códigos poderiam se aplicar dependendo do contexto.'
  }
];
