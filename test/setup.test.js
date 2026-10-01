import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfig, validateConfig } from '../src/config.js';
import { teamSetup } from '../src/setup.js';

const scripted = (answers) => {
  const asked = [];
  return { asked, ask: async (q) => { asked.push(q); return answers.shift() ?? ''; } };
};

test('team setup: ENTER keeps every default', async () => {
  const config = defaultConfig({ domains: ['web'] });
  const { asked, ask } = scripted([]);
  await teamSetup(config, ask);
  assert.equal(asked.length, 5, 'versioning, web testing, URL, start command, branch pattern');
  assert.equal(config.framework.commit, true);
  assert.equal(config.webTesting.enabled, true);
  assert.equal(config.autonomy.branchPattern, '{type}/{topic}-octo');
  assert.deepEqual(validateConfig(config), []);
});

test('team setup: Salesforce answers fill the org alias; a pattern without {topic} is asked again', async () => {
  const config = defaultConfig({ domains: ['salesforce'] });
  const { asked, ask } = scripted(['n', 's', 'uat', 'feat-octo', 'feature/{topic}-octo']);
  await teamSetup(config, ask);
  assert.equal(config.framework.commit, false);
  assert.match(config.webTesting.startCommand, /--target-org uat/);
  assert.equal(config.autonomy.branchPattern, 'feature/{topic}-octo');
  assert.equal(asked.length, 5);
});

test('team setup: web testing off skips its follow-up questions', async () => {
  const config = defaultConfig({ domains: ['web'] });
  const { asked, ask } = scripted(['', 'n', '']);
  await teamSetup(config, ask);
  assert.equal(config.webTesting.enabled, false);
  assert.equal(asked.length, 3);
});
