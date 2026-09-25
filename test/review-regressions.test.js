// Regression tests for the findings of the first independent review (Opus 5.5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defaultConfig, validateConfig } from '../src/config.js';
import { sync } from '../src/sync.js';
import { parseYaml, stringifyYaml } from '../src/yaml-lite.js';
import { listFiles } from '../src/fs-utils.js';
import { PACKAGE_ROOT } from '../src/sources.js';
import { checkDod } from '../skills/core/octo-definition-of-done/scripts/check-dod.mjs';

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'octo-rr-'));
const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const write = (root, rel, text) => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
};

test('shipped text files are LF and installed shebang scripts are LF (and executable on POSIX)', () => {
  const shipped = ['upstream/superpowers/skills', 'skills', 'commands', 'agents', 'templates', 'runtime', 'bin', 'src']
    .flatMap((dir) => listFiles(path.join(PACKAGE_ROOT, dir)));
  const crlf = shipped.filter((f) => { const b = fs.readFileSync(f); return !b.includes(0) && b.includes('\r\n'); });
  assert.deepEqual(crlf.map((f) => path.relative(PACKAGE_ROOT, f)), [], 'no CRLF in shipped files');

  const root = tempDir();
  try {
    sync(root, defaultConfig({ domains: [] }));
    const script = path.join(root, '.claude/skills/executing-plans/scripts/task-start');
    assert.ok(!fs.readFileSync(script).includes('\r\n'));
    if (process.platform !== 'win32') assert.ok(fs.statSync(script).mode & 0o111, 'executable');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a Claude-only repo ignores a JSONC .vscode/settings.json; an invalid file Octo must touch aborts before writing', () => {
  const root = tempDir();
  try {
    const jsonc = '{\n    // my comment\n    "editor.tabSize": 4,\n}\n';
    write(root, '.vscode/settings.json', jsonc);
    const config = defaultConfig({ domains: [], targets: ['claude-code'] });
    assert.doesNotThrow(() => sync(root, config));
    assert.equal(read(root, '.vscode/settings.json'), jsonc, 'untouched');

    const other = tempDir();
    try {
      write(other, '.claude/settings.json', '{ // broken\n}');
      assert.throws(() => sync(other, config), /not plain JSON/);
      assert.ok(!fs.existsSync(path.join(other, 'CLAUDE.md')), 'nothing written before the failure');
      assert.ok(!fs.existsSync(path.join(other, '.octo')), 'no partial install');
    } finally {
      fs.rmSync(other, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('user JSON keeps its formatting when nothing changed, and CRLF files stay CRLF', () => {
  const root = tempDir();
  try {
    const config = defaultConfig({ domains: [], targets: ['claude-code'] });
    sync(root, config);
    const settings = path.join(root, '.claude/settings.json');
    const reformatted = JSON.stringify(JSON.parse(fs.readFileSync(settings, 'utf8')), null, 4);
    fs.writeFileSync(settings, reformatted);
    write(root, 'CLAUDE.md', `# Notes\r\nkeep\r\n\r\n${read(root, 'CLAUDE.md').replace(/\n/g, '\r\n')}`);
    sync(root, config);
    assert.equal(fs.readFileSync(settings, 'utf8'), reformatted, 'unchanged JSON is not rewritten');
    const claudeMd = read(root, 'CLAUDE.md');
    assert.ok(!/[^\r]\n/.test(claudeMd), 'no bare LF in a CRLF file');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('lines Octo added to .gitignore are removed when no longer wanted (sessions.commit = true)', () => {
  const root = tempDir();
  try {
    write(root, '.gitignore', 'node_modules/\n');
    const config = defaultConfig({ domains: [] });
    sync(root, config);
    assert.match(read(root, '.gitignore'), /^\.octo\/sessions\/$/m);
    config.sessions.commit = true;
    sync(root, config);
    const gitignore = read(root, '.gitignore');
    assert.doesNotMatch(gitignore, /^\.octo\/sessions\/$/m);
    assert.doesNotMatch(gitignore, /sessions\.commit = false/, 'its comment goes too');
    assert.match(gitignore, /^node_modules\/$/m, 'user lines stay');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a line the user already had is never removed by Octo', () => {
  const root = tempDir();
  try {
    write(root, '.gitignore', '.octo/sessions/\n');
    const config = defaultConfig({ domains: [] });
    sync(root, config);
    config.sessions.commit = true;
    sync(root, config);
    assert.match(read(root, '.gitignore'), /^\.octo\/sessions\/$/m);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('literal secrets are rejected in MCP args and urls, placeholders are accepted', () => {
  const config = defaultConfig();
  config.mcp.servers = {
    a: { command: 'x', args: ['--token=abc123'] },
    b: { url: 'https://h/mcp?api_key=abc' },
    c: { command: 'x', args: ['--token={env:T}'], headers: { Authorization: 'Bearer {env:T}' } },
    d: { command: 'x', env: { API_TOKEN: 'prefix-{env:T}' } },
  };
  const errors = validateConfig(config);
  assert.ok(errors.some((e) => e.startsWith('mcp.servers.a:')));
  assert.ok(errors.some((e) => e.startsWith('mcp.servers.b:')));
  assert.ok(!errors.some((e) => e.startsWith('mcp.servers.c:')));
  assert.ok(errors.some((e) => e.startsWith('mcp.servers.d:')), 'a literal mixed with a placeholder is still a literal');
});

test('work branches follow autonomy.branchPattern (default keeps "octo" at the end; legacy branchPrefix still works)', () => {
  const root = tempDir();
  try {
    const config = defaultConfig({ domains: [] });
    assert.equal(config.autonomy.branchPattern, '{type}/{topic}-octo');
    sync(root, config);
    assert.match(read(root, 'CLAUDE.md'), /e\.g\. `feature\/status-filter-octo` or `fix\/discount-error-octo`/);
    delete config.autonomy.branchPattern;
    config.autonomy.branchPrefix = 'octo/';
    sync(root, config);
    assert.match(read(root, 'CLAUDE.md'), /named `octo\/\{topic\}`/);
    config.autonomy.branchPattern = 'feature/no-topic';
    assert.ok(validateConfig(config).some((e) => e.includes('branchPattern must be a string containing {topic}')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('yaml-lite: comments after quoted values, and lists of objects are refused', () => {
  assert.deepEqual(parseYaml('a: "x" # note'), { a: 'x' });
  assert.throws(() => stringifyYaml({ handoffs: [{ label: 'x' }] }), /lists of objects/);
});

test('check-dod accepts URL evidence and survives malformed links', () => {
  const dir = tempDir();
  try {
    fs.mkdirSync(path.join(dir, 'screenshots'));
    fs.writeFileSync(path.join(dir, 'screenshots/S1.png'), 'png');
    fs.writeFileSync(path.join(dir, 'DoD.md'), [
      '| | |', '|---|---|', '| Status | **CONCLUÍDO** |', '',
      '## Cenários', '| ID | Critério | Tipo | Resultado | Evidência |', '|---|---|---|---|---|',
      '| S1 | a | web | ✅ PASSOU | [print](screenshots/S1.png) |',
      '| S2 | b | teste | ✅ PASSOU | [CI](https://ci.example.com/run/1) |',
      '| S3 | c | teste | ✅ PASSOU | [log](bad%zz.txt) |', '',
      '## Checklist', '- [x] ok',
    ].join('\n'));
    const r = checkDod(path.join(dir, 'DoD.md'));
    assert.ok(!r.problems.some((p) => p.includes('https://')), 'URL is not treated as a file');
    assert.ok(r.problems.some((p) => p.includes('bad%zz.txt')), 'malformed link reported, not a crash');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('session close needs a unique match; non-Latin topics still get a file name', () => {
  const root = tempDir();
  try {
    execFileSync('git', ['init', '-q', '-b', 'octo/a'], { cwd: root });
    sync(root, defaultConfig({ domains: [] }));
    const run = (...args) => execFileSync('node', ['.octo/bin/octo-session.mjs', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    assert.match(run('new', '配送'), /-session\.md$/m);
    execFileSync('git', ['switch', '-q', '-c', 'octo/b'], { cwd: root });
    run('new', 'session two');
    assert.throws(() => run('close', 'session'), /matches 2 sessions/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
