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

// github/awesome-copilot: vendored untouched; the imports map adds each item's Octo domain and complements.
const AWESOME = path.join(PACKAGE_ROOT, 'upstream', 'awesome-copilot');
const AWESOME_IMPORTS = path.join(PACKAGE_ROOT, 'upstream', 'awesome-copilot.imports.json');
export const AWESOME_SOURCE = 'awesome-copilot';

function awesomeImports() {
  return fs.existsSync(AWESOME_IMPORTS) ? JSON.parse(fs.readFileSync(AWESOME_IMPORTS, 'utf8')) : { skills: {}, instructions: {} };
}

export function awesomeInfo() {
  const lock = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'upstream', 'awesome-copilot.lock.json'), 'utf8'));
  return { ...lock, license: path.join(AWESOME, 'LICENSE') };
}

function importedSkills(domains) {
  return Object.entries(awesomeImports().skills)
    .filter(([, meta]) => domains.includes(meta.domain))
    .map(([name, meta]) => {
      const dir = path.join(AWESOME, 'skills', name);
      const { data } = parseFrontmatter(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8'));
      return {
        name, description: String(data.description ?? ''), complements: meta.complements ?? [],
        dir, files: listFiles(dir), domain: meta.domain, tech: meta.tech ?? 'general', source: AWESOME_SOURCE,
      };
    });
}

// Imported instructions: file-glob guidance ("applyTo"), read on demand when editing matching files.
export function domainInstructions(domains) {
  return Object.entries(awesomeImports().instructions)
    .filter(([, meta]) => domains.includes(meta.domain))
    .map(([file, meta]) => {
      const full = path.join(AWESOME, 'instructions', file);
      const { data } = parseFrontmatter(fs.readFileSync(full, 'utf8'));
      return { file, name: file.replace(/\.instructions\.md$/, ''), description: String(data.description ?? ''),
        applyTo: String(data.applyTo ?? '**'), path: full, domain: meta.domain, tech: meta.tech ?? 'general', source: AWESOME_SOURCE };
    });
}

export function domainNames() {
  const own = subdirs(SKILLS).map((dir) => path.basename(dir)).filter((d) => d !== CORE_DOMAIN);
  const imported = [...Object.values(awesomeImports().skills), ...Object.values(awesomeImports().instructions)].map((m) => m.domain);
  return [...new Set([...own, ...imported])].sort();
}

// Layout: skills/core/<skill>/ and skills/<domain>/<technology>/<skill>/.
export function domainSkills(domains) {
  const own = domains.flatMap((domain) => (domain === CORE_DOMAIN
    ? subdirs(path.join(SKILLS, domain)).map((dir) => readSkillDir(dir, { domain, tech: CORE_DOMAIN, source: 'octo' }))
    : subdirs(path.join(SKILLS, domain)).flatMap((techDir) => subdirs(techDir)
      .map((dir) => readSkillDir(dir, { domain, tech: path.basename(techDir), source: 'octo' })))));
  const imported = importedSkills(domains);
  const clash = imported.find((s) => own.some((o) => o.name === s.name));
  if (clash) throw new Error(`Skill "${clash.name}" exists both in skills/ and in the awesome-copilot imports; keep one`);
  return [...own, ...imported];
}

// Chat commands (/octo-start, /octo-plan…): skills with disable-model-invocation, installed natively.
export function commandSkills() {
  return subdirs(path.join(PACKAGE_ROOT, 'commands')).map((dir) => {
    const { data } = parseFrontmatter(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8'));
    const name = path.basename(dir);
    if (data.name !== name) throw new Error(`Command "${dir}" must have frontmatter name "${name}"`);
    if (data['disable-model-invocation'] !== true) throw new Error(`Command "${name}" must set disable-model-invocation: true`);
    return { name, description: String(data.description ?? ''), argumentHint: data['argument-hint'] ?? '', complements: [], dir, files: listFiles(dir), source: 'octo' };
  });
}

export function coreSkills() {
  return domainSkills([CORE_DOMAIN]).filter((s) => s.source === 'octo');
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
