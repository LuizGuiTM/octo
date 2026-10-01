// Team questions asked by `octo init` (and `octo setup`): a few choices with the recommended default shown, so
// ENTER keeps it. Everything else stays at its default and is documented in the manual.
import { DEFAULT_BRANCH_PATTERN } from './config.js';

const yes = (answer, fallback) => (answer.trim() === '' ? fallback : /^(s|sim|y|yes)$/i.test(answer.trim()));

export async function teamSetup(config, ask) {
  const salesforceOnly = config.domains.includes('salesforce') && !config.domains.includes('web');

  // 1. Version Octo's generated files?
  const commit = config.framework?.commit !== false;
  config.framework = {
    ...config.framework,
    commit: yes(await ask(`Version Octo's generated files (skills, agents, instructions) in git? Without it, each person runs "octo sync" after cloning [${commit ? 'Y/n' : 'y/N'}] `), commit),
  };

  // 2. Web testing (one screenshot per acceptance scenario, in the Definition of Done).
  const web = config.webTesting ?? {};
  web.enabled = yes(await ask(`Test web changes in a browser, with a screenshot per scenario in the DoD? [${web.enabled ? 'Y/n' : 'y/N'}] `), Boolean(web.enabled));
  if (web.enabled && salesforceOnly) {
    const alias = (await ask('Salesforce org alias for tests (sandbox/scratch; ENTER to fill in later): ')).trim();
    if (alias) {
      web.baseUrl = `org URL from \`sf org open --url-only --target-org ${alias}\``;
      web.startCommand = `sf project deploy start --target-org ${alias}`;
    }
  } else if (web.enabled) {
    web.baseUrl = (await ask(`App URL [${web.baseUrl}]: `)).trim() || web.baseUrl;
    web.startCommand = (await ask(`Command that starts the app [${web.startCommand}]: `)).trim() || web.startCommand;
  }
  config.webTesting = web;

  // 3. Branch names.
  const current = config.autonomy?.branchPattern ?? DEFAULT_BRANCH_PATTERN;
  for (;;) {
    const pattern = (await ask(`Branch name pattern ({type} = feature|fix|docs|chore, {topic} = short topic) [${current}]: `)).trim() || current;
    if (pattern.includes('{topic}')) {
      config.autonomy = { ...config.autonomy, branchPattern: pattern };
      break;
    }
    console.log('  The pattern must contain {topic}.');
  }
  return config;
}
