import fs from 'node:fs';
import path from 'node:path';
import {
  CONFIG_FILE, TARGETS, configPath, defaultConfig, detectDomains, loadConfig, validateConfig, writeConfig,
} from './config.js';
import { resolveSkills, sync } from './sync.js';
import { domainNames } from './sources.js';

const HELP = `octo — company layer on top of superpowers, for Claude Code and GitHub Copilot

Usage:
  octo init [--targets claude-code,copilot] [--domains web,salesforce,python] [--force]
      Create ${CONFIG_FILE} (domains auto-detected) and run sync.
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
    case undefined:
    case 'help':
    case '--help':
      console.log(HELP);
      return 0;
  }
  console.error(HELP);
  return 1;
}

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
    else if (next !== undefined && !next.startsWith('--') && key !== 'force' && key !== 'all') flags[key] = argv[++i];
    else flags[key] = true;
  }
  return { positional, flags };
}

function csv(value) {
  return typeof value === 'string' ? value.split(',').map((v) => v.trim()).filter(Boolean) : undefined;
}

function init(root, flags) {
  if (fs.existsSync(configPath(root)) && !flags.force) {
    console.log(`${CONFIG_FILE} already exists; running sync (use --force to recreate it).`);
    return runSync(root, loadConfig(root));
  }
  const domains = csv(flags.domains) ?? detectDomains(root);
  const targets = csv(flags.targets) ?? TARGETS;
  const config = defaultConfig({ domains, targets });
  const errors = validateConfig(config);
  if (errors.length) throw new Error(errors.join('\n'));
  writeConfig(root, config);
  console.log(`Created ${CONFIG_FILE} (targets: ${targets.join(', ')}; domains: ${domains.join(', ') || 'none'}).`);
  console.log('Review "models" to match the models your company allows, then re-run "octo sync" if you change it.');
  return runSync(root, config);
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
    [!/octo:needs-context/.test(readText(path.join(root, 'AGENTS.md'))), 'AGENTS.md has been filled in (octo-ai-context)'],
  ];
  if (config.targets?.includes('claude-code')) checks.push([/octo:begin/.test(readText(path.join(root, 'CLAUDE.md'))), 'CLAUDE.md has the octo block']);
  if (config.targets?.includes('copilot')) checks.push([/octo:begin/.test(readText(path.join(root, '.github/copilot-instructions.md'))), 'copilot-instructions.md has the octo block']);
  for (const [ok, label] of checks) console.log(`${ok ? '✓' : '✗'} ${label}`);
  return checks.every(([ok]) => ok) ? 0 : 1;
}

function readText(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function listSkills(root, flags) {
  const config = fs.existsSync(configPath(root)) ? loadConfig(root) : defaultConfig();
  const effective = flags.all ? { ...config, domains: domainNames() } : config;
  const { upstream, core, catalog, promoted } = resolveSkills(effective);
  console.log(`Superpowers (native, untouched): ${upstream.map((s) => s.name).join(', ')}`);
  console.log(`\nOcto native: ${[...core, ...promoted].map((s) => s.name).join(', ')}`);
  console.log('\nDomain catalog (discovered on demand):');
  for (const s of catalog) console.log(`  ${s.domain}/${s.name}  → complements ${s.complements.join(', ')}`);
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
