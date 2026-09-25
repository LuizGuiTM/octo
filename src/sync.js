import fs from 'node:fs';
import path from 'node:path';
import { adapters, templateVars } from './adapters.js';
import {
  PACKAGE_ROOT, agents, awesomeInfo, commandSkills, coreSkills, domainInstructions, domainNames, domainSkills, render, schemaFile, template,
  upstreamInfo, upstreamSkills,
} from './sources.js';
import { readIfExists, removeManagedBlock, toPosix, upsertManagedBlock, writeFile } from './fs-utils.js';
import { asList } from './config.js';
import { EVIDENCE_DIR, mcpSummary, resolveMcp, serversForHost } from './mcp.js';
import { claudeCodeSettings, copilotAutoApprove, guardrailsText } from './host-settings.js';
import { readJson, syncHooks, syncListEntries, syncMapEntries } from './managed-json.js';

export const MANIFEST = '.octo/manifest.json';

// Personal preferences start pre-filled with the team defaults for each host (models per tier, language, autonomy).
export function renderPreferences(config) {
  const tier = (host, name) => asList(config.models?.[host]?.tiers?.[name]).join(' → ') || '–';
  return render(template('preferences.md'), {
    claudeDeep: tier('claude-code', 'deep'), claudeStandard: tier('claude-code', 'standard'), claudeFast: tier('claude-code', 'fast'),
    copilotDeep: tier('copilot', 'deep'), copilotStandard: tier('copilot', 'standard'), copilotFast: tier('copilot', 'fast'),
    responseLanguage: config.language?.responses ?? 'pt-BR',
    autonomyLevel: config.autonomy?.level ?? 'balanced',
  });
}
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
  for (const skill of [...core, ...commandSkills(), ...catalog, ...mcpSkills]) {
    if (upstreamNames.has(skill.name)) throw new Error(`Octo skill "${skill.name}" collides with a superpowers skill name`);
    const bad = skill.complements.filter((name) => !upstreamNames.has(name));
    if (bad.length) throw new Error(`Skill "${skill.name}" complements unknown superpowers skills: ${bad.join(', ')}`);
  }

  const instructions = domainInstructions(domains);
  const native = config.imports?.nativeInstructions ?? [];
  const unknownNative = native.filter((file) => !instructions.some((i) => i.file === file));
  if (unknownNative.length) throw new Error(`imports.nativeInstructions lists instructions not in the enabled domains: ${unknownNative.join(', ')}`);

  const promoted = catalog.filter((s) => promotedNames.has(s.name));
  return { upstream, core, catalog, promoted, domains, mcpSkills, instructions };
}

export function sync(root, config) {
  const owned = new Map(); // relative path -> content
  const own = (rel, content) => owned.set(toPosix(rel), content);
  const { upstream, core, catalog, promoted, domains, mcpSkills, instructions } = resolveSkills(config);
  const info = upstreamInfo();
  const mcp = resolveMcp(config);
  const previous = readManifest(root);
  const conflicts = [];
  const wantedLines = []; // lines Octo wants in user files (.gitignore, .gitattributes), reconciled at the end
  const wantLine = (file, entry, comment) => wantedLines.push({ file, entry, comment });

  // Native skills: superpowers verbatim + Octo core + chat commands + promoted domain skills + MCP usage skills.
  for (const skill of [...upstream, ...core, ...commandSkills(), ...promoted, ...mcpSkills]) {
    for (const file of skill.files) {
      own(path.join(SKILLS_DIR, skill.name, path.relative(skill.dir, file)), fs.readFileSync(file));
    }
  }
  own('.octo/licenses/superpowers-LICENSE', fs.readFileSync(info.license));

  // Domain catalog, loaded on demand through octo-discovering-skills.
  for (const skill of catalog) {
    for (const file of skill.files) {
      own(path.join(CATALOG_DIR, skill.domain, skill.tech, skill.name, path.relative(skill.dir, file)), fs.readFileSync(file));
    }
  }
  for (const instruction of instructions) {
    own(path.join(CATALOG_DIR, instruction.domain, instruction.tech, instruction.file), fs.readFileSync(instruction.path));
    if (config.targets.includes('copilot') && (config.imports?.nativeInstructions ?? []).includes(instruction.file)) {
      own(path.join('.github', 'instructions', instruction.file), fs.readFileSync(instruction.path));
    }
  }
  if ([...catalog, ...instructions].some((item) => item.source === 'awesome-copilot')) {
    own('.octo/licenses/awesome-copilot-LICENSE', fs.readFileSync(awesomeInfo().license));
  }
  own(path.join(CATALOG_DIR, 'INDEX.md'), catalogIndex(upstream, catalog, new Set(promoted.map((s) => s.name)), instructions));
  own('.octo/octo.config.schema.json', fs.readFileSync(schemaFile()));

  // Keep generated files LF on every OS: superpowers' bash scripts break with CRLF.
  for (const pattern of ['.claude/skills/** text=auto eol=lf', '.octo/** text=auto eol=lf']) {
    wantLine('.gitattributes', pattern, 'octo: generated files keep LF line endings (bash scripts break with CRLF)');
  }

  // Session continuity runtime.
  own('.octo/bin/octo-session.mjs', fs.readFileSync(path.join(PACKAGE_ROOT, 'runtime', 'octo-session.mjs')));
  own('.octo/templates/session.md', template('session.md'));
  own('.octo/templates/preferences.md', renderPreferences(config));
  own('.octo/MANUAL.md', fs.readFileSync(path.join(PACKAGE_ROOT, 'docs', 'MANUAL.md')));
  wantLine('.gitignore', '.octo/preferences.local.md', 'octo: personal preferences for this repo (never committed)');
  if (!config.sessions?.commit) wantLine('.gitignore', '.octo/sessions/', 'octo: session files are local (sessions.commit = false)');

  const extra = {
    upstreamVersion: info.version,
    domains: domains.length ? domains.map((d) => `\`${d}\``).join(', ') : 'none',
    complementsTable: complementsTable(upstream, [...core, ...promoted, ...mcpSkills], catalog.filter((s) => !promoted.includes(s))),
    guardrails: guardrailsText(config),
    sessionsCommit: config.sessions?.commit ? 'committed with the feature branch' : 'local only (git-ignored)',
  };
  const agentDefs = agents();
  const bootstrap = template('bootstrap.md');

  // Pre-flight: every user-owned JSON file we'll touch must be readable before anything is written,
  // so a JSONC/invalid file aborts the sync cleanly instead of leaving the repo half-synced.
  const touches = (target) => config.targets.includes(target) || hasOwned(previous.managed?.[target]);
  for (const target of Object.keys(adapters).filter(touches)) {
    const files = [adapters[target].mcp.file, target === 'claude-code' ? '.claude/settings.json' : '.vscode/settings.json'];
    for (const rel of files) readJson(path.join(root, rel));
  }

  const managed = {};
  for (const target of Object.keys(adapters)) {
    const active = config.targets.includes(target);
    const adapter = adapters[target];
    const before = previous.managed?.[target] ?? {};
    const hostServers = active ? serversForHost(mcp, target) : {};
    if (!active) removeManagedBlock(path.join(root, adapter.instructionsFile));
    if (!touches(target)) continue; // never installed for this host: leave its files alone
    if (active) {
      const vars = templateVars(config, target, { ...extra, mcpServers: mcpSummary(mcp, target) });
      for (const agent of agentDefs) {
        own(adapter.agentPath(agent), adapter.agentFile(agent, config, render(agent.body, vars)));
      }
      upsertManagedBlock(path.join(root, adapter.instructionsFile), adapter.instructionsPrefix + render(bootstrap, vars));
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
  if (mcp.playwright) wantLine('.gitignore', `${EVIDENCE_DIR}/`, 'octo: raw browser screenshots (curated ones live in the DoD folder)');
  // Manifests from Octo ≤ 0.1.1 have no line ownership: adopt lines that sit under an "# octo:" comment.
  const legacy = previous.files && !previous.lines;
  const lines = syncLines(root, wantedLines, previous.lines ?? [], legacy);

  // AI docs come first: scaffold AGENTS.md once, never overwrite it.
  const agentsMd = path.join(root, 'AGENTS.md');
  const createdAgentsMd = !fs.existsSync(agentsMd);
  if (createdAgentsMd) writeFile(agentsMd, template('AGENTS.md'));

  for (const [rel, content] of owned) writeOwned(path.join(root, rel), content);
  const stale = (previous.files ?? []).filter((rel) => !owned.has(rel));
  for (const rel of stale) fs.rmSync(path.join(root, rel), { force: true });
  pruneEmptyDirs(root, stale);
  const manifest = { superpowers: info.commit, files: [...owned.keys()].sort(), managed, lines };
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

const hasOwned = (entries) => Object.values(entries ?? {}).some((list) => Array.isArray(list) && list.length);

// Lines Octo adds to user files are owned only if Octo added them (a line the user already had stays theirs).
// Owned lines no longer wanted are removed, with their "# octo:" comment when nothing else uses it.
function syncLines(root, wanted, previouslyOwned, legacy = false) {
  const key = (l) => `${l.file}\n${l.entry}`;
  const wantedKeys = new Set(wanted.map(key));
  for (const old of previouslyOwned.filter((l) => !wantedKeys.has(key(l)))) removeLine(root, old);
  const owned = [];
  for (const line of wanted) {
    const wasOwned = previouslyOwned.some((l) => key(l) === key(line))
      || (legacy && (readIfExists(path.join(root, line.file)) ?? '').includes(`# ${line.comment}`));
    if (addLine(root, line) || wasOwned) owned.push(line);
  }
  return owned;
}

function addLine(root, { file: rel, entry, comment }) {
  const file = path.join(root, rel);
  const existing = readIfExists(file) ?? '';
  if (existing.split(/\r?\n/).includes(entry)) return false;
  const eol = existing.includes('\r\n') ? '\r\n' : '\n';
  const prefix = existing.trim() ? `${existing.replace(/\s*$/, '')}${eol}` : '';
  const header = existing.includes(`# ${comment}`) ? '' : `# ${comment}${eol}`;
  writeFile(file, `${prefix}${header}${entry}${eol}`);
  return true;
}

function removeLine(root, { file: rel, entry, comment }) {
  const file = path.join(root, rel);
  const existing = readIfExists(file);
  if (existing === null) return;
  const eol = existing.includes('\r\n') ? '\r\n' : '\n';
  let lines = existing.split(/\r?\n/).filter((l) => l !== entry);
  const header = `# ${comment}`;
  const i = lines.indexOf(header);
  const next = lines[i + 1];
  if (i !== -1 && (next === undefined || next === '' || next.startsWith('#'))) lines = lines.filter((_, j) => j !== i);
  writeFile(file, lines.join(eol));
}

// Package files are text; normalize to LF (a Windows checkout may have CRLF) and keep scripts executable.
function writeOwned(file, content) {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const text = buffer.includes(0) ? null : buffer.toString('utf8');
  writeFile(file, text === null ? buffer : text.replace(/\r\n/g, '\n'));
  if (text?.startsWith('#!')) fs.chmodSync(file, 0o755);
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
      const c = complementsOf(catalog, u.name).map((s) => `${s.domain}/${s.tech}/${s.name}`);
      return n.length || c.length ? `| ${code(u.name)} | ${n.join(', ') || '–'} | ${c.join(', ') || '–'} |` : null;
    })
    .filter(Boolean);
  return ['| Superpowers skill | Also load (native) | Domain skills (catalog) |', '|---|---|---|', ...rows].join('\n');
}

export const catalogSkillPath = (s) => `.octo/catalog/${s.domain}/${s.tech}/${s.name}/SKILL.md`;
export const catalogInstructionPath = (i) => `.octo/catalog/${i.domain}/${i.tech}/${i.file}`;
const shortDescription = (text, max = 220) => {
  const clean = text.replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

export function catalogIndex(upstream, catalog, promoted = new Set(), instructions = []) {
  const label = (s) => `${s.domain}/${s.tech}/${s.name}`;
  const location = (s) => (promoted.has(s.name) ? 'native (promoted)' : code(catalogSkillPath(s)));
  const bySkill = upstream
    .map((u) => {
      const matches = complementsOf(catalog, u.name);
      return matches.length ? `| ${code(u.name)} | ${matches.map(label).join(', ')} |` : null;
    })
    .filter(Boolean)
    .join('\n');
  const domains = [...new Set([...catalog, ...instructions].map((item) => item.domain))];
  const byDomain = domains
    .map((domain) => {
      const techs = [...new Set([...catalog, ...instructions].filter((i) => i.domain === domain).map((i) => i.tech))].sort();
      const sections = techs.map((tech) => {
        const skills = catalog
          .filter((s) => s.domain === domain && s.tech === tech)
          .map((s) => `| skill | ${code(s.name)} | ${s.complements.join(', ')} | ${shortDescription(s.description)} | ${location(s)} |`);
        const guides = instructions
          .filter((i) => i.domain === domain && i.tech === tech)
          .map((i) => `| instructions (\`${i.applyTo}\`) | ${code(i.name)} | – | ${shortDescription(i.description)} | ${code(catalogInstructionPath(i))} |`);
        return `#### ${domain} / ${tech}\n\n| Kind | Name | Complements | Use when | Location |\n|---|---|---|---|---|\n${[...skills, ...guides].join('\n')}`;
      });
      return `### ${domain}\n\n${sections.join('\n\n')}`;
    })
    .join('\n\n');
  return `# Octo domain skill catalog

Generated by \`octo sync\`. Do not edit; add skills to the Octo framework instead.
Sources: Octo, and github/awesome-copilot (MIT, see .octo/licenses/).

Nothing here is loaded automatically. Follow \`octo-discovering-skills\`:
- **Skills**: when you invoke a superpowers skill, find its row in "By superpowers skill", keep the ones whose
  "Use when" matches the work, and read them.
- **Instructions**: coding standards per technology. Read one before editing files that match its \`applyTo\`
  glob. For broad globs (\`**\`), read it only when its description matches the work.

## By superpowers skill

| Superpowers skill | Domain skills (domain/technology/skill) |
|---|---|
${bySkill}

## By domain and technology

${byDomain}
`;
}
