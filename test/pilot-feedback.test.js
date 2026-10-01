// Regression tests for the feedback of the first real-repo pilot (Salesforce monorepo, functional analyst).
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { autonomyPreset, defaultConfig, validateConfig } from '../src/config.js';
import { effectiveCommands, OPEN_PR_SCRIPT } from '../src/host-settings.js';
import { sync } from '../src/sync.js';
import { packageVersion } from '../src/sources.js';

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'octo-pf-'));
const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const cli = path.resolve('bin/octo.js');

test('balanced (the default) ends in a draft PR through open-pr.mjs', () => {
  const config = defaultConfig();
  assert.equal(config.autonomy.level, 'balanced');
  assert.ok(config.autonomy.push && config.autonomy.pullRequest && config.autonomy.draftPullRequest);
  assert.ok(effectiveCommands(config).allow.includes(OPEN_PR_SCRIPT));
  assert.ok(effectiveCommands(config).ask.includes('git push'), 'raw git push still asks');
  assert.ok(!config.autonomy.askWhen.some((a) => /^an action is outward-facing \(push, PR/.test(a)), 'no longer asks before its own PR');
  assert.equal(autonomyPreset('supervised').pullRequest, false);
});

test('instructions: mandatory startup checks and proportional rigor by default', () => {
  const root = tempDir();
  try {
    const config = defaultConfig({ domains: ['salesforce'] });
    sync(root, config);
    const block = read(root, 'CLAUDE.md');
    assert.match(block, /## Before any implementation \(mandatory, once per session\)/);
    assert.match(block, /npx -y @luizguitm\/octo@latest doctor/);
    assert.match(block, /never let the host\s+fall back to another model silently/);
    assert.match(block, /## Rigor: proportional/);
    assert.match(block, /Test what changed, once/);
    assert.match(block, /RunSpecifiedTests/);
    config.rigor = 'strict';
    sync(root, config);
    assert.match(read(root, 'CLAUDE.md'), /## Rigor: strict/);
    config.rigor = 'relaxed';
    assert.ok(validateConfig(config).some((e) => e.startsWith('rigor must be one of')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('unreviewed preferences are flagged at session start until /octo-prefs reviews them', () => {
  const home = tempDir();
  const repo = tempDir();
  const env = { ...process.env, OCTO_HOME: home, OCTO_OFFLINE: '1' };
  try {
    execFileSync('git', ['init', '-q'], { cwd: repo });
    execFileSync('node', [cli, 'init', '--cwd', repo, '--domains', 'engineering'], { env });
    const prefs = () => execFileSync('node', ['.octo/bin/octo-session.mjs', 'prefs'], { cwd: repo, env, encoding: 'utf8' });
    assert.match(prefs(), /NOT been reviewed yet/);
    const file = path.join(home, 'preferences.md');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/^<!-- octo:unreviewed.*-->\r?\n/m, ''));
    assert.doesNotMatch(prefs(), /NOT been reviewed/);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('doctor reports an outdated install and missing PR tooling', () => {
  const home = tempDir();
  const repo = tempDir();
  const env = { ...process.env, OCTO_HOME: home, OCTO_OFFLINE: '1', PATH: process.env.PATH };
  try {
    execFileSync('git', ['init', '-q'], { cwd: repo });
    execFileSync('git', ['remote', 'add', 'origin', 'https://gitlab.com/acme/app.git'], { cwd: repo });
    execFileSync('node', [cli, 'init', '--cwd', repo, '--domains', 'engineering'], { env });
    const doctor = () => spawnSync('node', [cli, 'doctor', '--cwd', repo], { env, encoding: 'utf8' }).stdout;
    assert.match(doctor(), new RegExp(`✓ Octo ${packageVersion().replace(/\./g, '\\.')} is the latest`));
    assert.match(doctor(), /✗ pull requests: origin "https:\/\/gitlab\.com\/acme\/app\.git" is not GitHub or Azure DevOps/);

    const manifestFile = path.join(repo, '.octo/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    manifest.octo = '0.1.0';
    fs.writeFileSync(manifestFile, JSON.stringify(manifest));
    assert.match(doctor(), new RegExp(`✗ Octo update available: 0\\.1\\.0 → ${packageVersion().replace(/\./g, '\\.')}`));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('/octo-fix ends through octo-autonomous-finish (PR), not at the commit', () => {
  const fix = fs.readFileSync(path.resolve('commands/octo-fix/SKILL.md'), 'utf8');
  assert.match(fix, /finish with `octo-autonomous-finish`/);
  assert.match(fix, /Don't stop\s+at the commit/);
});

test('Azure DevOps repos get the official MCP server automatically, with the org from origin', () => {
  const home = tempDir();
  const repo = tempDir();
  const env = { ...process.env, OCTO_HOME: home, OCTO_OFFLINE: '1' };
  try {
    execFileSync('git', ['init', '-q'], { cwd: repo });
    execFileSync('git', ['remote', 'add', 'origin', 'https://vivo@dev.azure.com/vivo-org/Vendas/_git/crm'], { cwd: repo });
    execFileSync('node', [cli, 'init', '--cwd', repo, '--domains', 'salesforce'], { env });
    const config = JSON.parse(read(repo, 'octo.config.json'));
    assert.deepEqual(config.mcp.enable, ['azure-devops']);
    const copilotMcp = JSON.parse(read(repo, '.vscode/mcp.json')).servers['azure-devops'];
    assert.deepEqual(copilotMcp, { type: 'http', url: 'https://mcp.dev.azure.com/vivo-org' });
    assert.ok(fs.existsSync(path.join(repo, '.claude/skills/octo-mcp-azure-devops/SKILL.md')));
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('enabling azure-devops without an Azure origin or org fails with a clear message', () => {
  const root = tempDir();
  try {
    const config = defaultConfig({ domains: [] });
    config.mcp.enable = ['azure-devops'];
    assert.throws(() => sync(root, config), /needs the Azure DevOps organization: set "mcp\.azureDevOpsOrg"/);
    config.mcp.azureDevOpsOrg = 'acme';
    sync(root, config);
    assert.equal(JSON.parse(read(root, '.mcp.json')).mcpServers['azure-devops'].url, 'https://mcp.dev.azure.com/acme');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('open-pr falls back to a one-click PR link', async () => {
  const { parseRemote, prLink } = await import('../skills/core/octo-autonomous-finish/scripts/open-pr.mjs');
  assert.equal(prLink(parseRemote('https://acme@dev.azure.com/acme/Vendas%20Web/_git/crm'), { branch: 'fix/x-octo', base: 'develop' }),
    'https://dev.azure.com/acme/Vendas%20Web/_git/crm/pullrequestcreate?sourceRef=fix%2Fx-octo&targetRef=develop');
  assert.equal(prLink(parseRemote('git@github.com:acme/app.git'), { branch: 'feature/y-octo', base: 'main' }),
    'https://github.com/acme/app/compare/main...feature%2Fy-octo?expand=1');
});

test('Copilot agents only pin models once confirmed; /octo is the plain-language entry point', () => {
  const root = tempDir();
  try {
    const config = defaultConfig({ domains: [] });
    sync(root, config);
    assert.doesNotMatch(read(root, '.github/agents/octo-worker-deep.agent.md'), /^model:/m);
    assert.match(read(root, '.github/copilot-instructions.md'), /agents are \*\*not pinned\*\*/);
    config.models.copilot.pin = true;
    sync(root, config);
    assert.match(read(root, '.github/agents/octo-worker-deep.agent.md'), /^model: Claude Opus 4\.5$/m);
    assert.ok(fs.existsSync(path.join(root, '.claude/skills/octo/SKILL.md')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('quick AI-context bootstrap is bounded (no full-repo survey)', () => {
  const skill = fs.readFileSync(path.resolve('skills/core/octo-ai-context/SKILL.md'), 'utf8');
  assert.match(skill, /Quick bootstrap \(≈ 10 minutes/);
  assert.match(skill, /At most \*\*3\*\* `octo-explorer`/);
  assert.match(skill, /Not yet documented/);
  assert.match(read(path.resolve('.'), 'templates/AGENTS.md'), /## Not yet documented/);
});
