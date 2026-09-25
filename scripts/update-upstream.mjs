#!/usr/bin/env node
// Vendors obra/superpowers into upstream/superpowers, untouched, and pins the commit.
// Usage: node scripts/update-upstream.mjs [--ref <branch|tag>]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'https://github.com/obra/superpowers.git';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'upstream', 'superpowers');
const lockFile = path.join(root, 'upstream', 'superpowers.lock.json');

const refIndex = process.argv.indexOf('--ref');
const ref = refIndex !== -1 ? process.argv[refIndex + 1] : 'main';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'octo-upstream-'));
try {
  execFileSync('git', ['clone', '--quiet', '--depth', '1', '--branch', ref, REPO, tmp], { stdio: 'inherit' });
  const commit = execFileSync('git', ['-C', tmp, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const previous = fs.existsSync(lockFile) ? JSON.parse(fs.readFileSync(lockFile, 'utf8')).commit : null;

  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(tmp, target, { recursive: true, filter: (src) => path.basename(src) !== '.git' });
  const version = JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8')).version;
  fs.writeFileSync(lockFile, `${JSON.stringify({ repo: REPO, ref, commit, version }, null, 2)}\n`);

  console.log(previous === commit
    ? `superpowers already at ${version} (${commit.slice(0, 7)}).`
    : `superpowers updated to ${version} (${commit.slice(0, 7)})${previous ? `, was ${previous.slice(0, 7)}` : ''}.`);
  console.log('Next: npm test (checks every "complements" entry still names an upstream skill).');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
