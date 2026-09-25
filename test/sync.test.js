import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defaultConfig } from '../src/config.js';
import { resolveSkills, sync } from '../src/sync.js';
import { parseFrontmatter } from '../src/yaml-lite.js';
import { PACKAGE_ROOT, agents, coreSkills, domainNames, domainSkills, upstreamSkills } from '../src/sources.js';

function tempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'octo-sync-'));
}
const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (root, rel) => fs.existsSync(path.join(root, rel));

test('octo skills are well formed and complement real superpowers skills', () => {
  const upstream = new Set(upstreamSkills().map((s) => s.name));
  assert.ok(upstream.has('using-superpowers') && upstream.has('writing-plans'));
  for (const skill of [...coreSkills(), ...domainSkills(domainNames())]) {
    assert.match(skill.name, /^[a-z0-9-]+$/);
    assert.ok(skill.description.length <= 1024, `${skill.name} description too long`);
    assert.ok(skill.complements.length > 0, `${skill.name} must complement at least one superpowers skill`);
    for (const name of skill.complements) assert.ok(upstream.has(name), `${skill.name} complements unknown "${name}"`);
  }
  for (const agent of agents()) assert.ok(['deep', 'standard', 'fast'].includes(agent.tier), agent.name);
  // Also validated at sync time for every enabled domain.
  assert.doesNotThrow(() => resolveSkills(defaultConfig({ domains: domainNames() })));
});

test('sync installs superpowers untouched plus the Octo layer for both hosts', () => {
  const root = tempRepo();
  try {
    const result = sync(root, defaultConfig({ domains: ['architecture', 'security', 'web'] }));
    assert.ok(result.createdAgentsMd);

    const upstreamFile = path.join(PACKAGE_ROOT, 'upstream/superpowers/skills/writing-plans/SKILL.md');
    assert.equal(read(root, '.claude/skills/writing-plans/SKILL.md'), fs.readFileSync(upstreamFile, 'utf8'));
    assert.ok(exists(root, '.claude/skills/subagent-driven-development/scripts/task-brief'));
    assert.ok(exists(root, '.octo/licenses/superpowers-LICENSE'));
    assert.ok(exists(root, '.claude/skills/octo-parallel-waves/SKILL.md'));
    assert.ok(exists(root, '.octo/catalog/web/react-components/SKILL.md'));
    assert.ok(!exists(root, '.octo/catalog/salesforce'), 'disabled domains are not installed');

    const index = read(root, '.octo/catalog/INDEX.md');
    assert.match(index, /\| `test-driven-development` \|.*web\/react-components/);

    const claudeAgent = parseFrontmatter(read(root, '.claude/agents/octo-worker-deep.md')).data;
    assert.equal(claudeAgent.model, 'opus');
    const copilotAgent = parseFrontmatter(read(root, '.github/agents/octo-worker-deep.agent.md')).data;
    assert.deepEqual(copilotAgent.model, ['Claude Opus 4.5', 'GPT-5.2']);
    assert.equal(copilotAgent['user-invocable'], false);

    const claudeMd = read(root, 'CLAUDE.md');
    assert.match(claudeMd, /@AGENTS\.md/);
    assert.match(claudeMd, /load the skills `using-superpowers` and then `octo-using-octo`/);
    assert.match(claudeMd, /\| `writing-plans` \| .*`octo-parallel-waves`/);
    assert.match(claudeMd, /Talk to the user in \*\*pt-BR\*\*/);
    assert.match(read(root, '.github/copilot-instructions.md'), /Playwright MCP/);
    assert.deepEqual(JSON.parse(read(root, '.vscode/mcp.json')).servers.playwright.args,
      ['@playwright/mcp@latest', '--output-dir', '${workspaceFolder}/.octo/evidence']);
    assert.match(read(root, '.gitignore'), /^\.octo\/evidence\/$/m);
    const attributes = read(root, '.gitattributes');
    assert.match(attributes, /^\.claude\/skills\/\*\* text=auto eol=lf$/m);
    assert.match(attributes, /^\.octo\/\*\* text=auto eol=lf$/m);
    assert.equal(attributes.match(/^# octo:/gm).length, 1, 'one header for both lines');
    assert.match(claudeMd, /`docs\/superpowers\/dod\/YYYY-MM-DD-<topic>\/DoD\.md` says DONE/);
    assert.match(claudeMd, /Extra DoD criteria for this repo:\n- \(none\)/);
    assert.match(claudeMd, /human-facing documents \(Definition of Done\) in \*\*pt-BR\*\*/);
    assert.ok(exists(root, '.claude/skills/octo-definition-of-done/dod-template.md'));
    assert.match(read(root, 'AGENTS.md'), /octo:needs-context/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('sync is idempotent, keeps user content, and removes stale files', () => {
  const root = tempRepo();
  try {
    fs.writeFileSync(path.join(root, 'CLAUDE.md'), '# My project notes\n');
    fs.writeFileSync(path.join(root, 'AGENTS.md'), '# Real agents doc\n');
    const config = defaultConfig({ domains: ['web'] });
    sync(root, config);
    sync(root, config);

    assert.equal(read(root, '.gitignore').match(/\.octo\/evidence\//g).length, 1, 'gitignore entry added once');
    const claudeMd = read(root, 'CLAUDE.md');
    assert.ok(claudeMd.startsWith('# My project notes'));
    assert.equal(claudeMd.match(/octo:begin/g).length, 1);
    assert.equal(read(root, 'AGENTS.md'), '# Real agents doc\n');

    config.targets = ['claude-code'];
    config.domains = [];
    config.upstream.exclude = ['diagnosing-superpowers'];
    sync(root, config);
    assert.ok(!exists(root, '.github/agents'), 'copilot agents removed');
    assert.ok(!exists(root, '.octo/catalog/web'), 'web domain removed');
    assert.ok(!exists(root, '.claude/skills/diagnosing-superpowers'), 'excluded upstream skill removed');
    assert.doesNotMatch(read(root, '.github/copilot-instructions.md'), /octo:begin/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('promoted domain skills become native', () => {
  const root = tempRepo();
  try {
    const config = defaultConfig({ domains: ['salesforce'] });
    config.skills.promoted = ['apex-development'];
    sync(root, config);
    assert.ok(exists(root, '.claude/skills/apex-development/SKILL.md'));
    assert.match(read(root, '.octo/catalog/INDEX.md'), /native \(promoted\)/);
    assert.match(read(root, 'CLAUDE.md'), /\| `test-driven-development` \| .*`apex-development`/);

    config.skills.promoted = ['react-components'];
    assert.throws(() => sync(root, config), /not in the enabled domains/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
