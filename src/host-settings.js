// Guardrails and session hooks, translated into each host's native settings.
// Claude Code enforces permissions (deny really blocks); Copilot can only require confirmation.

export const SESSION_HOOK_COMMAND = 'node "$CLAUDE_PROJECT_DIR/.octo/bin/octo-session.mjs" hook session-start';

const commands = (config, kind) => config.guardrails?.commands?.[kind] ?? [];

export function claudeCodeSettings(config) {
  const paths = config.guardrails?.protectedPaths ?? [];
  const pathRules = paths.flatMap((p) => [`Read(./${p})`, `Edit(./${p})`]);
  return {
    permissions: {
      deny: [...commands(config, 'deny').map((c) => `Bash(${c}:*)`), ...pathRules],
      ask: commands(config, 'ask').map((c) => `Bash(${c}:*)`),
      allow: commands(config, 'allow').map((c) => `Bash(${c}:*)`),
    },
    hooks: [{ event: 'SessionStart', matcher: 'startup|resume|clear|compact', command: SESSION_HOOK_COMMAND }],
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
