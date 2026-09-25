# Octo

Camada de engenharia **sobre o [superpowers](https://github.com/obra/superpowers)** para **Claude Code** e
**GitHub Copilot**. Padroniza como os agentes trabalham nos repositórios do time: contexto de IA primeiro,
skills por domínio e tecnologia, subagentes em paralelo, teste no navegador com Definition of Done,
sessões que continuam de onde pararam, guardrails e commit ou PR autônomos.

```bash
npx @luizguitm/octo init
```

Depois, no chat do agente: `/octo-help`.
**Manual completo (pt-BR): [docs/MANUAL.md](docs/MANUAL.md)**, também instalado em cada repositório como `.octo/MANUAL.md`.

## Em 30 segundos

```
/octo-start <pedido> → /octo-plan → /octo-run → /octo-test-web → /octo-done
   spec aprovada        ondas         subagentes     um print por      DoD + commit
                        paralelas     em paralelo    cenário           (+ PR, se autorizado)
```

| Camada | O que é |
|---|---|
| **superpowers** (intocado, `upstream/superpowers/`) | O fluxo base: brainstorming, planos, TDD, debugging, review |
| **Octo core** (`skills/core/`) | Complementa o superpowers: contexto de IA, descoberta de skills, ondas paralelas, teste web, DoD, sessões, finalização autônoma |
| **Catálogo** (`skills/<domínio>/<tecnologia>/` + [awesome-copilot](https://github.com/github/awesome-copilot)) | Skills e instructions carregadas sob demanda: `salesforce/apex`, `web/react`, `security/appsec`… |
| **Comandos** (`commands/`) | `/octo-start`, `/octo-plan`, `/octo-run`, `/octo-test-web`, `/octo-done`, `/octo-fix`, `/octo-review`, `/octo-status`, `/octo-context`, `/octo-prefs`, `/octo-help` |
| **Agentes** (`agents/`) | `octo-worker-fast/standard/deep`, `octo-explorer`, `octo-web-tester`, `octo-doc-writer`, com cabeçalho completo para cada host |
| **CLI** (`bin/octo.js`) | `init`, `sync`, `doctor`, `config upgrade`, `skills list/promote`, `prefs init/path`, `autonomy` |

O Octo nunca edita o superpowers nem o awesome-copilot: são cópias fixadas num commit
(`upstream/*.lock.json`). As políticas do time chegam ao agente pelo bloco gerado em `CLAUDE.md` e em
`.github/copilot-instructions.md`, e o `using-superpowers` dá prioridade às instruções do usuário.

## Desenvolvimento do framework

```bash
npm test                                                  # testes (node:test, sem dependências)
node bin/octo.js init --cwd <repo-de-teste>               # testar a CLI localmente
npm run upstream:update -- --source superpowers           # atualizar o superpowers (ou awesome-copilot, ou all)
```

- Criar skills: `skills/<domínio>/<tecnologia>/<skill>/SKILL.md` com `metadata.complements` (ver `octo-skill-domains`).
- Importar do awesome-copilot: `upstream/awesome-copilot.imports.json` + `npm run upstream:update -- --source awesome-copilot`.
- Publicar: suba a versão, faça o commit, crie a tag e dê push; depois `npx npm@latest publish` num terminal normal (2FA).

## Licenças

Octo: MIT. Inclui o superpowers (MIT, © Jesse Vincent) e itens do awesome-copilot (MIT, © GitHub), com as
licenças preservadas em `upstream/` e instaladas em `.octo/licenses/`.
