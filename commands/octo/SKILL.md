---
name: octo
description: "Command /octo <anything, in plain language>: the single entry point. Understands what the user wants (new feature, bug, continue, finish, status, question) and runs the right Octo flow, so nobody needs to learn the other commands. Only when the user invokes it."
argument-hint: "<o que você precisa, em linguagem natural>"
disable-model-invocation: true
---

# /octo

The user may not be a developer. Treat the text after the command as a plain-language request, figure out the
intent yourself, and run the matching flow. Say in one short sentence what you understood and what you'll do
("Entendi: é um erro ao salvar a oportunidade. Vou investigar e corrigir.") and go, unless the policy says to ask.

| The request sounds like… | Run |
|---|---|
| something new or a change in behavior ("quero que…", "adicionar…", "mudar…") | `/octo-start` flow (`.claude/skills/octo-start/SKILL.md`) |
| something broken ("erro", "não funciona", "bug", a failing test, an error message) | `/octo-fix` flow |
| "continuar", "onde paramos", nothing specific while a session is open | `/octo-status`, then continue from the session's next step |
| "terminar", "finalizar", "abrir o PR", "pode entregar" | `/octo-done` flow |
| a question about the system ("como funciona…", "onde fica…") | answer it; no branch, no session, no code change |
| empty | show the session status if there is one; otherwise ask what they need in one question |

Rules:
- Follow the user's language level from their preferences; with "simples, sem jargão", explain in business terms
  and ask only questions a business user can answer (expected behavior, examples, who is affected). Never ask them
  to choose between technical designs: decide and record it.
- Every flow that changes code ends in a PR per the autonomy policy (or the one-click PR link).
- If the intent is genuinely unclear, ask one question with 2-3 options, the most likely first.
