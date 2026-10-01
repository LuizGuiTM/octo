import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defaultConfig } from '../src/config.js';
import { sync } from '../src/sync.js';

const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (root, rel) => fs.existsSync(path.join(root, rel));
const git = (root, ...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' });
const commitAll = (root, message) => {
  git(root, 'add', '-A');
  git(root, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', message);
};

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'octo-local-'));
  git(root, 'init', '-q', '-b', 'main');
  fs.writeFileSync(path.join(root, 'CLAUDE.md'), '# Team notes\n');
  fs.mkdirSync(path.join(root, '.vscode'));
  fs.writeFileSync(path.join(root, '.vscode/settings.json'), '{\n  "editor.tabSize": 4\n}\n');
  fs.mkdirSync(path.join(root, '.claude/skills/team-skill'), { recursive: true });
  fs.writeFileSync(path.join(root, '.claude/skills/team-skill/SKILL.md'), '---\nname: team-skill\ndescription: x\n---\n');
  commitAll(root, 'base');
  return root;
}

test('framework.commit = false: nothing Octo generates shows up in git status', () => {
  const root = repo();
  try {
    const config = defaultConfig({ domains: ['salesforce'] });
    config.framework.commit = false;
    sync(root, config);
    // Only the versioned pieces change: .gitignore (the ignore rules) and AGENTS.md (created, with the pointer).
    const status = git(root, 'status', '--porcelain', '--untracked-files=all').trim().split('\n').map((l) => l.slice(3)).sort();
    assert.deepEqual(status, ['.gitignore', 'AGENTS.md']);

    // Instructions live in git-ignored files of their own; the team's CLAUDE.md is untouched.
    assert.equal(read(root, 'CLAUDE.md'), '# Team notes\n');
    assert.match(read(root, '.claude/rules/octo.md'), /Superpowers \+ Octo/);
    assert.match(read(root, '.github/instructions/octo.instructions.md'), /^---\napplyTo: '\*\*'/);
    assert.match(read(root, 'AGENTS.md'), /octo@latest sync/);
    // Claude Code's guardrails and hooks go to the local settings file.
    assert.ok(JSON.parse(read(root, '.claude/settings.local.json')).hooks.PreToolUse);
    assert.ok(!exists(root, '.claude/settings.json'));
    // A versioned .vscode/settings.json is left alone; the team's own skill isn't ignored.
    assert.equal(read(root, '.vscode/settings.json'), '{\n  "editor.tabSize": 4\n}\n');
    assert.match(git(root, 'check-ignore', '-v', '.claude/skills/using-superpowers/SKILL.md'), /using-superpowers/);
    assert.throws(() => git(root, 'check-ignore', '.claude/skills/team-skill/SKILL.md'));
    // Sessions are versioned (sessions.commit = true) even though the rest of .octo/ is ignored.
    assert.throws(() => git(root, 'check-ignore', '.octo/sessions/2026-01-01-x.md'));
    assert.match(git(root, 'check-ignore', '.octo/bin/octo-guard.mjs'), /octo-guard/);

    // A second sync changes nothing.
    commitAll(root, 'ignore octo');
    sync(root, config);
    assert.equal(git(root, 'status', '--porcelain', '--untracked-files=all').trim(), '');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('switching an installed repo to framework.commit = false reports what git still tracks', () => {
  const root = repo();
  try {
    const config = defaultConfig({ domains: ['salesforce'] });
    sync(root, config);
    commitAll(root, 'octo, versioned');
    assert.match(read(root, 'CLAUDE.md'), /octo:begin/);

    config.framework.commit = false;
    const result = sync(root, config);
    assert.ok(result.trackedOwned.includes('.claude/skills/using-superpowers/SKILL.md'));
    assert.deepEqual(result.skippedShared, ['.vscode/settings.json']);
    assert.equal(read(root, 'CLAUDE.md'), '# Team notes\n', 'the octo block leaves the versioned CLAUDE.md');
    assert.ok(!exists(root, '.claude/settings.json'), 'entries move to settings.local.json; the emptied file goes');
    assert.ok(JSON.parse(read(root, '.claude/settings.local.json')).hooks.PreToolUse);
    // Files Octo created (only its entries) are adopted: still written, git-ignored, and listed for `octo untrack`.
    assert.match(read(root, '.vscode/mcp.json'), /playwright/);
    assert.ok(result.trackedOwned.includes('.vscode/mcp.json'));
    assert.doesNotMatch(read(root, '.vscode/settings.json'), /autoApprove/, 'removed from the versioned file');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
