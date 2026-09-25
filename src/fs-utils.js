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
// Keeps the file's line endings (CRLF files stay CRLF) and only writes when something changed.
export function upsertManagedBlock(file, content) {
  const existing = readIfExists(file);
  const eol = existing?.includes('\r\n') ? '\r\n' : '\n';
  const block = `${BLOCK_BEGIN}\n${content.trim()}\n${BLOCK_END}`.replace(/\r?\n/g, eol);
  let next;
  if (existing === null) {
    next = `${block}${eol}`;
  } else {
    const start = existing.indexOf(BLOCK_BEGIN);
    const end = existing.indexOf(BLOCK_END);
    next = start !== -1 && end > start
      ? existing.slice(0, start) + block + existing.slice(end + BLOCK_END.length)
      : `${existing.replace(/\s*$/, '')}${eol}${eol}${block}${eol}`;
  }
  if (next !== existing) writeFile(file, next);
}

export function removeManagedBlock(file) {
  const existing = readIfExists(file);
  if (existing === null) return;
  const start = existing.indexOf(BLOCK_BEGIN);
  const end = existing.indexOf(BLOCK_END);
  if (start === -1 || end < start) return;
  const eol = existing.includes('\r\n') ? '\r\n' : '\n';
  const rest = existing.slice(0, start) + existing.slice(end + BLOCK_END.length);
  writeFile(file, rest.replace(/(\r?\n){3,}/g, eol + eol));
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
