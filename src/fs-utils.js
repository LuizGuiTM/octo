import fs from 'node:fs';
import path from 'node:path';

export const BLOCK_BEGIN = '<!-- octo:begin (managed by octo sync; edits inside this block are overwritten) -->';
export const BLOCK_END = '<!-- octo:end -->';

export function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

export function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

// Inserts or replaces the octo block in a file the user also edits (CLAUDE.md, copilot-instructions.md).
export function upsertManagedBlock(file, content) {
  const block = `${BLOCK_BEGIN}\n${content.trim()}\n${BLOCK_END}`;
  const existing = readIfExists(file);
  if (existing === null) {
    writeFile(file, `${block}\n`);
    return;
  }
  const start = existing.indexOf(BLOCK_BEGIN);
  const end = existing.indexOf(BLOCK_END);
  if (start !== -1 && end > start) {
    writeFile(file, existing.slice(0, start) + block + existing.slice(end + BLOCK_END.length));
  } else {
    writeFile(file, `${existing.replace(/\s*$/, '')}\n\n${block}\n`);
  }
}

export function removeManagedBlock(file) {
  const existing = readIfExists(file);
  if (existing === null) return;
  const start = existing.indexOf(BLOCK_BEGIN);
  const end = existing.indexOf(BLOCK_END);
  if (start === -1 || end < start) return;
  writeFile(file, (existing.slice(0, start) + existing.slice(end + BLOCK_END.length)).replace(/\n{3,}/g, '\n\n'));
}

export function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));
}

export function toPosix(p) {
  return p.split(path.sep).join('/');
}
