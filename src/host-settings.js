// Guardrails and session hooks, translated into each host's native settings.
// Claude Code enforces permissions (deny really blocks); Copilot can only require confirmation.

export const SESSION_HOOK_COMMAND = 'node "$CLAUDE_PROJECT_DIR/.octo/bin/octo-session.mjs" hook session-start';
export const PROMPT_HOOK_COMMAND = 'node "$CLAUDE_PROJECT_DIR/.octo/bin/octo-session.mjs" hook prompt';
export const GUARD_HOOK_COMMAND = 'node "$CLAUDE_PROJECT_DIR/.octo/bin/octo-guard.mjs" pre-tool';
export const STOP_HOOK_COMMAND = 'node "$CLAUDE_PROJECT_DIR/.octo/bin/octo-guard.mjs" stop';

// Copilot hooks (.github/hooks/octo.json): read by Copilot CLI, the cloud agent and VS Code (chat.useHooks, on by
// default). Paths are relative to the repo root; the cloud agent only honors `bash`, local Windows uses `powershell`.
export function copilotHooksFile() {
  const entry = (command, timeoutSec) => ({ type: 'command', bash: command, powershell: command, cwd: '.', timeoutSec });
  return {
    version: 1,
    hooks: {
      sessionStart: [entry('node .octo/bin/octo-session.mjs hook session-start copilot', 10)],
      // VS Code maps this to UserPromptSubmit and injects its context; Copilot CLI ignores the output (harmless).
      userPromptSubmitted: [entry('node .octo/bin/octo-session.mjs hook prompt copilot', 10)],
      preToolUse: [entry('node .octo/bin/octo-guard.mjs pre-tool', 10)],
    },
  };
}

export const OPEN_PR_SCRIPT = 'node .claude/skills/octo-autonomous-finish/scripts/open-pr.mjs';
export const PR_COMMANDS = ['gh pr create', 'az repos pr create'];
// Read-only: lets Copilot check sessions and preferences on the first message without a terminal prompt.
export const SESSION_READ_COMMANDS = ['node .octo/bin/octo-session.mjs status', 'node .octo/bin/octo-session.mjs prefs'];

// The autonomy policy adjusts the guardrails so they never contradict it. Raw `git push` is never granted:
// permission rules match prefixes, so allowing it would also allow `git push origin main --force`.
// Pushing goes through open-pr.mjs, which only ever runs `git push -u origin <current branch>`.
export function effectiveCommands(config) {
  const autonomy = config.autonomy ?? {};
  const granted = [
    ...SESSION_READ_COMMANDS,
    ...(autonomy.push || autonomy.pullRequest ? [OPEN_PR_SCRIPT] : []),
    ...(autonomy.pullRequest ? PR_COMMANDS : []),
  ];
  const configured = (kind) => config.guardrails?.commands?.[kind] ?? [];
  return {
    deny: configured('deny'),
    ask: configured('ask').filter((c) => !granted.includes(c)),
    allow: [...new Set([...configured('allow'), ...granted])],
  };
}

const commands = (config, kind) => effectiveCommands(config)[kind];

export function claudeCodeSettings(config) {
  const paths = config.guardrails?.protectedPaths ?? [];
  const pathRules = paths.flatMap((p) => [`Read(./${p})`, `Edit(./${p})`]);
  return {
    permissions: {
      deny: [...commands(config, 'deny').map((c) => `Bash(${c}:*)`), ...pathRules],
      ask: commands(config, 'ask').map((c) => `Bash(${c}:*)`),
      allow: commands(config, 'allow').map((c) => `Bash(${c}:*)`),
    },
    hooks: [
      { event: 'SessionStart', matcher: 'startup|resume|clear|compact', command: SESSION_HOOK_COMMAND },
      // Until preferences are reviewed, every message gets a reminder to review them first.
      { event: 'UserPromptSubmit', command: PROMPT_HOOK_COMMAND },
      // Enforces guardrails on the whole command (prefix permission rules can't see `push … --force`).
      { event: 'PreToolUse', matcher: 'Bash|PowerShell|Read|Edit|MultiEdit|Write|NotebookEdit', command: GUARD_HOOK_COMMAND },
      // During the finish phase, don't stop with unpushed commits (continues once at most).
      { event: 'Stop', command: STOP_HOOK_COMMAND },
    ],
  };
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');

// VS Code `chat.tools.terminal.autoApprove`: regex keys; false = always ask, true = auto-approve.
export function copilotAutoApprove(config) {
  const entry = (cmd, value) => [`/^\\s*${escapeRegex(cmd)}(\\s|$)/`, value];
  return Object.fromEntries([
    ...commands(config, 'deny').map((c) => entry(c, false)),
    ...commands(config, 'ask').map((c) => entry(c, false)),
    ...commands(config, 'allow').map((c) => entry(c, true)),
  ]);
}

export function guardrailsText(config) {
  const list = (items) => (items.length ? items.map((i) => `\`${i}\``).join(', ') : 'none');
  return [
    `- Never run: ${list(commands(config, 'deny'))} (in any form or order of flags).`,
    `- Ask before running: ${list(commands(config, 'ask'))}.`,
    `- Never read, print or edit: ${list(config.guardrails?.protectedPaths ?? [])}. Ask the user if a task seems to need them.`,
    `- Fix loops stop after **${config.guardrails?.maxFixRounds ?? 5}** rounds per task (superpowers' own limit is 5): then stop and ask.`,
  ].join('\n');
}
