import { spawnSync } from 'node:child_process';
import readline from 'node:readline';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  AUTONOMY_PRESETS, CONFIG_FILE, TARGETS, autonomyPreset, branchPattern, configPath, defaultConfig, detectDomains, loadConfig,
  validateConfig,
  writeConfig,
} from './config.js';
import { renderPreferences, resolveSkills, sync } from './sync.js';
import { detectAzureDevOpsOrg } from './mcp.js';
import { teamSetup } from './setup.js';
import { commandSkills, domainNames, packageVersion } from './sources.js';

const HELP = `octo — company layer on top of superpowers, for Claude Code and GitHub Copilot

Usage:
  octo init [--targets claude-code,copilot] [--domains web,salesforce,python] [--local] [--yes] [--force]
      Create ${CONFIG_FILE} (domains auto-detected), ask the team questions (versioning, web testing, branch
      names; --yes keeps the defaults) and run sync. --local: git-ignore the generated files.
  octo setup
      Ask the team questions again for an installed repo, then sync.
  octo sync
      Install superpowers + Octo skills, agents, instructions and catalog from ${CONFIG_FILE}.
  octo doctor
      Validate the config and report what is installed.
  octo config upgrade
      Add options introduced by newer Octo versions (with defaults) to ${CONFIG_FILE}.
  octo skills list [--all]
      List native skills and the domain catalog (--all: every domain).
  octo skills promote <name>
      Make a domain skill native (always visible to the host) and sync.
  octo prefs init [--local]
      Create your personal preferences file (~/.octo/preferences.md, or .octo/preferences.local.md).
  octo prefs path
      Show where your preferences files are and whether they exist.
  octo untrack
      With framework.commit = false: stop versioning the Octo files git still tracks (git rm --cached;
      the files stay on disk). Then commit.
  octo autonomy [supervised|balanced|full]
      Show or set the autonomy preset (approvals, commit, push, pull request, when to ask) and sync.

In chat (Claude Code and Copilot): /octo-help lists the /octo-* commands.

Options:
  --cwd <dir>   Run against another repository (default: current directory).
`;

export async function main(argv) {
  const { positional, flags } = parseArgs(argv);
  const root = path.resolve(flags.cwd ?? process.cwd());
  const [command, sub, arg] = positional;

  switch (command) {
    case 'init':
      return init(root, flags);
    case 'setup':
      return setup(root);
    case 'sync':
      return runSync(root, loadConfig(root));
    case 'doctor':
      return doctor(root);
    case 'config':
      if (sub === 'upgrade') return upgradeConfig(root);
      break;
    case 'skills':
      if (sub === 'list') return listSkills(root, flags);
      if (sub === 'promote') return promote(root, arg);
      break;
    case 'prefs':
      if (sub === 'init') return prefsInit(root, flags);
      if (sub === 'path') return prefsPath(root);
      break;
    case 'autonomy':
      return setAutonomy(root, sub);
    case 'untrack':
      return untrack(root);
    case undefined:
    case 'help':
    case '--help':
      console.log(HELP);
      return 0;
  }
  console.error(HELP);
  return 1;
}

const BOOLEAN_FLAGS = ['force', 'all', 'local', 'yes'];

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const [key, inline] = token.slice(2).split('=');
    const next = argv[i + 1];
    if (inline !== undefined) flags[key] = inline;
    else if (next !== undefined && !next.startsWith('--') && !BOOLEAN_FLAGS.includes(key)) flags[key] = argv[++i];
    else flags[key] = true;
  }
  return { positional, flags };
}

function csv(value) {
  return typeof value === 'string' ? value.split(',').map((v) => v.trim()).filter(Boolean) : undefined;
}

async function init(root, flags) {
  if (fs.existsSync(configPath(root)) && !flags.force) {
    console.log(`${CONFIG_FILE} already exists; running sync (use --force to recreate it).`);
    return runSync(root, loadConfig(root));
  }
  const domains = csv(flags.domains) ?? detectDomains(root);
  const targets = csv(flags.targets) ?? TARGETS;
  const config = defaultConfig({ domains, targets });
  if (flags.local) config.framework.commit = false; // git-ignore the generated files
  if (process.stdin.isTTY && !flags.yes) await withPrompt((ask) => teamSetup(config, ask));
  // Azure DevOps repos get Microsoft's MCP server: PRs and work items with the Microsoft sign-in, no az CLI.
  if (detectAzureDevOpsOrg(root)) config.mcp.enable = [...new Set([...config.mcp.enable, 'azure-devops'])];
  const errors = validateConfig(config);
  if (errors.length) throw new Error(errors.join('\n'));
  writeConfig(root, config);
  console.log(`Created ${CONFIG_FILE} (targets: ${targets.join(', ')}; domains: ${domains.join(', ') || 'none'}).`);
  console.log('Review "models" to match the models your company allows, then re-run "octo sync" if you change it.');
  runSync(root, config);
  const prefs = preferencesPaths(root).global;
  if (!fs.existsSync(prefs)) {
    prefsInit(root, {});
  }
  console.log('Next: open the repo in Claude Code or Copilot and type /octo followed by what you need, in plain language (manual: .octo/MANUAL.md).');
  return 0;
}

async function setup(root) {
  const config = loadConfig(root);
  await withPrompt((ask) => teamSetup(config, ask));
  const errors = validateConfig(config);
  if (errors.length) throw new Error(errors.join('\n'));
  writeConfig(root, config);
  console.log(`Updated ${CONFIG_FILE}.`);
  return runSync(root, config);
}

async function withPrompt(fn) {
  // Buffer lines ourselves: rl.question drops answers that arrive early (piped input). End of input = ENTER.
  const rl = readline.createInterface({ input: process.stdin });
  const lines = [];
  const waiting = [];
  let closed = false;
  rl.on('line', (line) => (waiting.length ? waiting.shift()(line) : lines.push(line)));
  rl.on('close', () => {
    closed = true;
    while (waiting.length) waiting.shift()('');
  });
  const ask = (question) => {
    process.stdout.write(question);
    if (lines.length) return Promise.resolve(lines.shift());
    if (closed) return Promise.resolve('');
    return new Promise((resolve) => waiting.push(resolve));
  };
  try {
    console.log('A few team settings (ENTER keeps the suggested value):');
    return await fn(ask);
  } finally {
    rl.close();
  }
}

function runSync(root, config) {
  const r = sync(root, config);
  console.log(`Synced ${r.written} files (${r.removed} stale removed).`);
  console.log(`  superpowers ${r.upstreamVersion}: ${r.upstreamSkills} skills  octo native: ${r.coreSkills}  domain catalog: ${r.catalogSkills} [${r.domains.join(', ')}]  agents: ${r.agents} x ${config.targets.length} host(s)`);
  if (r.mcpServers.length) console.log(`  MCP servers: ${r.mcpServers.join(', ')}`);
  const missing = Object.keys(defaultConfig()).filter((key) => !(key in config));
  if (missing.length) {
    console.log(`  New options not in your ${CONFIG_FILE}: ${missing.join(', ')} (not applied).`);
    console.log('  Run "octo config upgrade" to add them with their defaults.');
  }
  for (const conflict of r.conflicts) console.log(`  ! ${conflict}`);
  if (r.skippedShared.length) {
    console.log(`  ! Versioned files left without Octo's entries (framework.commit = false): ${r.skippedShared.join(', ')}.`);
    console.log('    Copilot terminal auto-approval and/or MCP servers from these files are off; add them to your VS Code user settings if you need them.');
  }
  if (r.trackedOwned.length) {
    console.log(`  ! ${r.trackedOwned.length} Octo files are still versioned in git. Run "octo untrack", then commit (chore: stop versioning Octo files).`);
  }
  if (r.createdAgentsMd) {
    console.log('  AGENTS.md scaffolded. Next: ask your agent to run the octo-ai-context skill to fill it in.');
  }
  return 0;
}

function doctor(root) {
  const file = configPath(root);
  if (!fs.existsSync(file)) {
    console.log(`✗ ${CONFIG_FILE} not found. Run "octo init".`);
    return 1;
  }
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = validateConfig(config);
  const checks = [
    [errors.length === 0, errors.length ? `config errors:\n    - ${errors.join('\n    - ')}` : 'config is valid'],
    [fs.existsSync(path.join(root, '.octo/manifest.json')), 'octo sync has run'],
    [fs.existsSync(path.join(root, '.claude/skills/using-superpowers/SKILL.md')), 'superpowers skills installed'],
    [fs.existsSync(path.join(root, 'AGENTS.md')), 'AGENTS.md exists'],
    [!/octo:needs-context/.test(readText(path.join(root, 'AGENTS.md'))), 'AGENTS.md has been filled in (optional: the agent does a quick map on the first task, or run /octo-context)', true],
  ];
  if (config.framework?.commit === false) {
    if (config.targets?.includes('claude-code')) checks.push([fs.existsSync(path.join(root, '.claude/rules/octo.md')), 'Claude Code instructions (.claude/rules/octo.md, git-ignored)']);
    if (config.targets?.includes('copilot')) checks.push([fs.existsSync(path.join(root, '.github/instructions/octo.instructions.md')), 'Copilot instructions (.github/instructions/octo.instructions.md, git-ignored)']);
  } else {
    if (config.targets?.includes('claude-code')) checks.push([/octo:begin/.test(readText(path.join(root, 'CLAUDE.md'))), 'CLAUDE.md has the octo block']);
    if (config.targets?.includes('copilot')) checks.push([/octo:begin/.test(readText(path.join(root, '.github/copilot-instructions.md'))), 'copilot-instructions.md has the octo block']);
  }
  checks.push(versionCheck(root));
  if (config.autonomy?.pullRequest) checks.push(pullRequestCheck(root));
  // Optional items never fail the doctor: they're shown as recommendations (○), not errors.
  for (const [ok, label, optional] of checks) console.log(`${ok ? '✓' : optional ? '○' : '✗'} ${label}`);
  return checks.every(([ok, , optional]) => ok || optional) ? 0 : 1;
}

const WINDOWS = process.platform === 'win32';
const quiet = (cmd, args, timeout = 10000) => spawnSync(cmd, args, { encoding: 'utf8', timeout, shell: WINDOWS, stdio: ['ignore', 'pipe', 'pipe'] });
const newer = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
};

// Is the repo synced with the newest Octo? (installed = manifest; latest = npm, or this CLI when offline)
function versionCheck(root) {
  const manifest = JSON.parse(readText(path.join(root, '.octo/manifest.json')) || '{}');
  const installed = manifest.octo ?? '0.2.0 or older';
  const npm = process.env.OCTO_OFFLINE ? { status: 1 } : quiet('npm', ['view', '@luizguitm/octo', 'version']);
  const latest = [packageVersion(), npm.status === 0 ? npm.stdout.trim() : null].filter(Boolean).reduce((a, b) => (newer(b, a) ? b : a));
  const upToDate = manifest.octo && !newer(latest, manifest.octo);
  return [upToDate, upToDate
    ? `Octo ${installed} is the latest${npm.status === 0 ? '' : ' (npm not reachable; compared with this CLI)'}`
    : `Octo update available: ${installed} → ${latest}. Run: npx -y @luizguitm/octo@latest sync`];
}

// The policy opens PRs: is the provider's CLI installed and signed in?
function pullRequestCheck(root) {
  const remote = quiet('git', ['-C', root, 'remote', 'get-url', 'origin']);
  const url = remote.status === 0 ? remote.stdout.trim() : '';
  if (/github\.com/.test(url)) {
    const auth = quiet('gh', ['auth', 'status']);
    return [auth.status === 0, auth.status === 0 ? 'pull requests: gh is signed in (GitHub)'
      : 'pull requests (optional): with the gh CLI signed in, PRs open automatically (https://cli.github.com, then gh auth login). Without it, the agent gives a one-click PR link', true];
  }
  if (/dev\.azure\.com|visualstudio\.com/.test(url)) {
    const account = quiet('az', ['account', 'show']);
    const extension = quiet('az', ['extension', 'show', '--name', 'azure-devops']);
    const ok = (account.status === 0 || Boolean(process.env.AZURE_DEVOPS_EXT_PAT)) && extension.status === 0;
    return [ok, ok ? 'pull requests: az + azure-devops extension ready (Azure DevOps)'
      : 'pull requests (optional): with the az CLI (https://aka.ms/azure-cli, az extension add --name azure-devops, az login) PRs open automatically. Without it, the agent uses the Azure DevOps MCP or a one-click PR link', true];
  }
  return [false, `pull requests: origin ${url ? `"${url}" is not GitHub or Azure DevOps` : 'is not set'}; PRs can't be opened automatically`];
}

function untrack(root) {
  const config = loadConfig(root);
  if (config.framework?.commit !== false) {
    console.log('framework.commit is not false in ' + CONFIG_FILE + ': Octo files are meant to be versioned here. Nothing to do.');
    return 1;
  }
  const manifest = JSON.parse(readText(path.join(root, '.octo/manifest.json')) || '{}');
  const candidates = [...(manifest.files ?? []), ...(manifest.localShared ?? []), '.octo/manifest.json'].map((f) => f.split(path.sep).join('/'));
  const listed = spawnSync('git', ['-C', root, 'ls-files', '-z', '--', ...new Set(candidates.map((f) => f.split('/')[0]))], { encoding: 'utf8' });
  const tracked = new Set(listed.stdout.split('\0').filter(Boolean));
  const files = candidates.filter((f) => tracked.has(f));
  if (!files.length) {
    console.log('No Octo files are versioned. Nothing to do.');
    return 0;
  }
  const r = spawnSync('git', ['-C', root, 'rm', '--cached', '--quiet', '--pathspec-from-file=-'], { input: files.join('\n'), encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(r.stderr);
    return 1;
  }
  console.log(`Stopped versioning ${files.length} Octo files (they stay on disk). Commit: git commit -m "chore: stop versioning Octo files"`);
  return 0;
}

function readText(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function listSkills(root, flags) {
  const config = fs.existsSync(configPath(root)) ? loadConfig(root) : defaultConfig();
  const effective = flags.all ? { ...config, domains: domainNames() } : config;
  const { upstream, core, catalog, promoted, instructions } = resolveSkills(effective);
  console.log(`Superpowers (native, untouched): ${upstream.map((s) => s.name).join(', ')}`);
  console.log(`\nOcto native: ${[...core, ...promoted].map((s) => s.name).join(', ')}`);
  console.log(`\nChat commands: ${commandSkills().map((c) => `/${c.name}`).join(', ')}`);
  console.log('\nDomain catalog (discovered on demand), by domain / technology:');
  const items = [
    ...catalog.map((s) => ({ ...s, label: `${s.name}  → complements ${s.complements.join(', ')}` })),
    ...instructions.map((i) => ({ ...i, label: `${i.file}  (applyTo ${i.applyTo})` })),
  ].sort((a, b) => `${a.domain}/${a.tech}`.localeCompare(`${b.domain}/${b.tech}`));
  let last = '';
  for (const item of items) {
    const group = `${item.domain} / ${item.tech}`;
    if (group !== last) console.log(`  ${group}`);
    last = group;
    console.log(`    ${item.label}${item.source === 'awesome-copilot' ? '  [awesome-copilot]' : ''}`);
  }
  return 0;
}

// Personal preferences: global per person, optional per-repo override (git-ignored). Never overwritten.
export function preferencesPaths(root) {
  return {
    global: path.join(process.env.OCTO_HOME ?? path.join(os.homedir(), '.octo'), 'preferences.md'),
    local: path.join(root, '.octo', 'preferences.local.md'),
  };
}

function prefsInit(root, flags) {
  const file = preferencesPaths(root)[flags.local ? 'local' : 'global'];
  if (fs.existsSync(file)) {
    console.log(`Already exists: ${file}`);
    return 0;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const config = fs.existsSync(configPath(root)) ? loadConfig(root) : defaultConfig();
  fs.writeFileSync(file, renderPreferences(config));
  console.log(`Created ${file} with the team defaults (models per tier, language, autonomy). Adjust it, or run /octo-prefs in chat.`);
  return 0;
}

function prefsPath(root) {
  for (const [scope, file] of Object.entries(preferencesPaths(root))) {
    console.log(`${scope.padEnd(6)} ${fs.existsSync(file) ? '✓' : '✗'} ${file}`);
  }
  return 0;
}

function describeAutonomy(a) {
  const yes = (v) => (v ? 'yes' : 'no');
  return [
    `level: ${a.level ?? 'custom'}`,
    `  wait for spec approval: ${yes(a.approvals?.spec !== false)} · wait for plan review: ${yes(a.approvals?.plan === true)}`,
    `  commit: ${yes(a.commit)} · push: ${yes(a.push)} · pull request: ${yes(a.pullRequest)}${a.pullRequest && a.draftPullRequest ? ' (draft)' : ''}`,
    `  asks only when: ${(a.askWhen ?? []).length} situations (see octo.config.json)`,
  ].join('\n');
}

function setAutonomy(root, level) {
  const config = loadConfig(root);
  if (!level) {
    console.log(describeAutonomy(config.autonomy ?? {}));
    return 0;
  }
  if (!AUTONOMY_PRESETS.includes(level)) throw new Error(`unknown autonomy level "${level}" (expected: ${AUTONOMY_PRESETS.join(', ')})`);
  const current = config.autonomy ?? {};
  config.autonomy = {
    ...autonomyPreset(level),
    protectedBranches: current.protectedBranches ?? autonomyPreset(level).protectedBranches,
    branchPattern: branchPattern(current),
  };
  runSync(root, config);
  writeConfig(root, config);
  console.log(describeAutonomy(config.autonomy));
  if (config.autonomy.pullRequest) {
    console.log('  Pull requests need the provider CLI, authenticated: GitHub → gh auth login · Azure DevOps → az login + az extension add --name azure-devops');
  }
  return 0;
}

// Adds top-level options introduced by newer framework versions; never changes existing values.
function upgradeConfig(root) {
  const config = loadConfig(root);
  const defaults = defaultConfig({ domains: config.domains, targets: config.targets });
  const added = Object.keys(defaults).filter((key) => !(key in config));
  if (!added.length) {
    console.log(`${CONFIG_FILE} already has every option.`);
    return 0;
  }
  const upgraded = { ...config };
  for (const key of added) upgraded[key] = defaults[key];
  runSync(root, upgraded);
  writeConfig(root, upgraded);
  console.log(`Added to ${CONFIG_FILE}: ${added.join(', ')}. Review them.`);
  return 0;
}

function promote(root, name) {
  if (!name) throw new Error('Usage: octo skills promote <name>');
  const config = loadConfig(root);
  config.skills = { ...(config.skills ?? {}), promoted: [...new Set([...(config.skills?.promoted ?? []), name])] };
  runSync(root, config);
  writeConfig(root, config);
  return 0;
}
