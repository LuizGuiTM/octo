#!/usr/bin/env node
// Checks a Definition of Done document before the final commit. Zero dependencies.
// Usage: node check-dod.mjs <DoD.md> [--plan <plan.md>]
// Fails (exit 1) when the evidence doesn't support the status:
//   - a scenario marked PASS without evidence, or with a screenshot link that is missing/empty
//   - status DONE with a FAIL scenario or an unticked checklist item that isn't waived/n-a
//   - a scenario ID from the plan's "Acceptance scenarios" table missing in the DoD
//   - screenshots in the folder that the document never references (warning only)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DONE = /\b(CONCLU[IÍ]DO|DONE)\b/i;
const NOT_DONE = /\b(N[AÃ]O CONCLU[IÍ]DO|NOT DONE)\b/i;
const PASS = /(PASSOU|PASS\b|✅)/i;
const FAIL = /(FALHOU|FAIL\b|❌)/i;
const WAIVED = /\b(n\/a|dispensad|waived|não aplic|nao aplic|not applicable)/i;
const IMAGE = /\.(png|jpe?g|gif|webp)$/i;

const safeDecode = (link) => {
  try {
    return decodeURI(link);
  } catch {
    return link;
  }
};

const tableRows = (text, header) => {
  const start = text.search(header);
  if (start === -1) return [];
  const lines = text.slice(start).split(/\r?\n/).slice(1);
  const rows = [];
  let inTable = false;
  for (const line of lines) {
    if (line.trim().startsWith('|')) {
      inTable = true;
      if (!/^\|\s*-/.test(line.trim()) && !/^\|\s*ID\s*\|/i.test(line.trim())) rows.push(line.split('|').slice(1, -1).map((c) => c.trim()));
    } else if (inTable) break;
  }
  return rows;
};

export function checkDod(file, planFile) {
  const problems = [];
  const warnings = [];
  const dir = path.dirname(file);
  const text = fs.readFileSync(file, 'utf8');
  const statusLine = text.split(/\r?\n/).find((l) => /^\|\s*Status\s*\|/i.test(l)) ?? '';
  const status = NOT_DONE.test(statusLine) ? 'not-done' : DONE.test(statusLine) ? 'done' : 'unknown';
  if (status === 'unknown') problems.push('status line not found or not CONCLUÍDO/NÃO CONCLUÍDO (DONE/NOT DONE)');

  const scenarios = tableRows(text, /^##\s+(Cenários|Scenarios)\s*$/im);
  if (!scenarios.length) problems.push('no scenario table found under "## Cenários" / "## Scenarios"');
  const linked = new Set();
  for (const [id, , type = '', result = '', evidence = ''] of scenarios) {
    if (!/^S\d+/.test(id)) continue;
    const links = [...evidence.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
    for (const link of links.filter((l) => !/^[a-z][a-z0-9+.-]*:/i.test(l))) { // URLs (CI runs…) aren't files
      const target = path.join(dir, safeDecode(link));
      linked.add(path.normalize(target));
      if (!fs.existsSync(target)) problems.push(`${id}: evidence link "${link}" does not exist`);
      else if (fs.statSync(target).size === 0) problems.push(`${id}: evidence file "${link}" is empty`);
    }
    if (PASS.test(result)) {
      if (/web/i.test(type) && !links.some((l) => IMAGE.test(l))) problems.push(`${id}: web scenario marked PASS without a screenshot link`);
      if (!/web/i.test(type) && !links.length && evidence.replace(/[-–\s]/g, '').length < 5) problems.push(`${id}: marked PASS without evidence`);
    }
    if (FAIL.test(result) && status === 'done') problems.push(`${id}: FAIL scenario but the status says DONE`);
    if (!PASS.test(result) && !FAIL.test(result)) problems.push(`${id}: result must be PASSOU/FALHOU (PASS/FAIL), found "${result}"`);
  }
  for (const m of text.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(m[1])) continue;
    const target = path.join(dir, safeDecode(m[1]));
    linked.add(path.normalize(target));
    if (!fs.existsSync(target)) problems.push(`embedded image "${m[1]}" does not exist`);
  }

  if (status === 'done') {
    const checklist = text.slice(text.search(/^##\s+Checklist/im));
    for (const line of checklist.split(/\r?\n/).slice(1)) {
      if (/^##\s/.test(line)) break;
      if (/^\s*-\s*\[ \]/.test(line) && !WAIVED.test(line)) problems.push(`status DONE but checklist item is open: ${line.trim()}`);
    }
  }

  if (planFile) {
    const planIds = tableRows(fs.readFileSync(planFile, 'utf8'), /^##\s+Acceptance scenarios\s*$/im).map((r) => r[0]).filter((id) => /^S\d+/.test(id));
    const dodIds = new Set(scenarios.map((r) => r[0]));
    for (const id of planIds) if (!dodIds.has(id)) problems.push(`${id} is in the plan's acceptance scenarios but missing from the DoD`);
  }

  const shots = path.join(dir, 'screenshots');
  if (fs.existsSync(shots)) {
    for (const f of fs.readdirSync(shots).filter((n) => IMAGE.test(n))) {
      if (!linked.has(path.normalize(path.join(shots, f)))) warnings.push(`screenshots/${f} is not referenced by the document`);
    }
  }
  try {
    const untracked = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split(/\r?\n/).filter((l) => l.startsWith('??')).map((l) => l.slice(3)).filter((p) => IMAGE.test(p) && !p.includes('/dod/') && !p.startsWith('.octo/evidence/'));
    for (const p of untracked) warnings.push(`stray screenshot outside the DoD folder: ${p}`);
  } catch { /* not a git repo */ }

  return { status, scenarios: scenarios.length, problems, warnings };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const file = process.argv[2];
  const planIndex = process.argv.indexOf('--plan');
  if (!file) {
    console.error('usage: check-dod.mjs <DoD.md> [--plan <plan.md>]');
    process.exit(2);
  }
  const r = checkDod(file, planIndex !== -1 ? process.argv[planIndex + 1] : undefined);
  console.log(`status: ${r.status} · scenarios: ${r.scenarios}`);
  for (const w of r.warnings) console.log(`  warning: ${w}`);
  if (r.problems.length) {
    console.log(`${r.problems.length} problem(s):`);
    for (const p of r.problems) console.log(`  - ${p}`);
    process.exit(1);
  }
  console.log('OK: the evidence supports the status.');
}
