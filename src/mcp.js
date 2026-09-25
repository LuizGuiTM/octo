import fs from 'node:fs';
import path from 'node:path';
import { PACKAGE_ROOT } from './sources.js';
import { parseFrontmatter } from './yaml-lite.js';
import { listFiles } from './fs-utils.js';

const REGISTRY = path.join(PACKAGE_ROOT, 'mcp');
export const EVIDENCE_DIR = '.octo/evidence';

// Company-wide MCP servers shipped with the framework: mcp/<name>/server.json (+ optional skill/SKILL.md).
// Directories starting with "_" are examples and never installed.
export function registryServers() {
  if (!fs.existsSync(REGISTRY)) return {};
  const servers = {};
  for (const entry of fs.readdirSync(REGISTRY, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    const dir = path.join(REGISTRY, entry.name);
    const def = JSON.parse(fs.readFileSync(path.join(dir, 'server.json'), 'utf8'));
    const skillDir = path.join(dir, 'skill');
    let skill;
    if (fs.existsSync(path.join(skillDir, 'SKILL.md'))) {
      const { data } = parseFrontmatter(fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8'));
      skill = { name: data.name, description: data.description, complements: data.metadata?.complements ?? [], dir: skillDir, files: listFiles(skillDir) };
      if (data.name !== `octo-mcp-${entry.name}`) throw new Error(`mcp/${entry.name}/skill must be named "octo-mcp-${entry.name}"`);
    }
    servers[entry.name] = { ...def, source: 'framework', skill };
  }
  return servers;
}

// Every server this repo should get: enabled registry servers + inline ones + Playwright for web testing.
export function resolveMcp(config) {
  const registry = registryServers();
  const resolved = {};
  for (const name of config.mcp?.enable ?? []) {
    if (!registry[name]) throw new Error(`mcp.enable lists "${name}", which is not in the framework's mcp/ registry (${Object.keys(registry).join(', ') || 'empty'})`);
    resolved[name] = registry[name];
  }
  for (const [name, def] of Object.entries(config.mcp?.servers ?? {})) {
    if (resolved[name]) throw new Error(`MCP server "${name}" is defined both in mcp.enable and mcp.servers`);
    resolved[name] = { ...def, source: 'repo' };
  }
  if (config.webTesting?.enabled && !resolved.playwright) {
    resolved.playwright = {
      description: 'Browser automation for octo-web-testing',
      usage: 'Only through octo-web-testing / octo-web-tester.',
      command: 'npx',
      args: ['@playwright/mcp@latest', '--output-dir', '{workspace}/' + EVIDENCE_DIR],
      hosts: Object.entries(config.webTesting.tools ?? {}).filter(([, tool]) => tool === 'playwright').map(([host]) => host),
      source: 'octo',
    };
  }
  for (const [name, def] of Object.entries(resolved)) {
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(name)) throw new Error(`MCP server name "${name}" must be lowercase letters, digits, "-" or "_"`);
    if (!def.command && !def.url) throw new Error(`MCP server "${name}" needs "command" (stdio) or "url" (http)`);
  }
  return resolved;
}

// Placeholders: {env:NAME} for secrets, {workspace} for the repo root.
const PLACEHOLDERS = {
  'claude-code': { env: (name) => `\${${name}}`, workspace: '.' },
  copilot: { env: (name) => `\${env:${name}}`, workspace: '${workspaceFolder}' },
};

function translate(value, host) {
  const p = PLACEHOLDERS[host];
  return value.replace(/\{env:([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, name) => p.env(name)).replaceAll('{workspace}', p.workspace);
}

export function serverFor(def, host) {
  const out = def.url
    ? { type: 'http', url: translate(def.url, host) }
    : { ...(host === 'copilot' ? { type: 'stdio' } : {}), command: def.command, args: (def.args ?? []).map((a) => translate(a, host)) };
  if (def.env) out.env = Object.fromEntries(Object.entries(def.env).map(([k, v]) => [k, translate(String(v), host)]));
  if (def.headers) out.headers = Object.fromEntries(Object.entries(def.headers).map(([k, v]) => [k, translate(String(v), host)]));
  return out;
}

export function serversForHost(resolved, host) {
  return Object.fromEntries(
    Object.entries(resolved)
      .filter(([, def]) => !def.hosts || def.hosts.includes(host))
      .map(([name, def]) => [name, serverFor(def, host)]),
  );
}

export function mcpSummary(resolved, host) {
  const rows = Object.entries(resolved)
    .filter(([, def]) => !def.hosts || def.hosts.includes(host))
    .map(([name, def]) => `| \`${name}\` | ${def.description ?? ''} | ${def.skill ? `\`${def.skill.name}\`` : (def.usage ?? '')} |`);
  if (!rows.length) return 'No custom MCP servers configured.';
  return ['| Server | What it is | When / how to use |', '|---|---|---|', ...rows].join('\n');
}
