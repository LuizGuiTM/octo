import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defaultConfig, validateConfig } from '../src/config.js';
import { sync } from '../src/sync.js';
import { SESSION_HOOK_COMMAND } from '../src/host-settings.js';

const tempRepo = () => fs.mkdtempSync(path.join(os.tmpdir(), 'octo-gms-'));
const readJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const write = (root, rel, value) => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), typeof value === 'string' ? value : JSON.stringify(value, null, 2));
};

test('guardrails become Claude Code permissions and Copilot confirmations, without touching user entries', () => {
  const root = tempRepo();
  try {
    write(root, '.claude/settings.json', { permissions: { allow: ['Bash(make build:*)'] }, model: 'opus' });
    write(root, '.vscode/settings.json', { 'editor.tabSize': 2, 'chat.tools.terminal.autoApprove': { '/^ls\\b/': true } });
    const config = defaultConfig({ domains: [] });
    sync(root, config);

    const claude = readJson(root, '.claude/settings.json');
    assert.equal(claude.model, 'opus');
    assert.ok(claude.permissions.allow.includes('Bash(make build:*)'));
    assert.ok(claude.permissions.deny.includes('Bash(git push --force:*)'));
    assert.ok(claude.permissions.deny.includes('Read(./**/.env)'));
    assert.ok(claude.permissions.ask.includes('Bash(git push:*)'));
    assert.equal(claude.hooks.SessionStart[0].hooks[0].command, SESSION_HOOK_COMMAND);

    const vscode = readJson(root, '.vscode/settings.json');
    const approve = vscode['chat.tools.terminal.autoApprove'];
    assert.equal(vscode['editor.tabSize'], 2);
    assert.equal(approve['/^ls\\b/'], true);
    assert.equal(approve['/^\\s*git\\s+push\\s+--force(\\s|$)/'], false);
    assert.equal(approve['/^\\s*git\\s+status(\\s|$)/'], true);

    // Changing the config replaces only Octo's entries; re-syncing doesn't duplicate.
    config.guardrails.commands.deny = ['git push --force'];
    sync(root, config);
    sync(root, config);
    const after = readJson(root, '.claude/settings.json');
    assert.ok(!after.permissions.deny.includes('Bash(git reset --hard:*)'));
    assert.equal(after.permissions.deny.filter((r) => r === 'Bash(git push --force:*)').length, 1);
    assert.equal(after.hooks.SessionStart.length, 1);
    assert.ok(after.permissions.allow.includes('Bash(make build:*)'));

    // Dropping a host removes Octo's entries from its files.
    config.targets = ['claude-code'];
    sync(root, config);
    assert.deepEqual(readJson(root, '.vscode/settings.json')['chat.tools.terminal.autoApprove'], { '/^ls\\b/': true });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('custom MCP servers are generated per host with translated placeholders', () => {
  const root = tempRepo();
  try {
    write(root, '.mcp.json', { mcpServers: { mine: { command: 'my-server' } } });
    const config = defaultConfig({ domains: [] });
    config.mcp.servers = {
      graph: {
        description: 'Code graph', usage: 'Query before grepping',
        command: 'uvx', args: ['graph-mcp', '--root', '{workspace}'], env: { GRAPH_TOKEN: '{env:GRAPH_TOKEN}' },
      },
      remote: { url: 'https://mcp.example.com/mcp', headers: { Authorization: 'Bearer {env:REMOTE_TOKEN}' }, hosts: ['copilot'] },
    };
    const result = sync(root, config);
    assert.deepEqual(result.mcpServers, ['graph', 'remote']);

    const claude = readJson(root, '.mcp.json').mcpServers;
    assert.deepEqual(claude.mine, { command: 'my-server' });
    assert.deepEqual(claude.graph, { command: 'uvx', args: ['graph-mcp', '--root', '.'], env: { GRAPH_TOKEN: '${GRAPH_TOKEN}' } });
    assert.ok(!claude.remote, 'host filter respected');

    const copilot = readJson(root, '.vscode/mcp.json').servers;
    assert.deepEqual(copilot.graph.args, ['graph-mcp', '--root', '${workspaceFolder}']);
    assert.equal(copilot.graph.env.GRAPH_TOKEN, '${env:GRAPH_TOKEN}');
    assert.deepEqual(copilot.remote, { type: 'http', url: 'https://mcp.example.com/mcp', headers: { Authorization: 'Bearer ${env:REMOTE_TOKEN}' } });

    const claudeMd = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8');
    assert.match(claudeMd, /\| `graph` \| Code graph \| Query before grepping \|/);

    delete config.mcp.servers.graph;
    sync(root, config);
    assert.deepEqual(Object.keys(readJson(root, '.mcp.json').mcpServers), ['mine']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('config rejects literal secrets in MCP env and overlapping allow rules', () => {
  const config = defaultConfig();
  config.mcp.servers = { graph: { command: 'x', env: { API_TOKEN: 'abc123' } } };
  config.guardrails.commands.allow = ['git push'];
  const errors = validateConfig(config);
  assert.ok(errors.some((e) => e.includes('"API_TOKEN" looks like a secret')));
  assert.ok(errors.some((e) => e.includes('allow "git push" overlaps')));
});

test('session script: new, status, hook and close', () => {
  const root = tempRepo();
  try {
    execFileSync('git', ['init', '-q', '-b', 'octo/orders'], { cwd: root });
    sync(root, defaultConfig({ domains: [] }));
    const run = (...args) => execFileSync('node', ['.octo/bin/octo-session.mjs', ...args], { cwd: root, encoding: 'utf8' });

    assert.match(run('status'), /no active session/);
    const file = run('new', 'Formulário de pedidos').trim();
    assert.match(file, /^\.octo\/sessions\/\d{4}-\d{2}-\d{2}-formulario-de-pedidos\.md$/);
    assert.match(fs.readFileSync(path.join(root, file), 'utf8'), /branch: octo\/orders/);
    assert.throws(() => run('new', 'another'), /already has an active session/);

    assert.match(run('status'), /resuming the session for branch "octo\/orders"/);
    const hook = JSON.parse(run('hook', 'session-start'));
    assert.equal(hook.hookSpecificOutput.hookEventName, 'SessionStart');
    assert.match(hook.hookSpecificOutput.additionalContext, /formulario-de-pedidos/);

    run('close', 'formulario-de-pedidos');
    assert.match(run('status'), /no active session/);
    assert.match(fs.readFileSync(path.join(root, '.gitignore'), 'utf8'), /^\.octo\/sessions\/$/m);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
