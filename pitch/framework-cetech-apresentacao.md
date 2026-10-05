# Framework CETECH: roteiro de apresentação e speech de vendas

> Material para apresentar o **Framework CETECH** a times, lideranças e gestores. Cada seção é um slide (ou um
> bloco de slides): **No slide** é o que aparece na tela; **Fala** é o que você diz. Tempo total sugerido: 30
> minutos + 10 de perguntas. Os números marcados com `[medir]` e `[definir]` devem ser preenchidos com dados reais
> do piloto antes de apresentar: não use estimativas como se fossem resultados.

---

## Mensagem central (decore esta frase)

> **"O Framework CETECH faz o time entregar mais rápido e com mais qualidade usando a IA que a gente já tem: ela
> entende o pedido, planeja, implementa com as boas práticas de cada tecnologia, testa, prova com evidência e
> entrega um pull request pronto para revisão, dentro de guardrails que impedem o que não pode acontecer."**

Três ideias para repetir ao longo da apresentação:
1. **Velocidade com qualidade, não velocidade *ou* qualidade:** o mesmo fluxo que acelera é o que garante teste,
   evidência e revisão.
2. **Guardrails de verdade:** o que é perigoso é bloqueado antes de executar; não depende da IA "se comportar".
3. **Skills técnicas:** a IA trabalha com o conhecimento de especialista em cada tecnologia (Salesforce, web,
   Python, segurança, arquitetura), não com conhecimento genérico.

---

## 1. Abertura: o problema (2 min)

**No slide**
- Todo mundo já tem IA no editor. Pouca gente tem **resultado consistente** com ela.
- Rápido, mas sem qualidade: código que "parece certo", sem teste, sem evidência, fora do padrão do time.
- Com qualidade, mas devagar: revisão manual pesada, retrabalho, conhecimento preso em poucas pessoas.

**Fala**
"Hoje a pergunta não é mais *se* usamos IA: o Copilot e o Claude já estão aqui. O problema é que a IA sozinha
nos obriga a escolher: ou vai rápido e aceita risco, ou revisa tudo e perde a velocidade. O Framework CETECH
existe para acabar com essa escolha. Ele coloca método, conhecimento técnico e limites de segurança em volta da
IA, para que a velocidade venha **junto** com a qualidade."

---

## 2. O que é ser AI-first (3 min)

**No slide**

| Uso tradicional da IA | AI-first com o Framework CETECH |
|---|---|
| Humano faz, IA sugere | IA executa, humano decide e revisa |
| Prompt solto, resultado variável | Fluxo padronizado, resultado repetível |
| Conhecimento genérico do modelo | **Skills técnicas** com as boas práticas de cada tecnologia |
| "Confio que a IA não vai fazer besteira" | **Guardrails** que bloqueiam o que é perigoso |
| "Acho que funciona" | Evidência: teste rodado, print por cenário, Definition of Done |
| Termina no código | Termina no **pull request** |

**Fala**
"AI-first é uma mudança de papel: o humano deixa de digitar e passa a definir o que é certo e aprovar. Para
isso funcionar com segurança, três coisas precisam existir: **conhecimento técnico** que a IA aplica sozinha,
**limites** que ela não consegue ultrapassar e **evidência** de que o trabalho está pronto."

### Os 6 princípios AI-first do framework
1. **Contexto primeiro:** antes de mexer no código, a IA lê o mapa do projeto. Se não existe, cria um em
   cerca de 10 minutos, mesmo num monorepo de 10 anos.
2. **Especificar antes de implementar:** o pedido vira spec e plano, com cenários de aceite (S1, S2…).
3. **Aplicar o especialista certo:** em cada etapa, a IA descobre e carrega as skills da tecnologia envolvida.
4. **Paralelizar o que é independente:** várias frentes ao mesmo tempo, sem pisar no mesmo arquivo.
5. **Provar, não afirmar:** "pronto" só com teste rodado e print de cada cenário, num Definition of Done em português.
6. **Proteger por padrão:** guardrails ativos o tempo todo, sem depender da memória de ninguém.

---

## 3. O que é o Framework CETECH (2 min)

**No slide**
- Framework de **engenharia com IA** da empresa, instalado em qualquer repositório com um comando.
- Base aberta e madura: **superpowers** (metodologia de desenvolvimento com agentes) + skills curadas do
  **awesome-copilot** (GitHub), com a camada da empresa por cima.
- Funciona igual no **Claude Code** e no **GitHub Copilot** (VS Code, CLI).
- Para o usuário: **um comando de entrada + o pedido em português**.

**Fala**
"Não reinventamos a roda. Partimos de metodologias abertas e colocamos por cima o que é nosso: guardrails,
skills por tecnologia, padrão de branch, linguagem, regras de entrega. E sem prender a empresa a um fornecedor:
o mesmo framework roda no Claude Code e no Copilot."

---

## 4. Como acelera com mais qualidade (4 min) ★ slide de valor

**No slide**: onde o tempo é ganho e onde a qualidade é garantida, no mesmo fluxo

| Etapa | Acelera porque… | Garante qualidade porque… |
|---|---|---|
| Pedido em português | Ninguém precisa traduzir o pedido para "linguagem de IA"; o framework escolhe o fluxo | O pedido original fica registrado palavra por palavra |
| Contexto | Mapa do projeto pronto em ~10 min e reaproveitado em toda tarefa | A IA trabalha com os comandos e as armadilhas reais do projeto |
| Spec e plano | A IA escreve; o humano só aprova | Cenários de aceite definidos **antes** do código |
| Skills técnicas | Boas práticas aplicadas automaticamente, sem pesquisar | Código no padrão de cada tecnologia (Apex, LWC, React, Python…) |
| Implementação | Subagentes em paralelo, por ondas | Testes primeiro (TDD); revisão por tarefa |
| Teste web | Navegador automatizado, um print por cenário | Comportamento verificado na tela, não suposto |
| Definition of Done | Documento gerado sozinho, em português | "Pronto" só com evidência para cada cenário |
| Entrega | Commit, push e PR em rascunho, sem passos manuais | Revisão humana obrigatória; nada vai direto para a branch principal |

**Fala**
"Olhem as duas colunas: cada etapa que acelera é também uma etapa que protege. A spec que a IA escreve em
minutos é a mesma que define o teste. O paralelismo que ganha horas é limitado a tarefas que não se tocam. E o
fim do processo não é 'a IA disse que terminou': é um PR com evidência, que um humano aprova."

**Rigor proporcional (para quem teme burocracia):** um bug pequeno não ganha spec nem plano: vai direto para
teste, correção e PR. O processo completo só aparece quando a mudança pede.

---

## 5. Guardrails: segurança que não depende da IA (4 min) ★ destaque

**No slide**

| Guardrail | O que impede | Como funciona |
|---|---|---|
| **Comandos destrutivos bloqueados** | `git push --force` (em qualquer ordem de parâmetros), `reset --hard`, `clean -fd`, `branch -D` | Hook que lê o comando **inteiro** antes de executar e nega; vale no Claude Code e no Copilot |
| **Arquivos sensíveis protegidos** | Ler, mostrar ou editar `.env`, chaves (`.pem`, `.key`), pastas de segredos | Hook + permissões nativas da ferramenta |
| **Branch principal intocável** | Commit ou push direto em `main`, `master`, `develop` | Trabalho sempre numa branch no padrão da empresa; push só por um script que não força nada |
| **Entrega sempre por PR** | Código chegando em produção sem revisão | Todo trabalho termina num PR em rascunho, aprovado por humano |
| **Só modelos permitidos** | Uso de modelos não aprovados pela empresa | Lista de modelos por nível (rápido, padrão, profundo), definida pelo time |
| **Verificação antes do commit** | Commitar segredos, prints soltos, arquivos indevidos | Checagem automática do que foi preparado para o commit |
| **Limite de tentativas** | IA em loop corrigindo o mesmo erro | Depois de 5 rodadas, para e pergunta |
| **Autonomia configurável** | IA decidindo além do que o time permite | Níveis `supervised`, `balanced` (padrão) e `full`, com pontos de aprovação |
| **Segredos fora da configuração** | Token ou senha escritos nos arquivos de configuração | A validação recusa valores literais; só referências a variáveis de ambiente |

**Fala**
"A primeira pergunta de qualquer gestor é: e se a IA fizer besteira? A resposta tem duas camadas. Primeiro,
ela não entrega direto: entrega um PR que um humano aprova. Segundo, e mais importante: as ações perigosas não
dependem do bom comportamento da IA. Elas são **bloqueadas por hooks**, programas que a própria ferramenta roda
antes de cada comando. Mesmo que a IA tente, o comando não executa. Isso vale igual no Claude Code e no Copilot."

**Exemplo para contar:** "Testamos o próprio guardrail: um commit com a frase 'never push --force' na mensagem
passou, porque é só texto; o comando `git push origin main --force` foi bloqueado. O guardrail entende o que é
comando e o que é texto."

---

## 6. Skills técnicas: o especialista certo em cada tarefa (4 min) ★ destaque

**No slide**: catálogo por domínio e tecnologia, carregado sob demanda

| Domínio | Tecnologias e skills |
|---|---|
| **Salesforce** | Apex (qualidade e padrões), LWC (padrões de componentes), Flow (desenho de fluxos), Agentforce (agentes), SF CLI (deploy) |
| **Web** | React 19 (padrões e testes), Jest, Node (APIs), Next.js + Tailwind, Playwright (testes de aplicação), acessibilidade, revisão de UI |
| **Python** | Projetos Python, FastAPI (serviços), pytest (testes e cobertura), Playwright para Python |
| **Segurança** | Revisão de segurança e OWASP, varredura de segredos, modelagem de ameaças |
| **Arquitetura** | Design de APIs, detecção de quebra de contrato de API, ADRs (registro de decisões), revisão de SQL e PostgreSQL, migrações de banco |
| **Engenharia** | Conventional Commits, refatoração, auditoria de lacunas de teste, dupla checagem, documentação para IA |

- **Descoberta progressiva:** a IA não carrega tudo de uma vez. A cada etapa (planejar, testar, revisar), ela
  consulta o catálogo e carrega só as skills da tecnologia envolvida. Mais precisão e menos custo.
- **Base curada:** skills do repositório oficial **awesome-copilot** (GitHub) + skills próprias da empresa.
- **Extensível:** novos domínios, tecnologias e ferramentas internas (MCPs, como grafos de código e Azure
  DevOps) entram no catálogo e passam a valer para todos os repositórios.

**Fala**
"Um modelo de IA sabe um pouco de tudo. Uma skill é o que transforma esse 'um pouco' em conhecimento de
especialista: as regras de qualidade de Apex, os padrões de componente LWC, o checklist de OWASP. Quando a IA
vai escrever um teste em Salesforce, ela carrega a skill de Apex; quando vai revisar segurança, carrega a de
OWASP. O resultado é código no padrão que um sênior daquela tecnologia exigiria, desde a primeira versão."

---

## 7. A jornada de uma demanda (4 min)

**No slide** (diagrama de fluxo)

```
 Pedido em português  →  Contexto  →  Spec + plano  →  Implementação     →  Teste web   →  Definition  →  Pull
 "o filtro de status      (mapa do      (cenários S1,    com skills técnicas    (print por     of Done      request
  não salva"              projeto)      S2…)             e guardrails ativos    cenário)       (pt-BR)      (draft)
```

| Etapa | O que a IA faz | O que o humano faz |
|---|---|---|
| Pedido | Entende a intenção (bug, funcionalidade, dúvida) e escolhe o fluxo | Escreve em linguagem natural |
| Contexto | Lê ou cria o mapa do projeto | Nada |
| Spec e plano | Escreve, com cenários de aceite | **Aprova** (quando a política pede) |
| Implementação | Testes primeiro, skills da tecnologia, subagentes em paralelo | Nada, ou responde dúvidas reais |
| Teste web | Abre o navegador, executa cada cenário, tira print | Nada |
| Definition of Done | Documento em português com resultado e evidência por cenário | Lê |
| Entrega | Commit, push e PR em rascunho (GitHub ou Azure DevOps) | **Revisa e aprova o PR** |

**Fala**
"O humano aparece em dois momentos: aprovar o que vai ser feito e aprovar o que foi feito. Todo o resto a IA
executa sozinha, perguntando só quando há dúvida real. E tudo fica registrado: o pedido original, as decisões,
a spec, o plano e o DoD vão junto no PR."

**Demonstração ao vivo (opcional, 5 min):** abra o VS Code num repositório com o framework e peça a correção de
um bug simples e real. Mostre: a branch criada no padrão da empresa, a sessão com o pedido original, a skill da
tecnologia sendo carregada, o teste, o DoD com print e o link do PR. Mostre também um comando perigoso sendo
bloqueado. Ensaie antes; tenha um vídeo gravado como plano B.

---

## 8. Para quem é (2 min)

| Perfil | O que ganha |
|---|---|
| **Analista funcional / não-dev** | Abre um bug ou melhoria em português e recebe um PR. Linguagem "simples, sem jargão". |
| **Desenvolvedor** | Para de repetir contexto e tarefas mecânicas; revisa em vez de digitar; aprende com as skills. |
| **Tech lead** | Mesmo padrão para todo o time: branch, commit, testes, DoD, PR e boas práticas por tecnologia. |
| **Gestão e segurança** | Guardrails auditáveis, modelos controlados, rastreabilidade do pedido ao PR. |

---

## 9. Prova: o piloto (3 min)

**No slide**
- Repositório: **monorepo Salesforce com ~10 anos**, Azure DevOps, GitHub Copilot.
- Usuária: **analista funcional**, sem perfil de desenvolvimento.

| Feedback do piloto | Resposta no framework |
|---|---|
| "Criar o contexto demorou demais" | Mapa rápido em ~10 min; áreas detalhadas só quando a tarefa passa por elas |
| "Muito burocrático, testa tudo o tempo todo" | Rigor proporcional: testa o que foi alterado; no Salesforce, só as classes afetadas |
| "Não chegou no PR" | Toda tarefa termina em PR em rascunho (ou link de um clique já preenchido) |
| "Usou modelos desconhecidos" | Só modelos permitidos pela empresa, com nome confirmado |
| "Complexo de usar" | Um comando de entrada + pedido em português |

- Resultados `[medir]`: tempo do pedido ao PR, idas e voltas, retrabalho no review.

**Fala**
"Não deu tudo certo de primeira, e isso é o ponto: cada problema virou uma regra do framework, que agora vale
para todo mundo que instala. É um método que melhora com o uso."

---

## 10. Como adotar: o caminho AI-first (4 min) ★ "como seguir por isso"

| Fase | Duração sugerida | O que fazer | Critério para avançar |
|---|---|---|---|
| **0. Preparar** | 1 semana | Escolher 1 repositório e 2 a 3 pessoas (incluir 1 não-dev). Instalar, responder as perguntas do time (versionamento, teste web, padrão de branch), gerar o mapa do projeto. | Mapa do projeto preenchido; diagnóstico sem pendências |
| **1. Piloto** | 2 a 4 semanas | Bugs e melhorias pequenas pelo comando de entrada. Feedback semanal. | ≥ `[meta]` demandas com PR; atritos principais resolvidos |
| **2. Time** | 1 a 2 meses | Todo o time começa pelo framework; spec e DoD viram padrão de review. | Métricas estáveis; time prefere o fluxo |
| **3. Escala** | contínuo | Novos repositórios e domínios; skills próprias da empresa; ferramentas internas (MCPs). | Adoção medida por repositório |

### Práticas AI-first para o time
1. **Toda demanda começa pelo framework**, mesmo as pequenas: é assim que o padrão e o histórico se formam.
2. **Escreva para a IA:** o que custou tempo vira uma linha no mapa do projeto. A próxima tarefa já sabe.
3. **Revise o plano, não só o código:** aprovar a spec custa minutos e evita horas de retrabalho.
4. **Exija evidência:** PR sem DoD (para tarefas com spec) não está pronto.
5. **Transforme boa prática em skill:** o padrão que o sênior cobra no review vira skill, e a IA passa a aplicar
   sozinha.
6. **Guardrail novo em vez de "cuidado":** se algo não pode acontecer, vira bloqueio, não aviso.
7. **Escolha o modelo certo:** padrão para o dia a dia; profundo só para desenho, revisão final e bug difícil.
8. **Meça:** sem números, AI-first vira opinião.

---

## 11. Métricas para acompanhar (1 min)

| Métrica | Como medir | Meta |
|---|---|---|
| Tempo do pedido ao PR | Data da sessão → data do PR | `[definir]` |
| % de demandas que chegam ao PR | Sessões encerradas com PR / sessões abertas | `[definir]` |
| Retrabalho no review | Comentários "mudar" por PR | `[definir]` |
| Bloqueios de guardrail | Ações perigosas evitadas | `[medir]` |
| Cobertura de evidência | PRs com DoD `CONCLUÍDO` / PRs com spec | 100% |
| Demandas abertas por não-devs | Sessões iniciadas por analistas | `[definir]` |

---

## 12. Objeções comuns e respostas

| Objeção | Resposta |
|---|---|
| "A IA vai errar." | Vai. Por isso existe spec aprovada antes, testes primeiro, skills da tecnologia, evidência por cenário e PR revisado por humano. O erro aparece antes do merge. |
| "Mais velocidade = menos qualidade." | No framework, as mesmas etapas que aceleram garantem a qualidade: a spec define o teste, as skills aplicam o padrão, o DoD exige evidência. |
| "É seguro?" | Guardrails por hook bloqueiam comandos destrutivos e arquivos sensíveis antes de executar, no Claude Code e no Copilot. Nada chega na branch principal sem PR. |
| "Já temos Copilot." | O framework não substitui o Copilot: dá a ele método, conhecimento técnico e limites. Mesma ferramenta, resultado consistente. |
| "Vai gerar burocracia." | O rigor é proporcional: bug pequeno não ganha spec nem plano. O piloto cortou burocracia. |
| "E o custo de modelos?" | Modelos por nível e skills carregadas sob demanda: tarefas simples usam modelos rápidos e menos contexto. |
| "Ficamos presos a um fornecedor?" | Não: Claude Code e Copilot, com base em projetos abertos (superpowers, awesome-copilot). |
| "Legado grande não funciona." | O piloto foi num monorepo Salesforce de 10 anos. |
| "Quem não é dev consegue usar?" | O piloto foi feito por uma analista funcional. |
| "Vai poluir o repositório." | Opcional: o framework pode ficar fora do git; só a configuração e o mapa do projeto são versionados. |

---

## 13. Fechamento e chamada para ação (1 min)

**No slide**
- **Proposta:** piloto de 4 semanas em `[repositório]`, com `[2–3 pessoas]`, começando em `[data]`.
- **O que precisamos:** acesso ao repositório, 1 hora de setup, 30 min de feedback por semana.
- **O que entregamos:** demandas reais com PR, métricas de velocidade e qualidade e um relatório de adoção.

**Fala**
"A IA já está paga e no editor de todo mundo. O que falta é método, conhecimento técnico e limites. O Framework
CETECH entrega os três, testado no cenário mais difícil que tínhamos. Proposta simples: quatro semanas, um
repositório, poucas pessoas e números no final."

---

## Apêndice A: perguntas técnicas prováveis

- **Como instala?** Um comando `npx` na raiz do repositório (Node 18+), que pergunta as configurações do time:
  versionar o framework, teste web, padrão de branch.
- **Onde ficam as regras?** Um arquivo de configuração do time e um arquivo de preferências pessoais (modelos,
  comunicação, autonomia).
- **Como atualiza?** Um comando de sincronização; o agente verifica sozinho no início de cada tarefa.
- **Como abre o PR no Azure DevOps?** Pelo `az` CLI, pelo MCP oficial da Microsoft ou por um link de um clique.
- **Quantos agentes em paralelo?** Até 8 por padrão (configurável), só para tarefas que não mexem nos mesmos arquivos.
- **Os guardrails funcionam no Copilot?** Sim: os hooks rodam no Claude Code e no Copilot e bloqueiam antes da execução.
- **Dá para criar skills da empresa?** Sim: entram no catálogo por domínio e tecnologia e valem para todos os repositórios.

## Apêndice B: checklist antes de apresentar

- [ ] Preencher os `[medir]` e `[definir]` com dados reais do piloto.
- [ ] Ensaiar a demonstração (incluindo um comando bloqueado pelo guardrail) e gravar o vídeo de backup.
- [ ] Confirmar os nomes dos modelos permitidos na organização.
- [ ] Ter um repositório de demonstração com o mapa do projeto já preenchido.
- [ ] Levar o manual do framework para quem quiser aprofundar.
