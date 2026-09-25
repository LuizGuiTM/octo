// Guardrails and session hooks, translated into each host's native settings.
// Claude Code enforces permissions (deny really blocks); Copilot can only require confirmation.

export const SESSION_HOOK_COMMAND = 'node "$CLAUDE_PROJECT_DIR/.octo/bin/octo-session.mjs" hook session-start';

export const OPEN_PR_SCRIPT = 'node .claude/skills/octo-autonomous-finish/scripts/open-pr.mjs';
export const PR_COMMANDS = ['gh pr create', 'az repos pr create'];

// The autonomy policy adjusts the guardrails so they never contradict it. Raw `git push` is never granted:
// permission rules match prefixes, so allowing it would also allow `git push origin main --force`.
// Pushing goes through open-pr.mjs, which only ever runs `git push -u origin <current branch>`.
export function effectiveCommands(config) {
  const autonomy = config.autonomy ?? {};
  const granted = [
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
