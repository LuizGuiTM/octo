# Definition of Done: <funcionalidade>

| | |
|---|---|
| Status | **CONCLUÍDO** / **NÃO CONCLUÍDO** |
| Data | AAAA-MM-DD |
| Spec | [docs/superpowers/specs/<arquivo>.md](../../specs/<arquivo>.md) |
| Plano | [docs/superpowers/plans/<arquivo>.md](../../plans/<arquivo>.md) |
| Branch | `feature/<tópico>-octo` (este documento vai no commit final) |
| Ambiente | <URL testada, ex.: http://localhost:3000> · <ferramenta: Claude in Chrome / Playwright MCP> |

## Cenários
| ID | Critério | Tipo | Resultado | Evidência |
|---|---|---|---|---|
| S1 | AC1: … | web | ✅ PASSOU | [print](screenshots/S1-<slug>.<ext>) |
| S2 | AC2: … | teste | ✅ PASSOU | `npm test -- …` → 12 aprovados |
| S3 | AC3: … | web | ❌ FALHOU | [print](screenshots/S3-<slug>.<ext>) |

## Evidências

### S1: <nome do cenário>
- Passos: <o que foi feito>
- Esperado: <do plano>
- Observado: <o que a página mostrou>
- Erros de console/rede: nenhum

![S1 – <slug>](screenshots/S1-<slug>.<ext>)

<!-- repita para cada cenário web -->

## Checklist
- [ ] Todos os cenários de aceite PASSARAM, cada um com evidência
- [ ] Suíte de testes completa verde: `<comando>` → <contagens>
- [ ] Lint / checagem de tipos / build verdes: `<comandos>`
- [ ] Code review feito, sem achados CRÍTICOS/IMPORTANTES em aberto
- [ ] Revisão de segurança (se aplicável)
- [ ] Docs de IA atualizados: <arquivos>
- [ ] Sem segredos, saídas de debug ou arquivos temporários no diff
- [ ] Commit feito numa branch de feature

## Histórico
<!-- falhas encontradas durante os testes e como foram corrigidas; link para os prints -fail-N -->

## Dispensas e pendências
<!-- o que não foi feito, quem aprovou a dispensa e por quê, e tarefas de acompanhamento -->
