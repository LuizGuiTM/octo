import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { autonomyPreset, defaultConfig, validateConfig } from '../src/config.js';
import { OPEN_PR_SCRIPT, claudeCodeSettings, copilotAutoApprove, effectiveCommands } from '../src/host-settings.js';
import { sync } from '../src/sync.js';
import { commandSkills } from '../src/sources.js';
import { parsePlan, checkWaves } from '../skills/core/octo-parallel-waves/scripts/check-waves.mjs';
import { parseRemote, prCommand } from '../skills/core/octo-autonomous-finish/scripts/open-pr.mjs';
import { globToRegExp } from '../skills/core/octo-autonomous-finish/scripts/pre-commit-check.mjs';

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'octo-sa-'));

test('autonomy presets are valid and the guardrails follow them', () => {
  for (const level of ['supervised', 'balanced', 'full']) {
    const config = defaultConfig();
    config.autonomy = autonomyPreset(level);
    assert.deepEqual(validateConfig(config), [], level);
  }
  const full = defaultConfig();
  full.autonomy = autonomyPreset('full');
  const cmds = effectiveCommands(full);
  // Raw `git push` is never pre-approved (prefix rules would also approve `git push origin main --force`):
  // pushing goes through open-pr.mjs, which can't force-push.
  assert.ok(cmds.ask.includes('git push'), 'raw git push still asks');
  assert.ok(!cmds.allow.includes('git push'));
  assert.ok(cmds.allow.includes(OPEN_PR_SCRIPT) && cmds.allow.includes('gh pr create') && cmds.allow.includes('az repos pr create'));
  assert.ok(cmds.deny.includes('git push --force'), 'force push stays denied');
  const claude = claudeCodeSettings(full).permissions;
  assert.ok(!claude.allow.some((r) => r.startsWith('Bash(git push')), 'no git push allow rule on Claude Code');
  assert.ok(claude.allow.includes(`Bash(${OPEN_PR_SCRIPT}:*)`));
  const approve = copilotAutoApprove(full);
  for (const variant of ['git push origin main --force', 'git push --force-with-lease', 'git push origin +main', 'git push -u origin x -f']) {
    const autoApproved = Object.entries(approve).some(([key, ok]) => ok && new RegExp(key.slice(1, -1)).test(variant));
    assert.ok(!autoApproved, `Copilot must not auto-approve: ${variant}`);
  }

  const balanced = defaultConfig();
  assert.ok(effectiveCommands(balanced).ask.includes('git push'), 'balanced still asks before pushing');
});

test('instructions block renders approvals and PR policy per preset', () => {
  const root = tempDir();
  try {
    const config = defaultConfig({ domains: [] });
    config.autonomy = autonomyPreset('full');
    sync(root, config);
    const claudeMd = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8');
    assert.match(claudeMd, /autonomy level: \*\*full\*\*/);
    assert.match(claudeMd, /Design \(spec or bounded in-chat design\): \*\*no approval wait\*\*\. This standing instruction/);
    assert.match(claudeMd, /Execution method: always \*\*subagent-driven with parallel waves\*\*/);
    assert.match(claudeMd, /Open a \*\*draft\*\* pull request after pushing, without asking/);
    assert.match(claudeMd, /open-pr\.mjs/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('check-waves catches cross-wave dependencies and shared files', () => {
  const plan = [
    '### T1: a', '- Wave: 1 · Depends on: none · Tier: fast', '- Files: `a.js`, `a.test.js`',
    '### T2: b', '- Wave: 1 · Depends on: T1 · Tier: standard', '- Files: `a.js`',
    '### T3: c', '- Wave: 2 · Depends on: T9 · Tier: huge', '- Files: `c.js`',
  ].join('\n');
  const { problems } = checkWaves(parsePlan(plan));
  assert.ok(problems.some((p) => p.includes('T2 (wave 1) depends on T1 (wave 1)')));
  assert.ok(problems.some((p) => p.includes('T1 and T2 both touch `a.js`')));
  assert.ok(problems.some((p) => p.includes('T3: depends on unknown task 9')));
  assert.ok(problems.some((p) => p.includes('T3: "Tier" must be one of')));
});

test('check-waves reads superpowers\' own task format, with waves from the task line or the Waves table', () => {
  const plan = [
    '| Wave | Tasks | Parallel-safe |', '|---|---|---|', '| 1 | Task 1, Task 2 | yes |', '',
    '### Task 1: Store', '**Tier:** fast', '', '**Files:**', '- Modify: `src/store.mjs:7-18`', '- Test: `test/store.test.mjs`', '',
    '### Task 2: Markup', '**Wave:** 1 · **Depends on:** none · **Tier:** fast', '', '**Files:**', '- Modify: `public/index.html`', '',
    '### Task 3: API', '**Wave:** 2 · **Depends on:** Task 1 · **Tier:** standard', '', '**Files:**', '- Modify: `src/store.mjs:40`', '',
  ].join('\n');
  const tasks = parsePlan(plan);
  assert.deepEqual(tasks.map((t) => [t.id, t.wave, t.tier]), [['Task 1', 1, 'fast'], ['Task 2', 1, 'fast'], ['Task 3', 2, 'standard']]);
  assert.deepEqual(tasks[0].files, ['src/store.mjs', 'test/store.test.mjs'], 'line ranges stripped');
  assert.deepEqual(checkWaves(tasks).problems, [], 'Task 3 shares src/store.mjs with Task 1 but runs in a later wave');
});

test('open-pr detects GitHub and Azure DevOps remotes and builds the commands', () => {
  assert.deepEqual(parseRemote('git@github.com:acme/app.git'), { provider: 'github', owner: 'acme', repo: 'app' });
  assert.deepEqual(parseRemote('https://acme@dev.azure.com/acme/Sales%20Web/_git/portal'),
    { provider: 'azure-devops', org: 'https://dev.azure.com/acme', project: 'Sales Web', repo: 'portal' });
  assert.equal(parseRemote('https://gitlab.com/a/b.git').provider, 'unknown');

  const dir = tempDir();
  try {
    const body = path.join(dir, 'body.md');
    fs.writeFileSync(body, 'PR body');
    const [gh, ghArgs] = prCommand(parseRemote('https://github.com/acme/app'), { branch: 'octo/x', base: 'main', title: 't', bodyFile: body, draft: true });
    assert.equal(gh, 'gh');
    assert.ok(ghArgs.includes('--draft') && ghArgs.includes('--body-file'));
    const [az, azArgs] = prCommand(parseRemote('https://dev.azure.com/acme/Sales/_git/portal'), { branch: 'octo/x', base: 'main', title: 't', bodyFile: body, draft: false });
    assert.equal(az, 'az');
    assert.deepEqual(azArgs.slice(0, 3), ['repos', 'pr', 'create']);
    assert.equal(azArgs[azArgs.indexOf('--description') + 1], `@${path.resolve(body)}`, 'Azure reads the body from a file');
    assert.equal(azArgs[azArgs.indexOf('--draft') + 1], 'false');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('pre-commit globs match protected paths', () => {
  assert.ok(globToRegExp('**/.env').test('.env'));
  assert.ok(globToRegExp('**/.env').test('api/.env'));
  assert.ok(!globToRegExp('**/.env').test('api/x.env'));
  assert.ok(globToRegExp('**/secrets/**').test('a/secrets/b/c.txt'));
});

test('chat commands are user-only and installed with the manual and preferences template', () => {
  const names = commandSkills().map((c) => c.name);
  for (const expected of ['octo-start', 'octo-plan', 'octo-run', 'octo-test-web', 'octo-done', 'octo-help', 'octo-prefs']) {
    assert.ok(names.includes(expected), expected);
  }
  const root = tempDir();
  try {
    sync(root, defaultConfig({ domains: [] }));
    const skill = fs.readFileSync(path.join(root, '.claude/skills/octo-start/SKILL.md'), 'utf8');
    assert.match(skill, /disable-model-invocation: true/);
    assert.ok(fs.existsSync(path.join(root, '.octo/MANUAL.md')));
    assert.ok(fs.existsSync(path.join(root, '.octo/templates/preferences.md')));
    assert.match(fs.readFileSync(path.join(root, '.gitignore'), 'utf8'), /^\.octo\/preferences\.local\.md$/m);
    for (const script of ['octo-parallel-waves/scripts/check-waves.mjs', 'octo-definition-of-done/scripts/check-dod.mjs',
      'octo-autonomous-finish/scripts/pre-commit-check.mjs', 'octo-autonomous-finish/scripts/open-pr.mjs', 'octo-web-testing/scripts/wait-for-url.mjs']) {
      assert.ok(fs.existsSync(path.join(root, '.claude/skills', script)), script);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('prefs CLI creates the global file under OCTO_HOME and the session script reads it', () => {
  const home = tempDir();
  const repo = tempDir();
  const cli = path.resolve('bin/octo.js');
  const env = { ...process.env, OCTO_HOME: home };
  try {
    execFileSync('git', ['init', '-q'], { cwd: repo });
    execFileSync('node', [cli, 'init', '--cwd', repo, '--domains', 'engineering'], { env, encoding: 'utf8' });
    const prefs = path.join(home, 'preferences.md');
    assert.ok(fs.existsSync(prefs), 'init creates the global preferences');
    const initial = fs.readFileSync(prefs, 'utf8');
    assert.match(initial, /Claude Code: deep = opus · standard = sonnet · fast = haiku/, 'pre-filled from the config');
    assert.match(initial, /Copilot: deep = Claude Opus 4\.5 → GPT-5\.2/);
    assert.match(initial, /Nível: balanced/);
    assert.doesNotMatch(initial, /\{\{|Como me chamar|Papel|Experiência/, 'only models, communication and autonomy');
    fs.writeFileSync(prefs, initial.replace(/^- Respostas:.*$/m, '- Respostas: detalhadas').replace(/^- Sempre perguntar antes de:.*$/m, '- Sempre perguntar antes de:'));
    const out = execFileSync('node', ['.octo/bin/octo-session.mjs', 'prefs'], { cwd: repo, env, encoding: 'utf8' });
    assert.match(out, /Respostas: detalhadas/);
    assert.doesNotMatch(out, /Sempre perguntar antes de/, 'emptied lines are dropped');
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
