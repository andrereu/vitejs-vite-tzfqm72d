# Skills de design instaladas no projeto

Instaladas em 2026-08-20 a partir da lista de 42 skills auditada em
`docs/design-skills-list-claude-code.md`. Conteúdo original de cada
`SKILL.md` preservado sem edição (só a origem documentada aqui).

| Skill (pasta) | Fonte | Licença |
|---|---|---|
| `frontend-design` | https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md | ver LICENSE.txt do repo anthropics/claude-code |
| `fixing-accessibility` | https://github.com/ibelick/ui-skills/blob/main/skills/fixing-accessibility/SKILL.md | ver repo ibelick/ui-skills |
| `ux-writing` | https://github.com/content-designer/ux-writing-skill/blob/main/SKILL.md (+ `references/`) | ver repo content-designer/ux-writing-skill |
| `design-auditor` | https://github.com/Ashutos1997/claude-design-auditor-skill/blob/main/SKILL.md (+ `references/`, exceto `figma-mcp.md` — não instalado por não usarmos Figma) | ver repo Ashutos1997/claude-design-auditor-skill |

`fim-do-dia` é a skill própria do projeto (não faz parte dessa lista).

## Por que essas 4 (e não as outras 38)

- **frontend-design**: direção visual pra telas novas, evita o "look genérico de IA".
- **fixing-accessibility**: correção de acessibilidade em formulários/dashboards — app de saúde, não é opcional.
- **ux-writing**: microcopy consistente (erros, formulários, estados vazios) pro paciente leigo entender.
- **design-auditor**: auditoria dos ~15+ componentes já existentes — visual, acessibilidade (score WCAG) e dark patterns (relevante pro paywall) num único relatório.

Trocamos `design-review` (Garry Tan / gstack) pelo `design-auditor` porque o
primeiro depende de arquivos de um framework externo inteiro (`~/.claude/skills/gstack/ETHOS.md`,
`.gstack/`, `TODOS.md` etc.) que não existem neste projeto — instalado sozinho
ficaria quebrado. O `design-auditor` funciona standalone.
