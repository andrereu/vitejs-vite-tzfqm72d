---
name: fim-do-dia
description: Gera e publica o resumo de encerramento da sessão de trabalho no MaternaIA (SaaS de pré-natal para obstetras) — commits feitos, funcionalidades concluídas e pendências pro próximo dia, atualizando sempre o mesmo artifact "Diário MaternaIA". Use este skill SEMPRE que o usuário digitar /fim-do-dia, ou disser algo equivalente a "vamos encerrar por hoje", "resumo do dia", "fecha a sessão de hoje", "diário de hoje" sobre o trabalho feito nesta sessão no projeto MaternaIA. É específico deste projeto e desse fluxo de handoff diário — não é um gerador de changelog genérico.
---

# Fim do Dia — Diário MaternaIA

Ativado manualmente pelo usuário (dono do MaternaIA, aprendendo React) ao encerrar a sessão de trabalho do dia. Gere um resumo de handoff claro e publique/atualize o artifact "Diário MaternaIA", para que ele saiba exatamente onde parou e o que fazer na próxima sessão sem precisar rolar a conversa inteira.

## Por que isso importa

O trabalho acontece em rodadas longas, um item de cada vez, intercalando prompts do MD próprio do usuário com pedidos avulsos. No fim do dia ele quer um retrato claro do que foi entregue e do que ficou pendente. O artifact "Diário MaternaIA" só cumpre esse papel se for **sempre o mesmo link, atualizado** — não uma pilha de artifacts soltos de dias diferentes.

## Passo a passo

1. **Levante o que foi feito.** Rode `git log` no branch atual (confirme qual é, não assuma) filtrando pelos commits da sessão de hoje (`git log --since=midnight --oneline` como ponto de partida). Se a sessão começou antes da meia-noite ou o filtro não capturar nada relevante, amplie a janela com bom senso — o objetivo é pegar os commits desta sessão, não literalmente as últimas 24h do relógio.

2. **Resuma com clareza, não só liste.** Pra cada item/funcionalidade (agrupando commits relacionados — uma feature às vezes leva 2-3 commits, incluindo correção de bug achado no teste), escreva 1-3 frases em português simples e didático: o quê mudou, por quê, e em qual arquivo principal. O usuário está aprendendo React, então nomear o arquivo e a ideia por trás ajuda mais que jargão técnico solto.

3. **Liste as pendências reais.** Releia a conversa do dia (não só os commits) atrás de: prompts do MD do usuário pulados ou ainda não abordados, perguntas em aberto sem resposta final, testes que o usuário ainda precisa fazer manualmente, e qualquer "isso fica pra depois" mencionado ao longo da sessão. Ordene por prioridade quando fizer sentido; se não houver nada pendente de verdade, diga isso — não force uma lista.

4. **Publique atualizando o MESMO artifact.** Carregue a skill `artifact-design` antes de montar o HTML (é um relatório de handoff — tratamento polido e legível, não uma landing chamativa). Ache a URL do "Diário MaternaIA" já publicado chamando a ferramenta Artifact com `action: "list"`, procurando pelo título. Publique passando essa URL em `url` pra atualizar no lugar. Se não encontrar nenhum "Diário MaternaIA" (primeira vez rodando, ou foi apagado), publique um novo e avise o usuário que é a estreia dele.

5. **Avise o usuário.** Mensagem curta no chat confirmando que o resumo foi atualizado, com o link. Não repita o conteúdo inteiro do artifact no chat — o artifact é a fonte; o chat só confirma que está pronto.

## O que evitar

- Criar um artifact novo a cada vez — quebra a ideia de "diário único" que é o objetivo inteiro do skill.
- Despejar o `git log` bruto sem explicar o "porquê" de cada mudança.
- Inventar pendências que não foram realmente discutidas na sessão.
