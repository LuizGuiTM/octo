#!/usr/bin/env node
// Octo session continuity. Installed by `octo sync` into .octo/bin/; zero dependencies.
// Usage:
//   node .octo/bin/octo-session.mjs status             show the active session(s), current branch first
//   node .octo/bin/octo-session.mjs new <topic>        create a session file for the current branch
//   node .octo/bin/octo-session.mjs close <file|slug>  mark a session as done
//   node .octo/bin/octo-session.mjs hook session-start Claude Code SessionStart hook (JSON output)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SESSIONS = path.join(ROOT, '.octo', 'sessions');
const TEMPLATE = path.join(ROOT, '.octo', 'templates', 'session.md');

// Local time, so timestamps match what the developer sees.
function local(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
const today = () => local().slice(0, 10);
const now = () => local();

function git(...args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

// `branch --show-current` also works before the first commit; detached HEAD falls back to the short hash.
function currentBranch() {
  return git('branch', '--show-current') || git('rev-parse', '--short', 'HEAD');
}

function parse(file) {
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const meta = {};
  for (const line of (match?.[1] ?? '').split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  }
  const section = (title) => (text.match(new RegExp(`## ${title}\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |$)`))?.[1] ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
  return { file, rel: path.relative(ROOT, file).split(path.sep).join('/'), text, meta, section };
}

function sessions() {
  if (!fs.existsSync(SESSIONS)) return [];
  return fs.readdirSync(SESSIONS)
    .filter((f) => f.endsWith('.md'))
    .map((f) => parse(path.join(SESSIONS, f)));
}

function setMeta(file, updates) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [key, value] of Object.entries(updates)) {
    const re = new RegExp(`^${key}:.*$`, 'm');
    text = re.test(text) ? text.replace(re, `${key}: ${value}`) : text.replace(/^---\r?\n/, `---\n${key}: ${value}\n`);
  }
  fs.writeFileSync(file, text);
}

function describe(s, full) {
  const m = s.meta;
  const lines = [
    `Session: ${s.rel} (status: ${m.status}, branch: ${m.branch || '?'}, phase: ${m.phase || '?'}, updated: ${m.updated || '?'})`,
  ];
  if (m.plan) lines.push(`Plan: ${m.plan}${m['sdd-workspace'] ? ` · SDD ledger: ${m['sdd-workspace']}/progress.md` : ''}`);
  const next = s.section('Next step');
  lines.push(`Next step: ${next ? next.split(/\r?\n/)[0] : '(not recorded yet; write one now)'}`);
  if (full) lines.push('', s.text.trim());
  return lines.join('\n');
}

function statusText() {
  const branch = currentBranch();
  const active = sessions().filter((s) => s.meta.status === 'active' || s.meta.status === 'paused');
  if (!active.length) return 'Octo: no active session. Start one with `node .octo/bin/octo-session.mjs new <topic>` when you begin non-trivial work.';
  const mine = active.filter((s) => s.meta.branch === branch);
  const others = active.filter((s) => s.meta.branch !== branch);
  const out = [];
  if (mine.length) {
    out.push(`Octo: resuming the session for branch "${branch}". Read it, summarize where you are to the user in one or two lines, and continue from "Next step".`);
    out.push(...mine.map((s) => describe(s, true)));
  } else {
    out.push(`Octo: no session for the current branch "${branch}".`);
  }
  if (others.length) {
    out.push('', 'Other open sessions (other branches; do not work on them unless asked):');
    out.push(...others.map((s) => `- ${describe(s, false).split('\n')[0]}`));
  }
  return out.join('\n');
}

function slugify(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function create(topic) {
  if (!topic) throw new Error('usage: octo-session.mjs new <topic>');
  const branch = currentBranch();
  const clash = sessions().find((s) => s.meta.status === 'active' && s.meta.branch === branch);
  if (clash) throw new Error(`branch "${branch}" already has an active session: ${clash.rel}. Close it first or switch branches.`);
  fs.mkdirSync(SESSIONS, { recursive: true });
  const file = path.join(SESSIONS, `${today()}-${slugify(topic)}.md`);
  if (fs.existsSync(file)) throw new Error(`session already exists: ${path.relative(ROOT, file)}`);
  const template = fs.readFileSync(TEMPLATE, 'utf8');
  fs.writeFileSync(file, template
    .replaceAll('{{topic}}', topic)
    .replaceAll('{{branch}}', branch)
    .replaceAll('{{date}}', today())
    .replaceAll('{{now}}', now()));
  console.log(path.relative(ROOT, file).split(path.sep).join('/'));
}

function close(ref) {
  const s = sessions().find((x) => x.rel === ref || x.rel.endsWith(`/${ref}`) || x.rel.endsWith(`/${ref}.md`) || x.rel.includes(ref ?? '\0'));
  if (!s) throw new Error(`no session matches "${ref}"`);
  setMeta(s.file, { status: 'done', updated: now() });
  console.log(`closed ${s.rel}`);
}

const [command, arg] = process.argv.slice(2);
try {
  if (command === 'status' || command === undefined) console.log(statusText());
  else if (command === 'new') create(process.argv.slice(3).join(' '));
  else if (command === 'close') close(arg);
  else if (command === 'hook' && arg === 'session-start') {
    // Claude Code SessionStart: inject the session state as additional context.
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: statusText() } }));
  } else {
    throw new Error(`unknown command "${command}"`);
  }
} catch (err) {
  if (command === 'hook') process.exit(0); // never break the host's session start
  console.error(`octo-session: ${err.message}`);
  process.exit(1);
}
