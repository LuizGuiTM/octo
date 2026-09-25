# Manual do Octo

O Octo é uma camada sobre o [superpowers](https://github.com/obra/superpowers) que padroniza como os
agentes de IA trabalham nos repositórios, no **Claude Code** e no **GitHub Copilot**.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Você: /octo-start → /octo-plan → /octo-run → /octo-test-web → /octo-done │
├──────────────────────────────────────────────────────────────────────┤
│ Octo core: contexto de IA, sessões, ondas paralelas, teste web, DoD,  │
│            commit autônomo, guardrails, modelos por nível            │
├──────────────────────────────────────────────────────────────────────┤
│ Catálogo por domínio → tecnologia (Octo + awesome-copilot)            │
├──────────────────────────────────────────────────────────────────────┤
│ superpowers (intocado): brainstorming, planos, TDD, debugging, review │
└──────────────────────────────────────────────────────────────────────┘
```

**Sumário:** [1. Primeiros passos](#1-primeiros-passos) · [2. Comandos](#2-comandos) ·
[3. Fluxo de trabalho](#3-fluxo-de-trabalho) · [4. Preferências](#4-preferências-do-usuário) ·
[5. Estrutura](#5-o-que-fica-onde) · [6. Catálogo](#6-catálogo-domínios-e-tecnologias) ·
[7. Configuração](#7-configuração-octoconfigjson) · [8. Sessões](#8-sessões-e-continuidade) ·
[9. Teste web e DoD](#9-teste-web-e-definition-of-done) · [10. Guardrails](#10-guardrails) ·
[11. Modelos e subagentes](#11-modelos-e-subagentes) · [12. MCPs](#12-mcps-customizados) ·
[13. Atualizações](#13-atualizações) · [14. Problemas comuns](#14-problemas-comuns) ·
[15. Criar skills](#15-criar-e-evoluir-skills)

---

## 1. Primeiros passos

Requisitos: Node.js 20+ e git. Para o teste web: Chrome com a extensão Claude in Chrome (Claude Code)
ou nada extra no Copilot (o Playwright MCP é baixado sozinho).

1. **Instale no repositório** (na raiz dele):
   ```bash
   npx @luizguitm/octo init
   ```
   Detecta os domínios (web, salesforce, python…), cria o `octo.config.json`, gera tudo e cria o seu
   arquivo de preferências em `~/.octo/preferences.md` (se ainda não existir).
2. **Revise o `octo.config.json`**, principalmente `models` (os modelos que a empresa permite).
   Mudou algo? `npx @luizguitm/octo sync`.
3. **Commite o que foi gerado** (`chore: install Octo`). Assim todo o time recebe a mesma configuração.
4. **Abra o repositório** no Claude Code (`claude --chrome` se for testar UI) ou no VS Code com Copilot.
5. **Prepare o contexto**: digite `/octo-context`. O agente preenche o `AGENTS.md` a partir do código.
6. **Suas preferências** (opcional): `/octo-prefs` faz uma entrevista curta e preenche o arquivo.
7. **Trabalhe**: `/octo-start <o que você quer>` e siga as próximas instruções do agente.

Confira a instalação a qualquer momento: `npx @luizguitm/octo doctor`.

## 2. Comandos

### 2.1 Comandos de chat (Claude Code e Copilot)
Digite no chat do agente. Funcionam igual nos dois hosts.

| Comando | O que faz | Resultado |
|---|---|---|
| `/octo-start <pedido>` | Inicia um trabalho: branch `feature/…-octo`, sessão, contexto, brainstorming | Spec aprovada em `docs/superpowers/specs/` |
| `/octo-plan` | Transforma a spec em plano com ondas paralelas e cenários de aceite | Plano em `docs/superpowers/plans/`, validado |
| `/octo-run` | Executa o plano onda a onda, com subagentes em paralelo | Código + testes, commit por onda |
| `/octo-test-web` | Roda os cenários web no navegador, um print por cenário | Prints na pasta do DoD |
| `/octo-done` | Verificação, Definition of Done, docs de IA e commit final | DoD `CONCLUÍDO` + commit |
| `/octo-fix <problema>` | Debugging sistemático e correção com teste de regressão | Commit `fix(...)` |
| `/octo-review [base]` | Revisão do diff da branch com revisores em paralelo | Achados por severidade |
| `/octo-status` | Onde o trabalho está e qual o próximo passo | Resumo em até 8 linhas |
| `/octo-context` | Cria ou atualiza `AGENTS.md` e `docs/ai/` | Docs de IA atualizados |
| `/octo-prefs` | Entrevista para preencher suas preferências | `~/.octo/preferences.md` |
| `/octo-help` | Lista os comandos e explica o fluxo | – |

Você também pode pedir em linguagem natural ("vamos implementar X"): as skills são carregadas
automaticamente. Os comandos só deixam o fluxo explícito.

### 2.2 Comandos da CLI (terminal)
Use `npx @luizguitm/octo <comando>` (ou `octo <comando>` se instalou com `npm i -g @luizguitm/octo`).

| Comando | O que faz |
|---|---|
| `init [--targets claude-code,copilot] [--domains web,salesforce] [--force]` | Cria a config, gera tudo e as preferências globais |
| `sync` | Regenera tudo a partir do `octo.config.json` (rode após mudar a config ou atualizar o Octo) |
| `doctor` | Valida a config e a instalação |
| `config upgrade` | Acrescenta opções novas (de versões novas do Octo) com valores padrão |
| `skills list [--all]` | Lista superpowers, skills do Octo, comandos e o catálogo por domínio/tecnologia |
| `skills promote <nome>` | Torna uma skill do catálogo sempre visível (nativa) |
| `prefs init [--local]` | Cria o arquivo de preferências (global ou só deste repositório) |
| `prefs path` | Mostra onde estão seus arquivos de preferências |
| `autonomy [supervised\|balanced\|full]` | Mostra ou troca o nível de autonomia (aprovações, commit, push, PR) |
| `--cwd <pasta>` | Roda qualquer comando em outro repositório |

Scripts instalados no repositório (o agente usa; você também pode):

| Script | Uso |
|---|---|
| `node .octo/bin/octo-session.mjs status\|new "<tópico>"\|close <arquivo>\|prefs` | Sessões e preferências |
| `node .claude/skills/octo-parallel-waves/scripts/check-waves.mjs <plano>` | Valida as ondas do plano |
| `node .claude/skills/octo-definition-of-done/scripts/check-dod.mjs <DoD.md> --plan <plano>` | Confere se as evidências sustentam o status |
| `node .claude/skills/octo-autonomous-finish/scripts/pre-commit-check.mjs` | Checagens antes do commit (branch, segredos, arquivos soltos) |
| `node .claude/skills/octo-web-testing/scripts/wait-for-url.mjs <url>` | Espera o app subir |

## 3. Fluxo de trabalho

Exemplo: "adicionar filtro por status na lista de tarefas".

| Fase | Você | O agente | Artefato |
|---|---|---|---|
| Contexto | (uma vez por repo) `/octo-context` | Lê o código e preenche o `AGENTS.md` | `AGENTS.md` |
| Início | `/octo-start filtro por status` | Cria a branch `feature/filtro-status-octo` e a sessão; faz perguntas só se houver dúvida real | `.octo/sessions/…md` |
| Brainstorm | Aprova a spec | Explora o código em paralelo, propõe o desenho | `docs/superpowers/specs/…-design.md` |
| Plano | (opcional) revisa | Formato do superpowers (`### Task N`) + uma linha `**Wave:** · **Depends on:** · **Tier:**` por tarefa; tarefas da mesma onda mexem em arquivos diferentes; define os cenários S1, S2…; validado pelo `check-waves` | `docs/superpowers/plans/….md` |
| Execução | `/octo-run` | Dispara um subagente por tarefa da onda, **em paralelo**, com TDD; revisa; roda a suíte; commita a onda | commits `feat(...) [plan T1-T2]` |
| Teste web | `/octo-test-web` | Abre o app no navegador, executa cada cenário, salva um print por cenário | `docs/superpowers/dod/…/screenshots/` |
| Fechamento | `/octo-done` | Verifica tudo, monta o DoD em português, atualiza os docs de IA, commita | `DoD.md` `CONCLUÍDO` + commit |

**Quando o agente pergunta:** só nos casos da política (`autonomy.askWhen`), por exemplo: requisito ambíguo
que muda o comportamento, duas soluções com impactos diferentes, algo destrutivo ou externo (push, deploy),
segredos, ou quando a verificação falha duas vezes. Fora isso, ele decide e registra a decisão na sessão.

**Pausou no meio?** Abra uma nova sessão e digite `/octo-status`: o agente retoma do "Próximo passo"
registrado. No Claude Code isso acontece sozinho no início da sessão.

## 4. Preferências do usuário

Um documento pessoal curto diz aos agentes como **você** quer trabalhar, em três pontos. Ele já vem
**preenchido com o padrão do time** (tirado do `octo.config.json`), então funciona sem você mexer:

```markdown
## Modelos (só os permitidos pelo time)
- Claude Code: deep = opus · standard = sonnet · fast = haiku
- Copilot: deep = Claude Opus 4.5 → GPT-5.2 · standard = Claude Sonnet 4.5 · fast = Claude Haiku 4.5
- Nível deep: só para desenho, revisão final e debugging difícil

## Comunicação
- Idioma: pt-BR
- Respostas: curtas e diretas
- Atualizações em tarefas longas: a cada fase

## Autonomia
- Nível: balanced (supervised | balanced | full; o time define o máximo)
- Sempre perguntar antes de: adicionar dependências
```

| Arquivo | Escopo | Vai para o git? |
|---|---|---|
| `~/.octo/preferences.md` (Windows: `%USERPROFILE%\.octo\preferences.md`) | Todos os seus repositórios | Não (fica na sua máquina) |
| `.octo/preferences.local.md` | Só este repositório; tem prioridade | Não (ignorado pelo git) |

- O `init` cria o global já preenchido; `npx @luizguitm/octo prefs init --local` cria o do repositório.
- Ajustar: edite o arquivo, ou use `/octo-prefs` (três perguntas, uma por seção).
- Conferir o que o agente vai ler: `node .octo/bin/octo-session.mjs prefs`. Linhas que você esvaziar são ignoradas.
- **Regra:** as políticas do time e os guardrails sempre prevalecem. Um nível de autonomia acima do que o time
  permite, ou um modelo fora da lista permitida, é ignorado.

## 5. O que fica onde

| Caminho no repositório | O que é | Editar? |
|---|---|---|
| `octo.config.json` | Configuração do time | **Sim** |
| `AGENTS.md`, `docs/ai/` | Memória do projeto para IA | **Sim** (o agente mantém) |
| `CLAUDE.md`, `.github/copilot-instructions.md` | Seu conteúdo + um bloco `octo:begin/end` gerado | Só fora do bloco |
| `.claude/skills/` | superpowers + skills do Octo + comandos `/octo-*` | Não (gerado) |
| `.claude/agents/`, `.github/agents/` | Subagentes `octo-*` para cada host | Não (gerado) |
| `.octo/catalog/<domínio>/<tecnologia>/` | Skills e instructions sob demanda + `INDEX.md` | Não (gerado) |
| `.octo/sessions/` | Estado de cada tarefa | O agente mantém; local |
| `.octo/MANUAL.md` | Este manual | Não |
| `docs/superpowers/specs`, `plans`, `dod` | Specs, planos e Definition of Done | O agente cria; revise |
| `.mcp.json`, `.vscode/mcp.json`, `.claude/settings.json`, `.vscode/settings.json` | Seus arquivos + entradas do Octo | Sim; o Octo só mexe nas entradas dele |

## 6. Catálogo: domínios e tecnologias

As skills de domínio **não** ficam sempre carregadas: o agente consulta o `.octo/catalog/INDEX.md` a cada fase
e lê só o que se aplica. São dois tipos:
- **Skills**: fluxos e checklists, ligados às skills do superpowers (ex.: ao planejar, `web/react/react19-source-patterns`).
- **Instructions**: padrões de código por tecnologia, ligados aos arquivos editados pelo glob `applyTo`
  (ex.: editar `*.cls` → `salesforce/apex/apex.instructions.md`).

| Domínio | Tecnologias |
|---|---|
| `engineering` (padrão) | docs, git, quality, testing |
| `architecture` (padrão) | adr, api, database |
| `security` (padrão) | appsec, secrets, threat-modeling |
| `web` | react, jest, node, nextjs, playwright, accessibility, ui-design |
| `salesforce` | apex, lwc, flow, agentforce, sf-cli |
| `python` | python, fastapi, pytest, playwright |

Lista atual completa: `npx @luizguitm/octo skills list --all`. Parte do catálogo vem do
[awesome-copilot](https://github.com/github/awesome-copilot) (MIT), copiado sem alterações.

- **Ativar domínios:** `"domains": [...]` no `octo.config.json` (o `init` detecta pelo projeto).
- **Skill que você usa sempre:** `npx @luizguitm/octo skills promote <nome>` a deixa sempre visível.
- **Instructions nativas no Copilot:** `"imports": { "nativeInstructions": ["apex.instructions.md"] }` as
  instala em `.github/instructions/`, onde o Copilot aplica sozinho pelo glob. Cuidado com as grandes que
  valem para `**` (a11y, OWASP): entram em toda requisição.
- **Faltou uma skill?** O agente anota em `.octo/skill-requests.md`. Esse arquivo é o backlog do time.

## 7. Configuração (`octo.config.json`)

| Chave | Para quê | Padrão |
|---|---|---|
| `targets` | Hosts gerados | `["claude-code", "copilot"]` |
| `language.responses` / `artifacts` / `documents` | Idioma das respostas / specs e código / DoD | `pt-BR` / `en` / `pt-BR` |
| `domains` | Catálogos instalados | detectado |
| `upstream.exclude` | Skills do superpowers a não instalar | `[]` |
| `models.<host>.allowed` / `tiers` | Modelos permitidos e o de cada nível (`deep`, `standard`, `fast`) | ver arquivo |
| `parallelism.maxSubagents` | Máximo de subagentes ao mesmo tempo | `8` |
| `autonomy` | `level`, `approvals.spec/plan`, `commit`, `push`, `pullRequest`, `draftPullRequest`, `protectedBranches`, `branchPattern` (padrão `{type}/{topic}-octo`), `askWhen`. Mais fácil: `octo autonomy <nível>` | nível `balanced` |
| `webTesting` | `enabled`, `baseUrl`, `startCommand`, `tools` por host | Chrome no Claude, Playwright no Copilot |
| `dod` | `dir`, `extraCriteria` (critérios extras do time) | `docs/superpowers/dod` |
| `sessions.commit` | Sessões vão para o git? | `false` |
| `guardrails` | Comandos bloqueados/com confirmação/liberados, arquivos protegidos, `maxFixRounds` | ver arquivo |
| `mcp` | `enable` (registro do Octo) e `servers` (MCPs do repositório) | vazio |
| `imports.nativeInstructions` | Instructions do awesome-copilot nativas no Copilot | `[]` |
| `skills.promoted` | Skills do catálogo sempre visíveis | `[]` |

O editor completa e valida as chaves (schema em `.octo/octo.config.schema.json`). Depois de editar: `sync`.

## 8. Sessões e continuidade

Cada tarefa tem um arquivo em `.octo/sessions/` com fase, spec, plano, decisões, dúvidas e **um** próximo
passo concreto. O agente atualiza a cada marco (spec aprovada, onda concluída, decisão, bloqueio).

- Claude Code: um hook injeta o estado no início da sessão, no `resume` e depois de compactar o contexto.
- Copilot: as instruções mandam rodar `node .octo/bin/octo-session.mjs status` no início.
- Uma sessão ativa por branch. Tarefas diferentes → branches diferentes.
- Por padrão ficam só na sua máquina (`sessions.commit: false`). Com `true`, acompanham a branch (útil
  para passar o trabalho a outra pessoa).

## 9. Teste web e Definition of Done

1. O plano lista os **cenários de aceite** (S1, S2…), cada um ligado a um critério da spec.
2. `/octo-test-web` executa os cenários `web` no navegador real e salva **um print por cenário** quando o
   resultado esperado está na tela:
   - Claude Code: extensão **Claude in Chrome** (inicie com `claude --chrome` ou `/chrome`).
   - Copilot: **Playwright MCP** (configurado em `.vscode/mcp.json`).
3. `/octo-done` monta `docs/superpowers/dod/<data>-<tópico>/DoD.md` **em português**: status, tabela de
   cenários com resultado e evidência, prints embutidos, checklist do time, histórico de falhas e pendências.
4. O `check-dod.mjs` confere se as evidências sustentam o status. Sem DoD `CONCLUÍDO`, não há commit final.

Critérios extras do seu time: `"dod": { "extraCriteria": ["Aprovado pelo PO", "…"] }`.

## 10. Guardrails

| Regra | Claude Code | Copilot |
|---|---|---|
| Comandos bloqueados (`git push --force`, `reset --hard`…) | **Bloqueio real** (`permissions.deny`) | Pede confirmação + regra nas instruções |
| Comandos com confirmação (`git push`, `rm -rf`, deploy…) | Pede confirmação (`permissions.ask`) | Pede confirmação (`autoApprove: false`) |
| Comandos liberados (`git status`…) | Sem confirmação | Sem confirmação |
| Arquivos protegidos (`.env`, chaves…) | Leitura e edição bloqueadas | Regra nas instruções |
| Rodadas de correção | Limite `maxFixRounds`, depois pergunta | Idem |

Commit nunca vai direto para `main`/`master`/`develop`; push e PR só com a política ligada ou com a sua
confirmação. O `pre-commit-check.mjs` bloqueia segredos, arquivos protegidos e prints fora do lugar.

### Autonomia e pull requests

| Nível (`octo autonomy <nível>`) | Aprova a spec? | Revisa o plano? | Commit | Push | Pull request | Pergunta quando |
|---|---|---|---|---|---|---|
| `supervised` | espera você | espera você | não (você commita) | não | não | qualquer ambiguidade ou ação externa |
| `balanced` (padrão) | espera você | não | sim, na branch `feature/…-octo` | pergunta | pergunta | ambiguidade que muda o comportamento, ação externa, destrutiva, segredos |
| `full` | não (auto-revisa e registra) | não | sim | **sim** | **sim, como rascunho** | só o essencial: destrutivo, segredos/custos, verificação falhando 2× |

**Para o agente ir sozinho do pedido até o PR:**
1. `npx @luizguitm/octo autonomy full` (ajusta a política **e** os guardrails juntos). O push e o PR passam a
   ser feitos pelo script do Octo (`open-pr.mjs`), que fica liberado sem confirmação. Esse script só faz
   `git push -u origin <branch atual>`: nunca força, nunca a partir de `main`/`develop`. O `git push` digitado
   à mão continua pedindo confirmação, e o `push --force` continua bloqueado.
2. Autentique a CLI do seu provedor, detectado pelo remoto `origin`:
   - GitHub: instale o [`gh`](https://cli.github.com) e rode `gh auth login`.
   - Azure DevOps: instale o [`az`](https://aka.ms/azure-cli), rode `az extension add --name azure-devops` e
     `az login` (ou defina `AZURE_DEVOPS_EXT_PAT` com um PAT que tenha permissão de *Code: Read & Write*).
3. No Claude Code, permita que o agente trabalhe sem pedir confirmação a cada edição (modo *auto* ou
   *accept edits*); no Copilot, as regras de terminal geradas já liberam o que a política permite.
4. `/octo-start <pedido>`. O agente termina com o link do PR em rascunho. Se a CLI faltar ou não estiver
   autenticada, ele não trava: deixa a branch commitada e mostra os comandos exatos para você rodar.

Mesmo no `full`, o PR é aberto como **rascunho** (`draftPullRequest: true`): alguém do time revisa e marca como
pronto. Merge em branch protegida nunca é automático.

## 11. Modelos e subagentes

O superpowers pede "modelo barato", "padrão" ou "mais capaz". O Octo mapeia para níveis com modelos
**permitidos pela empresa**:

| Nível | Agente | Uso | Claude Code (padrão) |
|---|---|---|---|
| `fast` | `octo-worker-fast`, `octo-explorer` | tarefas mecânicas, exploração | `haiku`, esforço baixo |
| `standard` | `octo-worker-standard`, `octo-web-tester`, `octo-doc-writer` | a maioria das tarefas | `sonnet`, esforço médio |
| `deep` | `octo-worker-deep` | desenho, revisão final, debugging difícil | `opus`, esforço alto |

No Copilot, cada nível pode ter uma lista de modelos em ordem de preferência. Um modelo fora de `allowed`
faz o `sync` falhar.

## 12. MCPs customizados

- **Do time todo:** o framework tem um registro em `mcp/<nome>/server.json` (com uma skill opcional de uso).
  Ative por repositório: `"mcp": { "enable": ["<nome>"] }`.
- **Só deste repositório:**
  ```json
  "mcp": { "servers": { "grafo": {
    "description": "Grafo de conhecimento do código",
    "usage": "Consulte antes de explorar código desconhecido",
    "command": "uvx", "args": ["meu-mcp", "--root", "{workspace}"],
    "env": { "TOKEN": "{env:MEU_TOKEN}" }
  } } }
  ```
- Segredos **sempre** via `{env:NOME}` (a config rejeita valores literais). `{workspace}` é a raiz do repo.
- O Octo gera `.mcp.json` (Claude Code) e `.vscode/mcp.json` (Copilot) sem apagar os seus servidores.

## 13. Atualizações

| O quê | Como |
|---|---|
| Octo em um repositório | `npx @luizguitm/octo@latest sync` e commite as mudanças |
| Opções novas da config | `npx @luizguitm/octo config upgrade` |
| superpowers / awesome-copilot (mantenedores do framework) | `npm run upstream:update -- --source superpowers\|awesome-copilot` e `npm test` |

## 14. Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| O agente não segue o fluxo | Confira `npx @luizguitm/octo doctor`; no Claude Code, reinicie a sessão para carregar o `CLAUDE.md` |
| `/octo-*` não aparece no Copilot | Atualize o VS Code; as skills vêm de `.claude/skills` (Agent Skills). Recarregue a janela |
| Agentes aparecem duplicados no VS Code | O Copilot também lê `.claude/agents`. Se usar só o Copilot: `"targets": ["copilot"]` |
| Teste web não abre o navegador | Claude Code: inicie com `claude --chrome`. Copilot: inicie o servidor `playwright` no `.vscode/mcp.json` |
| Prints fora da pasta do DoD | O Playwright salva nomes explícitos relativos à raiz: use o caminho completo do DoD. O `pre-commit-check` avisa |
| Scripts do superpowers quebram no Windows | São bash: o agente os roda com `bash <script>` (Git Bash ou WSL). O `.gitattributes` gerado mantém LF |
| Scripts sem permissão de execução no macOS/Linux | O `sync` os marca como executáveis; se foram commitados a partir do Windows, rode `npx @luizguitm/octo sync` de novo ou `bash <script>` |
| `sync` recusa um JSON "com comentários" | O Octo não reescreve JSON com comentários (JSONC) para não apagá-los. Tire os comentários do arquivo indicado, ou remova o host dele em `targets` |
| "New options not in your octo.config.json" | `npx @luizguitm/octo config upgrade` |
| Preferências ignoradas | `node .octo/bin/octo-session.mjs prefs` mostra o que o agente lê; linhas sem valor são ignoradas |

## 15. Criar e evoluir skills

As skills vivem no repositório do framework, nunca nos repositórios dos produtos (lá são cópias geradas):
- Skills de domínio: `skills/<domínio>/<tecnologia>/<skill>/SKILL.md`, com `metadata.complements` listando
  as skills do superpowers que ela complementa. Arquivos de apoio em `references/`, `scripts/`, `templates/`.
- Imports do awesome-copilot: acrescente em `upstream/awesome-copilot.imports.json` e rode
  `npm run upstream:update -- --source awesome-copilot`.
- Guia completo: a skill `octo-skill-domains` e a `writing-skills` do superpowers. Rode `npm test` antes de publicar.
