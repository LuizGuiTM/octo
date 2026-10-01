import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { autonomyPreset, defaultConfig } from '../src/config.js';
import { sync } from '../src/sync.js';
import { GUARD_HOOK_COMMAND, PROMPT_HOOK_COMMAND, STOP_HOOK_COMMAND } from '../src/host-settings.js';

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'octo-hk-'));
const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const hook = (root, script, args, input, env = {}) => spawnSync('node', [path.join(root, '.octo/bin', script), ...args], {
  cwd: root, input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, ...env },
});

function installed(options = {}) {
  const root = tempDir();
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
  const config = defaultConfig({ domains: [] });
  Object.assign(config, options);
  sync(root, config);
  fs.writeFileSync(path.join(root, 'octo.config.json'), JSON.stringify(config));
  return root;
}

test('hooks are installed for both hosts', () => {
  const root = installed();
  try {
    const claude = JSON.parse(read(root, '.claude/settings.json')).hooks;
    assert.equal(claude.PreToolUse[0].hooks[0].command, GUARD_HOOK_COMMAND);
    assert.match(claude.PreToolUse[0].matcher, /Bash/);
    assert.equal(claude.Stop[0].hooks[0].command, STOP_HOOK_COMMAND);
    const copilot = JSON.parse(read(root, '.github/hooks/octo.json'));
    assert.equal(copilot.version, 1);
    assert.match(copilot.hooks.preToolUse[0].bash, /octo-guard\.mjs pre-tool/);
    assert.match(copilot.hooks.sessionStart[0].powershell, /octo-session\.mjs hook session-start copilot/);
    assert.ok(fs.existsSync(path.join(root, '.octo/bin/octo-guard.mjs')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('the guard denies dangerous commands for Claude Code, VS Code and Copilot CLI input shapes', () => {
  const root = installed();
  try {
    const denied = [
      { tool_name: 'Bash', tool_input: { command: 'git push origin main --force' } },
      { tool_name: 'run_in_terminal', tool_input: { command: 'git reset HEAD~3 --hard' } },
      { toolName: 'bash', toolArgs: JSON.stringify({ command: 'npm test && git push -f' }) },
      { tool_name: 'Read', tool_input: { file_path: path.join(root, 'api', '.env') } },
    ];
    for (const input of denied) {
      const r = hook(root, 'octo-guard.mjs', ['pre-tool'], input);
      assert.equal(r.status, 2, JSON.stringify(input));
      assert.match(r.stderr, /Blocked by Octo guardrails/);
      assert.equal(JSON.parse(r.stdout).permissionDecision, 'deny');
      assert.equal(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, 'deny');
    }
    const allowed = [
      { tool_name: 'Bash', tool_input: { command: 'git push -u origin feature/x-octo' } },
      { tool_name: 'Bash', tool_input: { command: 'git commit -m "docs: never push --force"' } },
      { tool_name: 'Edit', tool_input: { file_path: 'src/app.js' } },
    ];
    for (const input of allowed) {
      const r = hook(root, 'octo-guard.mjs', ['pre-tool'], input);
      assert.equal(r.status, 0, JSON.stringify(input));
      assert.equal(r.stdout, '');
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Copilot session start gets a top-level additionalContext; Claude Code only its own shape', () => {
  const root = installed();
  const home = tempDir();
  try {
    const copilot = JSON.parse(hook(root, 'octo-session.mjs', ['hook', 'session-start', 'copilot'], {}, { OCTO_HOME: home }).stdout);
    assert.match(copilot.additionalContext, /no active session/);
    assert.equal(copilot.hookSpecificOutput.hookEventName, 'SessionStart');
    const claude = JSON.parse(hook(root, 'octo-session.mjs', ['hook', 'session-start'], {}, { OCTO_HOME: home }).stdout);
    assert.equal(claude.additionalContext, undefined);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('every prompt gets a preferences reminder until they are reviewed, then nothing', () => {
  const root = installed();
  const home = tempDir();
  try {
    const claude = JSON.parse(read(root, '.claude/settings.json')).hooks;
    assert.equal(claude.UserPromptSubmit[0].hooks[0].command, PROMPT_HOOK_COMMAND);
    const first = JSON.parse(hook(root, 'octo-session.mjs', ['hook', 'prompt'], { prompt: 'o que é isso?' }, { OCTO_HOME: home }).stdout);
    assert.equal(first.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
    assert.match(first.hookSpecificOutput.additionalContext, /octo-prefs/);
    const copilotHooks = JSON.parse(read(root, '.github/hooks/octo.json')).hooks;
    assert.match(copilotHooks.userPromptSubmitted[0].bash, /octo-session\.mjs hook prompt copilot/);
    const copilot = JSON.parse(hook(root, 'octo-session.mjs', ['hook', 'prompt', 'copilot'], {}, { OCTO_HOME: home }).stdout);
    assert.match(copilot.additionalContext, /octo-prefs/);
    const autoApprove = JSON.parse(read(root, '.vscode/settings.json'))['chat.tools.terminal.autoApprove'];
    assert.equal(Object.entries(autoApprove).find(([k]) => k.includes('octo-session') && k.includes('prefs'))?.[1], true);
    // Reviewed = a preferences file exists and none carries the unreviewed marker.
    fs.writeFileSync(path.join(home, 'preferences.md'), '# Preferências\n## Comunicação\n- Idioma: pt-BR\n');
    assert.equal(hook(root, 'octo-session.mjs', ['hook', 'prompt'], {}, { OCTO_HOME: home }).stdout, '');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('the stop hook keeps the agent going once when the finish phase has unpushed commits', () => {
  const root = installed({ autonomy: autonomyPreset('balanced') });
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  try {
    git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'base');
    git('switch', '-q', '-c', 'fix/x-octo');
    git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'fix');
    execFileSync('node', ['.octo/bin/octo-session.mjs', 'new', 'x'], { cwd: root });
    const [file] = fs.readdirSync(path.join(root, '.octo/sessions'));
    const sessionFile = path.join(root, '.octo/sessions', file);

    assert.equal(hook(root, 'octo-guard.mjs', ['stop'], {}).stdout, '', 'not in the finish phase yet: stop freely');
    fs.writeFileSync(sessionFile, fs.readFileSync(sessionFile, 'utf8').replace(/^phase: .*$/m, 'phase: finish'));
    const blocked = JSON.parse(hook(root, 'octo-guard.mjs', ['stop'], {}).stdout);
    assert.equal(blocked.decision, 'block');
    assert.match(blocked.reason, /never pushed/);
    assert.equal(hook(root, 'octo-guard.mjs', ['stop'], { stop_hook_active: true }).stdout, '', 'never loops');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
