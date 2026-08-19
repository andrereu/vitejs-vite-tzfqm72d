# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O projeto

MaternaIA — SaaS de pré-natal para médicas obstetras e suas pacientes gestantes. React + Vite + TypeScript no front, Firebase (Firestore + Auth) como backend, funções serverless na Vercel (`api/*.ts`) para tudo que precisa de segredo (chave Gemini, Mercado Pago). Deploy contínuo na Vercel a partir do branch de trabalho.

O dono do projeto (usuário desta sessão) está aprendendo React durante o desenvolvimento — ver seção "Como trabalhar nesta sessão" abaixo.

## Comandos

- `npm run dev` — servidor de desenvolvimento (Vite)
- `npm run build` — build de produção (`tsc -b && vite build`)
- `npm run preview` — serve o build de produção localmente
- `npm run test` — roda a suíte Vitest uma vez
- `npm run test:watch` — Vitest em modo watch
- `npx tsc --noEmit -p tsconfig.app.json` — checagem de tipos sem gerar arquivos (rodar antes de commitar)
- `npm run migrate:multitenant` — migra uma instalação antiga (pré multi-tenant) para o modelo atual; precisa de `GOOGLE_APPLICATION_CREDENTIALS` apontando pra uma service account do Firebase
- `firebase deploy --only firestore:rules,firestore:indexes` — publica `firestore.rules` e `firestore.indexes.json` (precisa `firebase login` local; não funciona no sandbox do Claude Code, só na máquina do usuário)

Não há script de lint configurado.

## Arquitetura

### Modelo de dados multi-tenant no Firestore

Cada médica é um tenant isolado: `doctors/{doctorId}/patients/{patientId}`, `doctors/{doctorId}/secretaries/{id}`, `doctors/{doctorId}/payments/{id}`. Regras do Firestore (`firestore.rules`) fazem o isolamento entre tenants — todo acesso a dados de paciente passa por checagem de que o usuário pertence àquele `doctorId` (`isStaffOfDoctor`) ou é a própria paciente (`isPatientSelf` / `isPatientByEmailInDoc`, que usa `get()` no doc pai em vez de `resource.data` porque em `create` o `resource` ainda não existe).

Cada paciente tem uma subcoleção `logs` (append-only — `allow update, delete: if false`) com o histórico de auditoria de alterações no prontuário, escrito automaticamente por `saveToFirestore` em `src/hooks/usePatients.ts`.

Índices compostos usados pelo app (`patients.cpfDigits`, `patients.emailLower`, `secretaries.email`, todos como `COLLECTION_GROUP`) vivem em `firestore.indexes.json` e precisam existir no projeto Firebase real (criados manualmente no Console quando necessário).

### RBAC

Quatro papéis em `UserRole` (`src/types/prenatal.ts`): `medica`, `secretaria`, `paciente`, `master_admin`. Permissões centralizadas em `src/utils/rbac.ts` (`hasPermission`) — checar ali antes de esconder/mostrar algo na UI em vez de espalhar `if (role === ...)` pelos componentes.

Bloqueio por assinatura vencida é uma função só, `isDoctorBlocked` (`src/utils/subscription.ts`), usada tanto pra travar o painel inteiro da médica quanto pra mostrar à paciente uma tela de "fale com a clínica" no lugar do prontuário.

### Segredos só no servidor

Chave do Gemini (`GEMINI_API_KEY`, sem prefixo `VITE_`) e credenciais do Mercado Pago (`MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`) nunca chegam ao navegador — todo uso passa por funções serverless em `api/*.ts`, que autenticam no Firestore via `api/_lib/firebaseAdmin.ts` (usa `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`). O fluxo de pagamento automático do Mercado Pago depende do endpoint de webhook estar registrado corretamente na conta do Mercado Pago apontando pra função da Vercel.

### Estrutura do front

`App.tsx` monta as telas (landing, painel da médica, app da paciente, master admin) e concentra estado compartilhado; lógica de dados fica em hooks (`src/hooks/`, ex: `usePatients.ts` cuida de leitura/escrita no Firestore, normalização de dados legados e log de auditoria). Componentes de tela ficam em `src/components/`, tipos de domínio em `src/types/`.

### Linha do Tempo da Gestação

`src/utils/gestationTimeline.ts` define os marcos padrão do protocolo de pré-natal (`MARCOS_GESTACAO`) — cada um sabe checar sozinho, a partir dos dados já existentes no prontuário (exames, vacinas, consultas, uploads da Central de Exames), se já foi cumprido. Só usa marcação manual (`Patient.marcosTimeline`) quando não existe campo estruturado equivalente (ecografias, suplementação). Médicas também podem adicionar itens personalizados por paciente (`Patient.marcosPersonalizados`). `MarcoCategoria`/`MarcoPersonalizado` vivem em `src/types/prenatal.ts` (não no arquivo de lógica) porque `Patient` precisa referenciá-los sem criar import circular.

### Histórico de exames

`Patient.examesTabela` guarda `Record<string, ResultadoExame[]>` — lista de resultados (mais recente primeiro), não um número fixo de colunas. Ao ler dados do Firestore, `usePatients.ts` normaliza qualquer doc ainda no formato antigo (`{d1,r1,d2,r2}`) pro formato de lista atual — proteção necessária porque não houve script de migração de dados, só normalização em tempo de leitura.

## UI/UX & Frontend Guidelines (Design System)

### Persona & Papel

Atue como um Engenheiro de Design System e Especialista em UI/UX Mobile-First (Tailwind CSS + React).

### Princípios de Design Obrigatórios

1. **Estética App-First (Nativa):**
   - Use bordas arredondadas generosas: `rounded-2xl` para cards e `rounded-3xl` para modais/containers.
   - Sombras leves e suaves: use `shadow-sm` ou `shadow-md` sutis, evitando blocos pretos chapados.
   - Fundos limpos/neutros: base em `bg-stone-50` ou `bg-slate-50`, nunca fundos escuros pesados na tela inteira da paciente.
   - Espaçamento e Respiração: padding consistente (`p-4` a `p-6`), evitando acúmulo de botões no topo.

2. **Cores Dinâmicas (Whitelabel / Consultório):**
   - Nunca fixe cores estáticas (ex: `bg-green-700`) em componentes centrais.
   - Use sempre classes utilitárias baseadas em variáveis CSS ou estilos em linha controlados pelo tema do médico (`style={{ color: doctor.primaryColor }}` / `bg-[var(--primary)]`).
   - Garanta contraste acessível (texto escuro em fundos claros, texto branco apenas em botões preenchidos).

3. **Hierarquia de Ações:**
   - **Visão da Paciente:** Priorize métricas vitais em grids compactos (2x2 ou 4x1), card de boas-vindas com semana gestacional e próxima consulta.
   - **Ações Administrativas:** Esconda ações como "Imprimir", "Compartilhar", "Exportar dados" dentro do menu "Mais" ou na área médica.

4. **Regras de Código Tailwind:**
   - Priorize flexbox e CSS Grid para alinhamento (`grid grid-cols-2 gap-3` / `flex items-center justify-between`).
   - Use estados visuais claros: `hover:opacity-90 active:scale-[0.98] transition-all`.
   - Bottom Navigation Bar sempre fixa (`fixed bottom-0 left-0 right-0 z-40`), com suporte a safe-area de celulares.

Priorize o padrão visual de componentes limpos inspirados no Shadcn UI (Radix + Tailwind CSS).

## Como trabalhar nesta sessão

- O usuário é o dono do produto e está aprendendo React ao longo do projeto — explicações devem ser didáticas, em português, citando o arquivo principal e a ideia por trás da mudança (não só jargão técnico solto).
- Preferir soluções simples: já houve decisões explícitas de evitar integrações pesadas (API paga do WhatsApp Business, Graph API do Instagram) em favor de alternativas mais simples (links `wa.me/`, botão estático de perfil) quando o ganho não compensava a complexidade/custo de manutenção.
- Antes de commitar: rodar `npm run test`, checar tipos (`npx tsc --noEmit -p tsconfig.app.json`, comparando com o estado anterior pra não introduzir erro novo) e `npm run build`.
- Commits vão direto pro branch de trabalho atual (sem abrir PR, a menos que explicitamente pedido), com mensagens descritivas em português. Push com `git push -u origin <branch>`.
- O usuário testa cada mudança no preview ao vivo da Vercel antes de seguir pro próximo item — não assumir que uma feature está "pronta" só porque buildou local.
- Existe um artifact "Diário MaternaIA" com o resumo da última sessão de trabalho (funcionalidades entregues + pendências) — ative a skill `/fim-do-dia` no fim de cada sessão pra manter esse diário atualizado, e comece sessões novas checando se ele existe (`Artifact action:"list"`) pra recuperar contexto sem precisar reler o histórico inteiro do chat.
