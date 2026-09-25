import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './yaml-lite.js';
import { listFiles } from './fs-utils.js';

export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = path.join(PACKAGE_ROOT, 'skills');
const UPSTREAM = path.join(PACKAGE_ROOT, 'upstream', 'superpowers');
const UPSTREAM_LOCK = path.join(PACKAGE_ROOT, 'upstream', 'superpowers.lock.json');

export const CORE_DOMAIN = 'core';

function readSkillDir(dir, extra = {}) {
  const { data } = parseFrontmatter(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8'));
  const name = path.basename(dir);
  if (data.name !== name) throw new Error(`Skill "${dir}" must have frontmatter name "${name}" (found "${data.name}")`);
  if (!data.description) throw new Error(`Skill "${name}" is missing a description`);
  return {
    name,
    description: data.description,
    complements: data.metadata?.complements ?? [],
    dir,
    files: listFiles(dir),
    ...extra,
  };
}

function subdirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(dir, entry.name));
}

// Superpowers skills, installed verbatim. Their frontmatter is upstream's business, so read only name/description.
export function upstreamSkills(exclude = []) {
  return subdirs(path.join(UPSTREAM, 'skills'))
    .filter((dir) => !exclude.includes(path.basename(dir)))
    .map((dir) => {
      const { data } = parseFrontmatter(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8'));
      return { name: path.basename(dir), description: String(data.description ?? ''), dir, files: listFiles(dir), upstream: true };
    });
}

export function upstreamInfo() {
  const lock = JSON.parse(fs.readFileSync(UPSTREAM_LOCK, 'utf8'));
  return { ...lock, license: path.join(UPSTREAM, 'LICENSE') };
}

export function domainNames() {
  return subdirs(SKILLS).map((dir) => path.basename(dir)).filter((d) => d !== CORE_DOMAIN);
}

export function domainSkills(domains) {
  return domains.flatMap((domain) => subdirs(path.join(SKILLS, domain)).map((dir) => readSkillDir(dir, { domain })));
}

export function coreSkills() {
  return domainSkills([CORE_DOMAIN]);
}

export function agents() {
  const dir = path.join(PACKAGE_ROOT, 'agents');
  return fs.readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const { data, body } = parseFrontmatter(fs.readFileSync(path.join(dir, file), 'utf8'));
      for (const key of ['name', 'description', 'tier']) {
        if (!data[key]) throw new Error(`Agent ${file} is missing "${key}"`);
      }
      return { ...data, body };
    });
}

export function template(name) {
  return fs.readFileSync(path.join(PACKAGE_ROOT, 'templates', name), 'utf8');
}

export function schemaFile() {
  return path.join(PACKAGE_ROOT, 'schema', 'octo.config.schema.json');
}

export function render(text, vars) {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) => {
    if (!(key in vars)) throw new Error(`Unknown template variable {{${key}}}`);
    return vars[key];
  });
}
