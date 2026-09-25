#!/usr/bin/env node
// Safety checks before an autonomous commit. Zero dependencies. Run from anywhere inside the repo.
// Usage: node pre-commit-check.mjs
// Fails (exit 1) on: protected branch, staged protected paths, secret-looking added lines,
// stray screenshots outside the DoD folder. Reads octo.config.json for branches and paths.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

const SECRET_PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
  [/gh[pousr]_[A-Za-z0-9]{36,}/, 'GitHub token'],
  [/sk-(ant-|proj-)?[A-Za-z0-9_-]{20,}/, 'API secret key'],
  [/xox[abpr]-[A-Za-z0-9-]{10,}/, 'Slack token'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/(password|passwd|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"\s]{8,}['"]/i, 'hard-coded credential'],
];

// Minimal glob → RegExp for patterns like **/.env, **/*.pem, **/secrets/**.
export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    if (ch === '*' && glob[i + 1] === '*') {
      const slash = glob[i + 2] === '/';
      re += slash ? '(?:.*/)?' : '.*';
      i += slash ? 2 : 1;
    } else if (ch === '*') re += '[^/]*';
    else if (ch === '?') re += '[^/]';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

export function preCommitCheck() {
  const problems = [];
  const root = git('rev-parse', '--show-toplevel');
  const configFile = path.join(root, 'octo.config.json');
  const config = fs.existsSync(configFile) ? JSON.parse(fs.readFileSync(configFile, 'utf8')) : {};
  const protectedBranches = config.autonomy?.protectedBranches ?? ['main', 'master', 'develop'];
  const protectedPaths = config.guardrails?.protectedPaths ?? ['**/.env', '**/.env.*', '**/*.pem', '**/*.key'];
  const dodDir = config.dod?.dir ?? 'docs/superpowers/dod';

  const branch = git('branch', '--show-current');
  if (protectedBranches.includes(branch)) problems.push(`on protected branch "${branch}": create a feature branch first`);

  const staged = git('diff', '--cached', '--name-only').split(/\r?\n/).filter(Boolean);
  if (!staged.length) problems.push('nothing is staged');
  const matchers = protectedPaths.map((p) => [p, globToRegExp(p)]);
  for (const file of staged) {
    const hit = matchers.find(([, re]) => re.test(file));
    if (hit) problems.push(`staged protected path ${file} (matches ${hit[0]})`);
  }

  const diff = git('diff', '--cached', '--unified=0', '--no-color');
  let current = '';
  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith('+++ b/')) current = line.slice(6);
    else if (line.startsWith('+') && !line.startsWith('+++')) {
      for (const [re, label] of SECRET_PATTERNS) {
        if (re.test(line)) problems.push(`${current}: added line looks like a ${label}`);
      }
    }
  }

  const untracked = git('status', '--porcelain', '--untracked-files=all').split(/\r?\n/)
    .filter((l) => l.startsWith('??')).map((l) => l.slice(3));
  for (const file of [...staged, ...untracked]) {
    if (/\.(png|jpe?g|gif|webp)$/i.test(file) && !file.startsWith(`${dodDir}/`) && !file.startsWith('.octo/evidence/')) {
      problems.push(`screenshot outside the DoD folder: ${file}`);
    }
  }
  return { branch, staged: staged.length, problems };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  try {
    const r = preCommitCheck();
    console.log(`branch: ${r.branch} · staged files: ${r.staged}`);
    if (r.problems.length) {
      console.log(`${r.problems.length} problem(s):`);
      for (const p of r.problems) console.log(`  - ${p}`);
      process.exit(1);
    }
    console.log('OK: safe to commit.');
  } catch (err) {
    console.error(`pre-commit-check: ${err.message}`);
    process.exit(2);
  }
}
