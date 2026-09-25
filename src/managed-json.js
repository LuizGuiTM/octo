import path from 'node:path';
import { readIfExists, writeFile } from './fs-utils.js';

// Octo writes into JSON files the user also owns (.claude/settings.json, .vscode/settings.json, MCP configs).
// Every entry Octo adds is recorded in the manifest, so the next sync can remove exactly those entries
// and nothing the user added by hand.

export function readJson(file) {
  const raw = readIfExists(file);
  if (raw === null || raw.trim() === '') return {};
  try {
    return JSON.parse(raw);
  } catch {
    // VS Code settings allow comments and trailing commas; refuse rather than clobber the user's file.
    throw new Error(`${file} is not plain JSON (comments or trailing commas?). Fix it or remove Octo's target for it.`);
  }
}

// Writes only when the content actually changed, keeping the file's indentation and line endings.
// A file that doesn't exist is only created when there's something to put in it.
function save(file, json) {
  const raw = readIfExists(file);
  if (raw === null && isEmpty(json)) return;
  if (raw !== null && raw.trim() !== '' && JSON.stringify(JSON.parse(raw)) === JSON.stringify(json)) return;
  const indentMatch = raw?.match(/^[ \t]+(?=")/m);
  const indent = indentMatch ? (indentMatch[0].includes('\t') ? '\t' : indentMatch[0].length) : 2;
  const eol = raw?.includes('\r\n') ? '\r\n' : '\n';
  writeFile(file, `${JSON.stringify(json, null, indent)}\n`.replace(/\n/g, eol));
}

const isEmpty = (value) => value && typeof value === 'object' && Object.keys(value).length === 0;

// Map entries: json[key][name] = value. Returns the names Octo now owns.
// A name that exists but was not Octo's before is left alone and reported as a conflict.
export function syncMapEntries(root, rel, key, entries, previouslyOwned = [], conflicts = []) {
  const file = path.join(root, rel);
  const json = readJson(file);
  const map = { ...(json[key] ?? {}) };
  for (const name of previouslyOwned) delete map[name];
  const owned = [];
  for (const [name, value] of Object.entries(entries)) {
    if (name in map) {
      conflicts.push(`${rel}: "${name}" already exists and isn't managed by Octo; left unchanged`);
      continue;
    }
    map[name] = value;
    owned.push(name);
  }
  if (isEmpty(map)) delete json[key];
  else json[key] = map;
  save(file, json);
  return owned;
}

// List entries: json[a][b] = [...]; Octo's strings are added/removed without touching the others.
export function syncListEntries(root, rel, keyPath, values, previouslyOwned = []) {
  const file = path.join(root, rel);
  const json = readJson(file);
  let parent = json;
  for (const key of keyPath.slice(0, -1)) parent = parent[key] ??= {};
  const last = keyPath.at(-1);
  const kept = (parent[last] ?? []).filter((v) => !previouslyOwned.includes(v));
  const owned = values.filter((v) => !kept.includes(v));
  parent[last] = [...kept, ...owned];
  if (parent[last].length === 0) delete parent[last];
  pruneEmpty(json, keyPath.slice(0, -1));
  save(file, json);
  return owned;
}

// Claude Code hooks: json.hooks[event] = [{ matcher, hooks: [{ type, command }] }]. Octo's groups are
// recognized by their command string.
export function syncHooks(root, rel, groups, previouslyOwned = []) {
  const file = path.join(root, rel);
  const json = readJson(file);
  const hooks = json.hooks ?? {};
  const owned = [];
  for (const event of Object.keys(hooks)) {
    hooks[event] = hooks[event].filter((g) => !g.hooks?.some((h) => previouslyOwned.includes(h.command)));
    if (!hooks[event].length) delete hooks[event];
  }
  for (const { event, matcher, command } of groups) {
    (hooks[event] ??= []).push({ matcher, hooks: [{ type: 'command', command }] });
    owned.push(command);
  }
  if (isEmpty(hooks)) delete json.hooks;
  else json.hooks = hooks;
  save(file, json);
  return owned;
}

function pruneEmpty(json, keyPath) {
  for (let depth = keyPath.length; depth > 0; depth--) {
    let parent = json;
    for (const key of keyPath.slice(0, depth - 1)) parent = parent?.[key];
    const key = keyPath[depth - 1];
    if (parent && isEmpty(parent[key])) delete parent[key];
  }
}
