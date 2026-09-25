import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter, parseYaml, stringifyFrontmatter } from '../src/yaml-lite.js';

test('parses scalars, inline lists and nested maps', () => {
  const data = parseYaml([
    'name: explorer',
    'description: "Use when: exploring"',
    'tier: fast',
    'count: 3',
    'flag: false',
    'metadata:',
    '  phases: [plan, execute]',
    'claude-code:',
    '  tools: Read, Grep',
  ].join('\n'));
  assert.deepEqual(data, {
    name: 'explorer',
    description: 'Use when: exploring',
    tier: 'fast',
    count: 3,
    flag: false,
    metadata: { phases: ['plan', 'execute'] },
    'claude-code': { tools: 'Read, Grep' },
  });
});

test('parses block lists', () => {
  assert.deepEqual(parseYaml('items:\n  - a\n  - "b, c"\n'), { items: ['a', 'b, c'] });
});

test('frontmatter round-trips through stringify', () => {
  const data = { name: 'octo-x', description: 'Has: colons, and "quotes"', model: ['Claude Opus 4.5', 'GPT-5.2'], 'user-invocable': false };
  const md = stringifyFrontmatter(data, 'Body\n');
  const parsed = parseFrontmatter(md);
  assert.deepEqual(parsed.data, data);
  assert.equal(parsed.body.trim(), 'Body');
});

test('returns empty data when there is no frontmatter', () => {
  assert.deepEqual(parseFrontmatter('# Title\n'), { data: {}, body: '# Title\n' });
});
