#!/usr/bin/env node
// Octo hooks that enforce policy in code (not just instructions). Installed into .octo/bin/; zero dependencies.
//   pre-tool  PreToolUse / preToolUse: denies dangerous shell commands in any flag order, and file access to
//             protected paths. Works with Claude Code, VS Code (Copilot) and Copilot CLI input shapes.
//   stop      Claude Code Stop: during the finish phase, don't stop before the work is pushed (PR or PR link).
// Reads octo.config.json (guardrails, autonomy). Allowing = exit 0 with no output.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function config() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'octo.config.json'), 'utf8'));
  } catch {
    return {};
  }
}

// Tool input comes in different shapes: Claude/VS Code `tool_input`, Copilot CLI `toolArgs` (object or JSON string).
export function toolCall(input) {
  let args = input.tool_input ?? input.toolInput ?? input.toolArgs ?? input.input ?? {};
  if (typeof args === 'string') {
    try { args = JSON.parse(args); } catch { args = { command: args }; }
  }
  const name = String(input.tool_name ?? input.toolName ?? '');
  const command = [args.command, args.cmd, args.script].find((v) => typeof v === 'string') ?? '';
  const file = [args.file_path, args.filePath, args.path, args.notebook_path].find((v) => typeof v === 'string') ?? '';
  return { name, command, file };
}

// Built-in rules: each matches the whole command, so flag order and extra arguments don't help.
const DANGEROUS = [
  [/\bgit\b[^;&|]*\bpush\b[^;&|]*(\s--force(?:-with-lease|-if-includes)?\b|\s-[a-zA-Z]*f[a-zA-Z]*\b|\s\+[\w./-]+)/, 'force push'],
  [/\bgit\b[^;&|]*\breset\b[^;&|]*\s--hard\b/, 'git reset --hard'],
  [/\bgit\b[^;&|]*\bclean\b[^;&|]*\s-[a-zA-Z]*f[a-zA-Z]*d|\bgit\b[^;&|]*\bclean\b[^;&|]*\s-[a-zA-Z]*d[a-zA-Z]*f/, 'git clean -fd'],
  [/\bgit\b[^;&|]*\bbranch\b[^;&|]*\s-D\b/, 'force-deleting a branch'],
];

const globToRegExp = (glob) => {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === '*' && glob[i + 1] === '*') {
      const slash = glob[i + 2] === '/';
      re += slash ? '(?:.*/)?' : '.*';
      i += slash ? 2 : 1;
    } else if (ch === '*') re += '[^/]*';
    else if (ch === '?') re += '[^/]';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
};

export function checkPreTool(input, cfg = config()) {
  const { command, file } = toolCall(input);
  const guardrails = cfg.guardrails ?? {};
  if (command) {
    // Quoted text (commit messages, echo) is data, not flags: blank it out before matching the rules.
    const normalized = command.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""').replace(/\s+/g, ' ');
    for (const [re, label] of DANGEROUS) {
      if (re.test(normalized)) return `Blocked by Octo guardrails: ${label} is never allowed. Ask the user to do it themselves if it's really needed.`;
    }
    // Configured deny rules match as ordered words anywhere in the command (e.g. "git push --force").
    for (const rule of guardrails.commands?.deny ?? []) {
      const words = rule.trim().split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      if (new RegExp(`(^|[\\s;&|(])${words.join('\\s+(?:\\S+\\s+)*?')}(?=\\s|$)`).test(normalized)) {
        return `Blocked by Octo guardrails: "${rule}" is on the deny list.`;
      }
    }
  }
  const protectedPaths = (guardrails.protectedPaths ?? []).map(globToRegExp);
  const touches = (p) => {
    const rel = path.relative(ROOT, path.resolve(ROOT, p)).split(path.sep).join('/');
    return protectedPaths.some((re) => re.test(rel));
  };
  if (file && touches(file)) return `Blocked by Octo guardrails: "${file}" is a protected path (secrets). Ask the user.`;
  if (command) {
    const mentioned = command.match(/[\w./\\-]*\.(?:env(?:\.[\w-]+)?|pem|key)\b/g) ?? [];
    const hit = mentioned.find((p) => touches(p.replace(/\\/g, '/')));
    if (hit) return `Blocked by Octo guardrails: the command touches "${hit}", a protected path (secrets). Ask the user.`;
  }
  return null;
}

// Stop: while the session is in the finish phase and the policy pushes/opens PRs, don't end with unpushed commits.
export function checkStop(input, cfg = config()) {
  if (input.stop_hook_active) return null; // already continued once: never loop
  const autonomy = cfg.autonomy ?? {};
  if (!autonomy.push && !autonomy.pullRequest) return null;
  const git = (...args) => {
    try { return execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; }
  };
  const branch = git('branch', '--show-current');
  if (!branch || (autonomy.protectedBranches ?? []).includes(branch)) return null;
  const sessionsDir = path.join(ROOT, '.octo', 'sessions');
  const session = fs.existsSync(sessionsDir) && fs.readdirSync(sessionsDir)
    .map((f) => fs.readFileSync(path.join(sessionsDir, f), 'utf8'))
    .find((t) => new RegExp(`^branch: ${branch.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}$`, 'm').test(t) && !/^status: paused$/m.test(t)); // closed sessions count: they're closed before the final push
  if (!session || !/^phase: (finish|done)$/m.test(session)) return null;
  const upstream = git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}');
  const ahead = upstream ? Number(git('rev-list', '--count', `${upstream}..HEAD`) ?? 0) : 1;
  if (ahead === 0) return null;
  return 'Octo: the session is in the finish phase but this branch has commits that were never pushed. Finish with octo-autonomous-finish: run open-pr.mjs (push + PR, or the one-click PR link) and give the user the link. If you are waiting for an answer from the user, say so in one line and stop.';
}

const [mode] = process.argv.slice(2);
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const input = readStdin();
  if (mode === 'pre-tool') {
    const reason = checkPreTool(input);
    if (reason) {
      // Every host understands exit code 2 + stderr as "deny"; the JSON covers hosts that read stdout.
      console.log(JSON.stringify({
        permissionDecision: 'deny', permissionDecisionReason: reason,
        hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
      }));
      console.error(reason);
      process.exit(2);
    }
  } else if (mode === 'stop') {
    const reason = checkStop(input);
    if (reason) console.log(JSON.stringify({ decision: 'block', reason }));
  }
  process.exit(0);
}
