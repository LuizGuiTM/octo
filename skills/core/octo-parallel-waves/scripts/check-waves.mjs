#!/usr/bin/env node
// Validates a plan's parallel waves. Zero dependencies.
// Usage: node check-waves.mjs <plan.md>
//
// Accepts superpowers' task format (preferred) with Octo's wave line added under the heading:
//   ### Task 3: Status filter API
//   **Wave:** 2 · **Depends on:** Task 1 · **Tier:** standard
//
//   **Files:**
//   - Modify: `server.mjs:14-30`
//   - Test: `test/server.test.mjs`
// Also accepts the compact form ("### T3: title", "- Wave: 2 · Depends on: T1 · Tier: standard",
// "- Files: `a`, `b`") and waves given only in a "Waves" table (| 1 | Task 1, Task 2 | …).
// Exit code 0 = valid, 1 = problems found (printed), 2 = usage error.
import fs from 'node:fs';

const TIERS = ['fast', 'standard', 'deep'];
const taskIds = (text) => [...String(text ?? '').matchAll(/\b(?:Task\s*|T)(\d+)\b/gi)].map((m) => Number(m[1]));
const stripRange = (file) => file.replace(/:\d+(-\d+)?$/, '');

function field(block, name) {
  const m = block.match(new RegExp(`\\*{0,2}${name}\\*{0,2}\\s*:\\s*\\*{0,2}\\s*([^·\\n]+)`, 'i'));
  return m?.[1].replace(/\*+/g, '').trim();
}

function filesOf(block) {
  const inline = block.match(/^\s*-\s*\*{0,2}Files\*{0,2}\s*:(.+)$/im);
  if (inline && /`/.test(inline[1])) return [...inline[1].matchAll(/`([^`]+)`/g)].map((m) => stripRange(m[1].trim()));
  const section = block.match(/^\s*\*{0,2}Files\*{0,2}\s*:\s*\*{0,2}\s*\n((?:\s*-\s.*\n?)+)/im);
  if (!section) return [];
  return [...section[1].matchAll(/`([^`]+)`/g)].map((m) => stripRange(m[1].trim()));
}

function wavesTable(markdown) {
  const waves = new Map();
  const start = markdown.search(/^\|\s*Wave\s*\|/im);
  if (start === -1) return waves;
  for (const line of markdown.slice(start).split(/\r?\n/).slice(1)) {
    if (!line.trim().startsWith('|')) break;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    const wave = Number(cells[0]);
    if (Number.isInteger(wave)) for (const id of taskIds(cells[1])) waves.set(id, wave);
  }
  return waves;
}

export function parsePlan(markdown) {
  const table = wavesTable(markdown);
  const tasks = [];
  for (const block of markdown.split(/^### /m).slice(1)) {
    const header = block.match(/^(?:Task\s+(\d+)|T(\d+))\s*[:\-–]\s*(.+)$/im);
    if (!header || block.indexOf(header[0]) !== 0) continue;
    const num = Number(header[1] ?? header[2]);
    const wave = field(block, 'Wave');
    const files = filesOf(block);
    tasks.push({
      num,
      id: header[1] ? `Task ${num}` : `T${num}`,
      title: header[3].trim(),
      wave: wave ? Number(wave) : table.get(num) ?? NaN,
      tier: field(block, 'Tier')?.toLowerCase(),
      deps: taskIds(field(block, 'Depends on')),
      files,
      verificationOnly: /verification|web scenarios|acceptance/i.test(header[3]) && files.length === 0,
    });
  }
  return tasks;
}

export function checkWaves(tasks) {
  const problems = [];
  const byNum = new Map(tasks.map((t) => [t.num, t]));
  if (!tasks.length) problems.push('no tasks found (expected "### Task N: title" headings)');
  for (const t of tasks) {
    if (!Number.isInteger(t.wave) || t.wave < 1) problems.push(`${t.id}: no wave (add "**Wave:** N" under the heading, or list it in the Waves table)`);
    if (!t.verificationOnly) {
      if (!t.files.length) problems.push(`${t.id}: no files listed ("**Files:**" with every file created, modified or tested)`);
      if (!TIERS.includes(t.tier)) problems.push(`${t.id}: "Tier" must be one of ${TIERS.join(', ')} (found "${t.tier ?? ''}")`);
    }
    for (const dep of t.deps) {
      const target = byNum.get(dep);
      if (!target) problems.push(`${t.id}: depends on unknown task ${dep}`);
      else if (Number.isInteger(t.wave) && target.wave >= t.wave) {
        problems.push(`${t.id} (wave ${t.wave}) depends on ${target.id} (wave ${target.wave}); dependencies must be in an earlier wave`);
      }
    }
  }
  const waves = new Map();
  for (const t of tasks) if (Number.isInteger(t.wave)) waves.set(t.wave, [...(waves.get(t.wave) ?? []), t]);
  for (const [wave, list] of waves) {
    const owner = new Map();
    for (const t of list) {
      for (const file of t.files) {
        if (owner.has(file)) problems.push(`wave ${wave}: ${owner.get(file)} and ${t.id} both touch \`${file}\`; chain them or merge them`);
        else owner.set(file, t.id);
      }
    }
  }
  return { problems, waves: [...waves.entries()].sort((a, b) => a[0] - b[0]) };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: check-waves.mjs <plan.md>');
    process.exit(2);
  }
  const { problems, waves } = checkWaves(parsePlan(fs.readFileSync(file, 'utf8')));
  for (const [wave, list] of waves) {
    const parallel = list.filter((t) => !t.verificationOnly).length > 1 ? 'parallel' : 'single';
    console.log(`wave ${wave} (${parallel}): ${list.map((t) => `${t.id}${t.tier ? ` [${t.tier}]` : ''}`).join(', ')}`);
  }
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`);
    for (const p of problems) console.log(`  - ${p}`);
    process.exit(1);
  }
  console.log('\nOK: waves are valid (dependencies ordered, same-wave files disjoint).');
}
