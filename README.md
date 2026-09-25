# Octo

Camada de engenharia **sobre o [superpowers](https://github.com/obra/superpowers)** (MIT), para **Claude Code** e **GitHub Copilot**. Pensada para times que querem padronizar como os agentes trabalham em vários repositórios.

```bash
npx @luizguitm/octo init
```

O superpowers é o fluxo e fica **intocado**, fixado num commit em `upstream/superpowers/`. O Octo não sobrescreve nada: ele **complementa**. Cada skill do Octo declara quais skills do superpowers ela estende, e o agente carrega os complementos junto com a skill do superpowers.

## O que o Octo adiciona
| Necessidade | Skill Octo | Complementa (superpowers) |
|---|---|---|
| IA e documentos para IA em primeiro lugar | `octo-ai-context` | brainstorming, systematic-debugging, finishing-a-development-branch |
| Descobrir skills de domínio sob demanda | `octo-discovering-skills` | using-superpowers (e toda skill via INDEX) |
| Máximo de subagentes em paralelo (ondas com arquivos disjuntos) | `octo-parallel-waves` | writing-plans, subagent-driven-development, executing-plans, dispatching-parallel-agents |
| Teste no navegador (Claude in Chrome / Playwright) | `octo-web-testing` | verification-before-completion, requesting-code-review |
| Documento de DoD com um print por cenário | `octo-definition-of-done` | writing-plans, verification-before-completion, finishing-a-development-branch |
| Fechar com commit, estilo Devin | `octo-autonomous-finish` | finishing-a-development-branch, verification-before-completion |
| Criar skills por domínio | `octo-skill-domains` | writing-skills |
| Retomar o trabalho entre sessões, hosts e compactações | `octo-session-continuity` | using-superpowers, brainstorming, writing-plans, executing-plans, subagent-driven-development, finishing-a-development-branch |
| Regras do Octo, níveis de modelo, notas do Copilot | `octo-using-octo` | using-superpowers |

As políticas (autonomia, paralelismo, modelos) chegam ao agente pelo bloco em `CLAUDE.md` e `copilot-instructions.md`. O próprio `using-superpowers` diz que instruções do usuário valem mais que as skills, e é assim que o Octo ajusta o comportamento sem editar o upstream.

## Domínios
```
skills/
├─ core/           nativas, sempre visíveis (a camada Octo)
├─ architecture/   api-design, database-migrations
├─ security/       security-review
├─ web/            react-components, nextjs-app-router, node-api
├─ salesforce/     apex-development, lwc-development, agentforce-agents, sf-deployment
└─ python/         python-project, fastapi-services, pytest-testing
```
Os domínios, fora o `core`, viram um catálogo no repositório (`.octo/catalog/INDEX.md`) organizado **por skill do superpowers**. Ao entrar em `writing-plans`, por exemplo, o agente consulta a linha dessa skill e carrega só o que combina com o trabalho.

## Instalação num repositório
Requer Node 20 ou superior. Rode dentro do repositório de destino, ou passe `--cwd <pasta>`:
```bash
npx @luizguitm/octo init      # detecta domínios, cria octo.config.json e gera tudo
npx @luizguitm/octo doctor    # confere a instalação
```
Depois, peça ao agente: *"rode a skill octo-ai-context"* para preencher o `AGENTS.md`.

Para fixar uma versão: `npx @luizguitm/octo@0.1.0 sync`. Para ter o comando global: `npm i -g @luizguitm/octo` e depois `octo init`.

O que é gerado deve ser commitado no repositório do produto. `octo sync` reaplica tudo depois de atualizar o framework ou a config, e `octo config upgrade` acrescenta opções novas à config.

## Sessões
Cada tarefa tem um arquivo em `.octo/sessions/` com fase, spec, plano, decisões e próximo passo. O `.octo/bin/octo-session.mjs` tem os comandos `status`, `new "<tópico>"` e `close <arquivo>`.
- Claude Code: um hook de SessionStart injeta o estado no início, no resume e depois de compactar.
- Copilot: as instruções mandam rodar `status` no início.
- `sessions.commit: false` (padrão) mantém os arquivos locais. Com `true`, eles acompanham a branch.

## Guardrails
`guardrails` na config define comandos bloqueados, comandos que pedem confirmação, comandos liberados, arquivos protegidos e o limite de rodadas de correção.
- Claude Code: vira `permissions` em `.claude/settings.json`, e o bloqueio é real.
- Copilot: vira `chat.tools.terminal.autoApprove` em `.vscode/settings.json`, que só consegue **pedir confirmação**. O restante vai como regra nas instruções.
- Entradas que você já tinha nesses arquivos são preservadas. O Octo só remove o que ele mesmo criou.

## MCPs customizados
- Para a empresa inteira: `mcp/<nome>/server.json` no framework, mais uma skill opcional de uso. Cada repositório ativa com `"mcp": { "enable": ["<nome>"] }`.
- Só para um repositório: `"mcp": { "servers": { … } }` no `octo.config.json`.
- Segredos sempre via `{env:NOME}`. A raiz do repositório via `{workspace}`.
- Detalhes e exemplo em [`mcp/README.md`](mcp/README.md).

## Definition of Done
O plano ganha uma tabela **Acceptance scenarios** (S1, S2…). O `octo-web-testing` executa os cenários `web` no navegador e salva **um print por cenário**. O `octo-definition-of-done` monta `docs/superpowers/dod/<data>-<tópico>/DoD.md`, com o resultado, a evidência e o print de cada cenário, mais o checklist da empresa. O commit final só acontece com o DoD em `DONE`, e o documento vai junto no commit.
- Claude Code: print via Claude in Chrome (`save_to_disk`), copiado para a pasta do DoD.
- Copilot: print via Playwright MCP (`browser_take_screenshot`), salvo em `.octo/evidence/` (ignorado no git) e movido para a pasta do DoD.
- Critérios extras por repositório: `dod.extraCriteria` na config.

| Comando | O que faz |
|---|---|
| `octo init [--targets claude-code,copilot] [--domains web,salesforce]` | Cria a config e sincroniza |
| `octo sync` | Regenera tudo a partir da config |
| `octo doctor` | Valida config e instalação |
| `octo config upgrade` | Acrescenta à config as opções novas, com valores padrão |
| `octo skills list [--all]` | Lista superpowers, skills nativas do Octo e o catálogo |
| `octo skills promote <nome>` | Torna uma skill de domínio nativa |

### O que é gerado
| Arquivo | Conteúdo |
|---|---|
| `.claude/skills/` | Skills do superpowers (cópia exata) + `octo-*` + promovidas. O Claude Code e o Copilot leem essa pasta |
| `.claude/agents/octo-*.md` | Agentes para o Claude Code (modelo por alias) |
| `.github/agents/octo-*.agent.md` | Agentes para o Copilot (modelo pelo nome do seletor, com fallback) |
| `CLAUDE.md` / `.github/copilot-instructions.md` | Bloco `octo:begin/end`: carrega o superpowers, o Octo, a tabela de complementos e as políticas |
| `.octo/catalog/` | Catálogo de domínios + `INDEX.md` |
| `.octo/licenses/superpowers-LICENSE` | Licença MIT do superpowers |
| `.vscode/mcp.json` | Playwright MCP (teste web no Copilot) |
| `AGENTS.md` | Esqueleto criado uma única vez |

### Agentes (modelo por nível)
O superpowers pede "modelo barato", "padrão" ou "mais capaz". O Octo mapeia esses pedidos para `octo-worker-fast`, `octo-worker-standard` e `octo-worker-deep`, cada um com o modelo fixado a partir da config. Também existem `octo-explorer` (fast, só leitura), `octo-web-tester` e `octo-doc-writer`.

## Configuração (`octo.config.json`)
```jsonc
{
  "targets": ["claude-code", "copilot"],
  "language": { "artifacts": "en", "responses": "pt-BR" },
  "domains": ["architecture", "security", "web", "salesforce"],
  "upstream": { "exclude": [] },                       // skills do superpowers a não instalar
  "models": {
    "claude-code": { "allowed": ["opus", "sonnet", "haiku"], "tiers": { "deep": "opus", "standard": "sonnet", "fast": "haiku" } },
    "copilot": { "allowed": ["Claude Opus 4.5", "Claude Sonnet 4.5", "Claude Haiku 4.5", "GPT-5.2"],
                 "tiers": { "deep": ["Claude Opus 4.5", "GPT-5.2"], "standard": ["Claude Sonnet 4.5"], "fast": ["Claude Haiku 4.5"] } }
  },
  "parallelism": { "maxSubagents": 8 },
  "autonomy": { "commit": true, "push": false, "pullRequest": false,
                "protectedBranches": ["main", "master", "develop"], "branchPrefix": "octo/", "askWhen": ["..."] },
  "webTesting": { "enabled": true, "baseUrl": "http://localhost:3000", "startCommand": "npm run dev",
                  "tools": { "claude-code": "claude-in-chrome", "copilot": "playwright" } }
}
```
Um nível que use modelo fora de `allowed` faz o `sync` falhar.

## Atualizar o superpowers
```bash
npm run upstream:update            # ou: node scripts/update-upstream.mjs --ref v6.4.1
npm test                           # falha se algum "complements" apontar para uma skill que sumiu ou mudou de nome
```
Nunca edite `upstream/superpowers/`. Para mudar um comportamento, crie ou ajuste uma skill complementar, ou uma política no `templates/bootstrap.md`.

## Desenvolvimento
```bash
npm test
```
