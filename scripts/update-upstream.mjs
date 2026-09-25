#!/usr/bin/env node
// Vendors upstream projects untouched under upstream/<name>/ and pins the commit in upstream/<name>.lock.json.
//   superpowers:     the whole repo (skills are installed natively)
//   awesome-copilot: only the skills/instructions listed in upstream/awesome-copilot.imports.json, plus LICENSE
// Usage: node scripts/update-upstream.mjs [--source superpowers|awesome-copilot|all] [--ref <branch|tag>]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : fallback;
};

const SOURCES = {
  superpowers: {
    repo: 'https://github.com/obra/superpowers.git',
    paths: () => null, // everything
    version: (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version,
  },
  'awesome-copilot': {
    repo: 'https://github.com/github/awesome-copilot.git',
    paths: () => {
      const imports = JSON.parse(fs.readFileSync(path.join(root, 'upstream', 'awesome-copilot.imports.json'), 'utf8'));
      return [
        'LICENSE',
        ...Object.keys(imports.skills).map((name) => `skills/${name}`),
        ...Object.keys(imports.instructions).map((file) => `instructions/${file}`),
      ];
    },
    version: () => null,
  },
};

function update(name, ref) {
  const source = SOURCES[name];
  const target = path.join(root, 'upstream', name);
  const lockFile = path.join(root, 'upstream', `${name}.lock.json`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `octo-${name}-`));
  try {
    execFileSync('git', ['clone', '--quiet', '--depth', '1', '--branch', ref, source.repo, tmp], { stdio: 'inherit' });
    const commit = execFileSync('git', ['-C', tmp, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const previous = fs.existsSync(lockFile) ? JSON.parse(fs.readFileSync(lockFile, 'utf8')).commit : null;

    const paths = source.paths();
    const missing = (paths ?? []).filter((p) => !fs.existsSync(path.join(tmp, p)));
    if (missing.length) throw new Error(`${name}: not found upstream (renamed or removed?): ${missing.join(', ')}`);

    // Build the new copy next to the old one, then swap: a failed copy never leaves upstream/ empty.
    const staging = `${target}.staging`;
    fs.rmSync(staging, { recursive: true, force: true });
    for (const rel of paths ?? ['.']) {
      fs.cpSync(path.join(tmp, rel), path.join(staging, rel), { recursive: true, filter: (src) => path.basename(src) !== '.git' });
    }
    fs.rmSync(target, { recursive: true, force: true });
    fs.renameSync(staging, target);
    const version = source.version(tmp);
    fs.writeFileSync(lockFile, `${JSON.stringify({ repo: source.repo, ref, commit, ...(version ? { version } : {}) }, null, 2)}\n`);
    const label = `${name}${version ? ` ${version}` : ''} (${commit.slice(0, 7)})`;
    console.log(previous === commit ? `${name} already at ${label}.` : `${name} updated to ${label}${previous ? `, was ${previous.slice(0, 7)}` : ''}.`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const source = arg('source', 'all');
const ref = arg('ref', 'main');
if (source === 'all' && ref !== 'main') throw new Error('--ref needs a single --source (the repos have different tags)');
const names = source === 'all' ? Object.keys(SOURCES) : [source];
for (const name of names) {
  if (!SOURCES[name]) throw new Error(`unknown source "${name}" (expected: ${Object.keys(SOURCES).join(', ')}, all)`);
  update(name, ref);
}
console.log('Next: npm test (checks that every "complements" entry still names a superpowers skill).');
