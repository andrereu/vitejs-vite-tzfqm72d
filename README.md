# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Modelo de dados no Firestore (multi-tenant)

Os dados de cada médico/clínica ficam isolados em `doctors/{doctorId}`, com
subcoleções `patients` e `secretaries`. Antes, tudo vivia em dois documentos
únicos e globais (`prenatal/lista_pacientes` e `saas_config/medicos_cadastrados`),
o que misturava os dados de todos os médicos no mesmo lugar e esbarrava no
limite de 1MB por documento do Firestore.

### Publicando as regras e índices

```bash
npm install -g firebase-tools   # se ainda não tiver
firebase login
firebase deploy --only firestore:rules,firestore:indexes
```

Isso publica `firestore.rules` (quem pode ler/gravar o quê) e
`firestore.indexes.json` (necessário para a busca de paciente por CPF/e-mail
funcionar entre todos os médicos).

### Migrando dados de uma instalação já existente

Se o Firestore ainda tem dados no formato antigo, rode uma vez:

```bash
# baixe uma chave de conta de serviço em:
# Firebase Console > Configurações do projeto > Contas de serviço > Gerar nova chave privada
GOOGLE_APPLICATION_CREDENTIALS=/caminho/para/chave.json npm run migrate:multitenant
```

O script não apaga os documentos antigos — confira os dados no console do
Firebase e só depois apague manualmente `prenatal/lista_pacientes` e
`saas_config/medicos_cadastrados`.

Em uma instalação nova (Firestore vazio), basta logar uma vez como Super Admin
(e-mail cadastrado em `SUPER_ADMIN_EMAILS` no `src/App.tsx`, que precisa ficar
igual à lista em `firestore.rules`) — o próprio app cria o primeiro médico de
demonstração automaticamente.

### Limitação conhecida

O login da paciente (por CPF ou e-mail, na tela pública) ainda não usa
autenticação própria no Firebase — por isso a leitura das pacientes segue
aberta nas regras (`allow read: if true` em `doctors/{doctorId}/patients`),
igual ao comportamento atual em produção. Fechar isso por completo exige um
mecanismo de autenticação dedicado para a paciente (ex.: Cloud Function que
valida CPF/senha e emite um token), que é um próximo passo recomendado, mas
não está incluído nesta mudança.

## IA (Gemini) sem expor a chave no navegador

`api/analyze-exam.ts` (análise de exames) e `api/prenatal-chat.ts` (chat da
paciente) rodam no servidor da Vercel e usam a variável de ambiente
`GEMINI_API_KEY` (sem o prefixo `VITE_` — esse prefixo é o que faz o Vite
empacotar uma variável dentro do código enviado ao navegador; sem ele, a
chave nunca sai do servidor). Configure em **Settings → Environment
Variables** na Vercel, em Production e Preview, com o mesmo valor que estava
em `VITE_GEMINI_API_KEY` — essa variável antiga pode ser removida depois.

## Pagamento automático (Mercado Pago)

A tela de assinatura pendente (`SubscriptionPaywall`) tem um botão "Pagar com
Pix ou Cartão" que gera um link de pagamento pelo Mercado Pago
(`api/create-subscription-payment.ts`). Quando o pagamento é aprovado, o
Mercado Pago avisa `api/mercadopago-webhook.ts`, que confirma o pagamento
direto na API do Mercado Pago (nunca confia apenas no aviso recebido) e
libera a assinatura automaticamente no Firestore — sem conferência manual de
comprovante. A opção de PIX manual + comprovante por WhatsApp continua
disponível como alternativa.

### Variáveis de ambiente necessárias (Vercel → Environment Variables)

| Variável | Onde conseguir |
|---|---|
| `MERCADOPAGO_ACCESS_TOKEN` | [developers.mercadopago.com](https://developers.mercadopago.com) → Suas integrações → crie uma aplicação → "Credenciais de produção" (use as "credenciais de teste" primeiro, para testar sem cobrar de verdade) |
| `MERCADOPAGO_WEBHOOK_SECRET` | Na mesma aplicação, em "Webhooks" → chave secreta gerada ao configurar a notificação. Sem essa variável, o webhook ainda funciona, mas sem checar a assinatura do aviso — configure assim que possível |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Firebase Console → Configurações do projeto → Contas de serviço → Gerar nova chave privada (o mesmo JSON usado no script de migração). Copie os campos `project_id`, `client_email` e `private_key` do arquivo baixado — o `private_key` inclui `\n`, mantenha como está ao colar |

Depois de configurar `MERCADOPAGO_ACCESS_TOKEN`, cadastre a URL de notificação
no painel do Mercado Pago (Suas integrações → Webhooks):
`https://<seu-domínio>/api/mercadopago-webhook`, escutando o evento
`payments`.
