// Minimal YAML subset used by skill/agent frontmatter.
// Supports: scalars, quoted strings, inline [a, b] lists, nested maps and "- item" lists by indentation.
// Deliberately tiny so the framework has zero runtime dependencies.

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontmatter(markdown) {
  const match = markdown.match(FRONTMATTER);
  if (!match) return { data: {}, body: markdown };
  return { data: parseYaml(match[1]), body: markdown.slice(match[0].length) };
}

export function stringifyFrontmatter(data, body) {
  return `---\n${stringifyYaml(data)}---\n\n${body.replace(/^\s+/, '')}`;
}

export function parseYaml(text) {
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '' && !line.trim().startsWith('#'));
  let i = 0;

  const indentOf = (line) => line.match(/^ */)[0].length;
  const isListItem = (line) => /^\s*-(\s|$)/.test(line);

  function parseBlock(indent) {
    if (isListItem(lines[i])) {
      const list = [];
      while (i < lines.length && indentOf(lines[i]) === indent && isListItem(lines[i])) {
        list.push(scalar(lines[i].trim().slice(1)));
        i++;
      }
      return list;
    }
    const map = {};
    while (i < lines.length && indentOf(lines[i]) === indent) {
      const match = lines[i].trim().match(/^([^:]+):(.*)$/);
      if (!match) throw new Error(`Invalid YAML line: "${lines[i].trim()}"`);
      const key = match[1].trim();
      const rest = match[2];
      i++;
      if (rest.trim() !== '') {
        map[key] = scalar(rest);
      } else if (i < lines.length && indentOf(lines[i]) > indent) {
        map[key] = parseBlock(indentOf(lines[i]));
      } else if (i < lines.length && indentOf(lines[i]) === indent && isListItem(lines[i])) {
        map[key] = parseBlock(indent);
      } else {
        map[key] = null;
      }
    }
    return map;
  }

  return lines.length ? parseBlock(indentOf(lines[0])) : {};
}

function scalar(raw) {
  const v = raw.trim();
  if (v === '') return '';
  if (v.startsWith('"') && v.endsWith('"')) return JSON.parse(v);
  if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    return inner ? splitTopLevel(inner).map(scalar) : [];
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~') return null;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function splitTopLevel(text) {
  const parts = [];
  let current = '';
  let quote = null;
  for (const ch of text) {
    if (quote) {
      if (ch === quote) quote = null;
      current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === ',') {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

export function stringifyYaml(data, indent = 0) {
  const pad = ' '.repeat(indent);
  let out = '';
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      out += `${pad}${key}: [${value.map(quoteScalar).join(', ')}]\n`;
    } else if (value !== null && typeof value === 'object') {
      out += `${pad}${key}:\n${stringifyYaml(value, indent + 2)}`;
    } else {
      out += `${pad}${key}: ${quoteScalar(value)}\n`;
    }
  }
  return out;
}

function quoteScalar(value) {
  if (typeof value !== 'string') return String(value);
  const plain = /^[A-Za-z0-9_./@-][A-Za-z0-9_./@ ()-]*$/.test(value) && !/^(true|false|null|~|-?\d+(\.\d+)?)$/.test(value);
  return plain ? value : JSON.stringify(value);
}
