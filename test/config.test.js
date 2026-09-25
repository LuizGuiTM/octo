import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DOMAINS, defaultConfig, detectDomains, validateConfig } from '../src/config.js';
import { domainNames } from '../src/sources.js';

test('default config is valid', () => {
  assert.deepEqual(validateConfig(defaultConfig({ domains: ['web'] })), []);
});

test('rejects tiers that use models outside the allowed list', () => {
  const config = defaultConfig();
  config.models['claude-code'].tiers.deep = 'some-unapproved-model';
  const errors = validateConfig(config);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /claude-code\.tiers\.deep uses "some-unapproved-model"/);
});

test('rejects unknown targets and domains', () => {
  const config = defaultConfig();
  config.targets = ['cursor'];
  config.domains = ['cobol'];
  const errors = validateConfig(config);
  assert.ok(errors.some((e) => e.includes('unknown target "cursor"')));
  assert.ok(errors.some((e) => e.includes('unknown domain "cobol"')));
});

test('DOMAINS matches the domain directories in skills/', () => {
  assert.deepEqual([...DOMAINS].sort(), domainNames().sort());
});

test('detects domains from project files, always with the concern domains', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'octo-detect-'));
  try {
    assert.deepEqual(detectDomains(dir), ['architecture', 'security']);
    fs.writeFileSync(path.join(dir, 'sfdx-project.json'), '{}');
    fs.writeFileSync(path.join(dir, 'pyproject.toml'), '');
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { react: '^19.0.0' } }));
    assert.deepEqual(detectDomains(dir), ['architecture', 'security', 'web', 'salesforce', 'python']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
