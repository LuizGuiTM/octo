import fs from 'node:fs';
import path from 'node:path';
import { adapters, templateVars } from './adapters.js';
import {
  PACKAGE_ROOT, agents, coreSkills, domainNames, domainSkills, render, schemaFile, template, upstreamInfo, upstreamSkills,
} from './sources.js';
import { readIfExists, removeManagedBlock, toPosix, upsertManagedBlock, writeFile } from './fs-utils.js';
import { EVIDENCE_DIR, mcpSummary, resolveMcp, serversForHost } from './mcp.js';
import { claudeCodeSettings, copilotAutoApprove, guardrailsText } from './host-settings.js';
import { syncHooks, syncListEntries, syncMapEntries } from './managed-json.js';

export const MANIFEST = '.octo/manifest.json';
const SKILLS_DIR = '.claude/skills';
const CATALOG_DIR = '.octo/catalog';

export function resolveSkills(config) {
  const upstream = upstreamSkills(config.upstream?.exclude ?? []);
  const upstreamNames = new Set(upstreamSkills().map((s) => s.name));
  const core = coreSkills();
  const domains = (config.domains ?? []).filter((d) => domainNames().includes(d));
  const catalog = domainSkills(domains);

  const promotedNames = new Set(config.skills?.promoted ?? []);
  const unknown = [...promotedNames].filter((name) => !catalog.some((s) => s.name === name));
  if (unknown.length) throw new Error(`skills.promoted lists skills not in the enabled domains: ${unknown.join(', ')}`);

  const mcpSkills = Object.values(resolveMcp(config)).map((def) => def.skill).filter(Boolean);
  for (const skill of [...core, ...catalog, ...mcpSkills]) {
    if (upstreamNames.has(skill.name)) throw new Error(`Octo skill "${skill.name}" collides with a superpowers skill name`);
    const bad = skill.complements.filter((name) => !upstreamNames.has(name));
    if (bad.length) throw new Error(`Skill "${skill.name}" complements unknown superpowers skills: ${bad.join(', ')}`);
  }

  const promoted = catalog.filter((s) => promotedNames.has(s.name));
  return { upstream, core, catalog, promoted, domains, mcpSkills };
}

export function sync(root, config) {
  const owned = new Map(); // relative path -> content
  const own = (rel, content) => owned.set(toPosix(rel), content);
  const { upstream, core, catalog, promoted, domains, mcpSkills } = resolveSkills(config);
  const info = upstreamInfo();
  const mcp = resolveMcp(config);
  const previous = readManifest(root);
  const conflicts = [];

  // Native skills: superpowers verbatim + Octo core + promoted domain skills + MCP usage skills.
  for (const skill of [...upstream, ...core, ...promoted, ...mcpSkills]) {
    for (const file of skill.files) {
      own(path.join(SKILLS_DIR, skill.name, path.relative(skill.dir, file)), fs.readFileSync(file));
    }
  }
  own('.octo/licenses/superpowers-LICENSE', fs.readFileSync(info.license));

  // Domain catalog, loaded on demand through octo-discovering-skills.
  for (const skill of catalog) {
    for (const file of skill.files) {
      own(path.join(CATALOG_DIR, skill.domain, skill.name, path.relative(skill.dir, file)), fs.readFileSync(file));
    }
  }
  own(path.join(CATALOG_DIR, 'INDEX.md'), catalogIndex(upstream, catalog, new Set(promoted.map((s) => s.name))));
  own('.octo/octo.config.schema.json', fs.readFileSync(schemaFile()));

  // Session continuity runtime.
  own('.octo/bin/octo-session.mjs', fs.readFileSync(path.join(PACKAGE_ROOT, 'runtime', 'octo-session.mjs')));
  own('.octo/templates/session.md', template('session.md'));
  if (!config.sessions?.commit) ensureGitignored(root, '.octo/sessions/', 'octo: session files are local (sessions.commit = false)');

  const extra = {
    upstreamVersion: info.version,
    domains: domains.length ? domains.map((d) => `\`${d}\``).join(', ') : 'none',
    complementsTable: complementsTable(upstream, [...core, ...promoted, ...mcpSkills], catalog.filter((s) => !promoted.includes(s))),
    guardrails: guardrailsText(config),
    sessionsCommit: config.sessions?.commit ? 'committed with the feature branch' : 'local only (git-ignored)',
  };
  const agentDefs = agents();
  const bootstrap = template('bootstrap.md');
  const managed = {};
  for (const target of Object.keys(adapters)) {
    const active = config.targets.includes(target);
    const adapter = adapters[target];
    const before = previous.managed?.[target] ?? {};
    const hostServers = active ? serversForHost(mcp, target) : {};
    if (active) {
      const vars = templateVars(config, target, { ...extra, mcpServers: mcpSummary(mcp, target) });
      for (const agent of agentDefs) {
        own(adapter.agentPath(agent), adapter.agentFile(agent, config, render(agent.body, vars)));
      }
      upsertManagedBlock(path.join(root, adapter.instructionsFile), adapter.instructionsPrefix + render(bootstrap, vars));
    } else {
      removeManagedBlock(path.join(root, adapter.instructionsFile));
    }
    const after = {
      mcp: syncMapEntries(root, adapter.mcp.file, adapter.mcp.rootKey, hostServers, before.mcp, conflicts),
    };
    if (target === 'claude-code') {
      const settings = active ? claudeCodeSettings(config) : { permissions: { deny: [], ask: [], allow: [] }, hooks: [] };
      for (const kind of ['deny', 'ask', 'allow']) {
        after[kind] = syncListEntries(root, '.claude/settings.json', ['permissions', kind], settings.permissions[kind], before[kind]);
      }
      after.hooks = syncHooks(root, '.claude/settings.json', settings.hooks, before.hooks);
    } else {
      after.autoApprove = syncMapEntries(root, '.vscode/settings.json', 'chat.tools.terminal.autoApprove',
        active ? copilotAutoApprove(config) : {}, before.autoApprove, conflicts);
    }
    managed[target] = after;
  }
  if (mcp.playwright) ensureGitignored(root, `${EVIDENCE_DIR}/`, 'octo: raw browser screenshots (curated ones live in the DoD folder)');

  // AI docs come first: scaffold AGENTS.md once, never overwrite it.
  const agentsMd = path.join(root, 'AGENTS.md');
  const createdAgentsMd = !fs.existsSync(agentsMd);
  if (createdAgentsMd) writeFile(agentsMd, template('AGENTS.md'));

  for (const [rel, content] of owned) writeFile(path.join(root, rel), content);
  const stale = (previous.files ?? []).filter((rel) => !owned.has(rel));
  for (const rel of stale) fs.rmSync(path.join(root, rel), { force: true });
  pruneEmptyDirs(root, stale);
  const manifest = { superpowers: info.commit, files: [...owned.keys()].sort(), managed };
  writeFile(path.join(root, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);

  return {
    written: owned.size,
    removed: stale.length,
    upstreamSkills: upstream.length,
    upstreamVersion: info.version,
    coreSkills: core.length + promoted.length + mcpSkills.length,
    catalogSkills: catalog.length,
    domains,
    agents: agentDefs.length,
    mcpServers: Object.keys(mcp).filter((name) => config.targets.some((t) => !mcp[name].hosts || mcp[name].hosts.includes(t))),
    conflicts,
    createdAgentsMd,
  };
}

function ensureGitignored(root, entry, comment) {
  const file = path.join(root, '.gitignore');
  const existing = readIfExists(file) ?? '';
  if (existing.split(/\r?\n/).includes(entry)) return;
  const prefix = existing.trim() ? `${existing.replace(/\s*$/, '')}\n` : '';
  writeFile(file, `${prefix}# ${comment}\n${entry}\n`);
}

function readManifest(root) {
  const raw = readIfExists(path.join(root, MANIFEST));
  return raw ? JSON.parse(raw) : {};
}

function pruneEmptyDirs(root, removed) {
  const dirs = new Set(removed.map((rel) => path.dirname(path.join(root, rel))));
  for (const dir of [...dirs].sort((a, b) => b.length - a.length)) {
    let current = dir;
    while (current.startsWith(root) && current !== root && fs.existsSync(current) && fs.readdirSync(current).length === 0) {
      fs.rmdirSync(current);
      current = path.dirname(current);
    }
  }
}

const code = (s) => `\`${s}\``;
const complementsOf = (skills, name) => skills.filter((s) => s.complements.includes(name));

// Compact table for the always-loaded instructions block.
export function complementsTable(upstream, native, catalog) {
  const rows = upstream
    .map((u) => {
      const n = complementsOf(native, u.name).map((s) => code(s.name));
      const c = complementsOf(catalog, u.name).map((s) => `${s.domain}/${s.name}`);
      return n.length || c.length ? `| ${code(u.name)} | ${n.join(', ') || '–'} | ${c.join(', ') || '–'} |` : null;
    })
    .filter(Boolean);
  return ['| Superpowers skill | Also load (native) | Domain skills (catalog) |', '|---|---|---|', ...rows].join('\n');
}

export function catalogIndex(upstream, catalog, promoted = new Set()) {
  const location = (s) => (promoted.has(s.name) ? 'native (promoted)' : code(`.octo/catalog/${s.domain}/${s.name}/SKILL.md`));
  const bySkill = upstream
    .map((u) => {
      const matches = complementsOf(catalog, u.name);
      return matches.length ? `| ${code(u.name)} | ${matches.map((s) => `${s.domain}/${s.name}`).join(', ')} |` : null;
    })
    .filter(Boolean)
    .join('\n');
  const domains = [...new Set(catalog.map((s) => s.domain))];
  const byDomain = domains
    .map((domain) => {
      const rows = catalog
        .filter((s) => s.domain === domain)
        .map((s) => `| ${code(s.name)} | ${s.complements.join(', ')} | ${s.description.replace(/\|/g, '\\|')} | ${location(s)} |`)
        .join('\n');
      return `### ${domain}\n\n| Skill | Complements | Use when | Location |\n|---|---|---|---|\n${rows}`;
    })
    .join('\n\n');
  return `# Octo domain skill catalog

Generated by \`octo sync\`. Do not edit; add skills to the Octo framework instead.

These skills are NOT loaded automatically. Follow \`octo-discovering-skills\`: when you invoke a superpowers
skill, find its row below, keep the domain skills whose "Use when" matches the work, and read them.

## By superpowers skill

| Superpowers skill | Domain skills |
|---|---|
${bySkill}

## By domain

${byDomain}
`;
}
