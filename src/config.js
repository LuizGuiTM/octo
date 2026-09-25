import fs from 'node:fs';
import path from 'node:path';

export const CONFIG_FILE = 'octo.config.json';
export const TARGETS = ['claude-code', 'copilot'];
export const TIERS = ['deep', 'standard', 'fast'];
// Catalog domains a repo can enable. `core` is always installed natively and is not listed here.
export const DOMAINS = ['engineering', 'architecture', 'security', 'web', 'salesforce', 'python'];
export const DEFAULT_DOMAINS = ['engineering', 'architecture', 'security'];

// Autonomy presets. The guardrails follow them: when push/PR are allowed, Octo's open-pr.mjs script and the
// PR commands stop requiring confirmation; raw `git push` still asks and force push stays denied. See host-settings.js.
const ASK_ALWAYS = [
  'an action is destructive or hard to reverse (data loss, force push, migrations on shared data, deleting files you did not create)',
  'credentials, secrets, licenses or paid resources are needed',
  'verification keeps failing after two focused attempts',
];
export const AUTONOMY_PRESETS = ['supervised', 'balanced', 'full'];

// Branch names for the agent's work. {type} = feature | fix | docs | chore, {topic} = short kebab-case topic.
// Default keeps "octo" at the end (e.g. feature/status-filter-octo). Octo ≤ 0.1.1 used `branchPrefix`.
export const DEFAULT_BRANCH_PATTERN = '{type}/{topic}-octo';
export function branchPattern(autonomy = {}) {
  if (autonomy.branchPattern) return autonomy.branchPattern;
  if (autonomy.branchPrefix) return `${autonomy.branchPrefix}{topic}`;
  return DEFAULT_BRANCH_PATTERN;
}

export function autonomyPreset(level) {
  const base = { level, protectedBranches: ['main', 'master', 'develop'], branchPattern: DEFAULT_BRANCH_PATTERN };
  if (level === 'supervised') {
    return {
      ...base, commit: false, push: false, pullRequest: false, draftPullRequest: true,
      approvals: { spec: true, plan: true },
      askWhen: [
        'requirements are ambiguous in any way',
        'two or more designs are viable',
        'an action is outward-facing (push, PR, deploy, messages, external APIs with side effects)',
        ...ASK_ALWAYS,
      ],
    };
  }
  if (level === 'full') {
    return {
      ...base, commit: true, push: true, pullRequest: true, draftPullRequest: true,
      approvals: { spec: false, plan: false },
      askWhen: [
        'requirements are ambiguous and the choice changes user-visible behavior in a way the spec cannot settle',
        ...ASK_ALWAYS,
      ],
    };
  }
  return {
    ...base, commit: true, push: false, pullRequest: false, draftPullRequest: true,
    approvals: { spec: true, plan: false },
    askWhen: [
      'requirements are ambiguous and the choice changes user-visible behavior',
      'two or more designs are viable and they differ in cost, risk or product impact',
      'an action is outward-facing (push, PR, deploy, messages, external APIs with side effects)',
      ...ASK_ALWAYS,
    ],
  };
}

// Model names differ per host: Claude Code takes aliases or full model IDs,
// Copilot takes the display names shown in its model picker (a list = fallback order).
// Adjust `allowed` to what your company licenses; tiers may only use allowed models.
export function defaultConfig({ domains = DEFAULT_DOMAINS, targets = TARGETS } = {}) {
  return {
    $schema: './.octo/octo.config.schema.json',
    targets,
    language: {
      artifacts: 'en',
      responses: 'pt-BR',
      documents: 'pt-BR',
    },
    domains,
    upstream: {
      exclude: [],
    },
    models: {
      'claude-code': {
        allowed: ['opus', 'sonnet', 'haiku'],
        tiers: { deep: 'opus', standard: 'sonnet', fast: 'haiku' },
      },
      copilot: {
        allowed: ['Claude Opus 4.5', 'Claude Sonnet 4.5', 'Claude Haiku 4.5', 'GPT-5.2'],
        tiers: {
          deep: ['Claude Opus 4.5', 'GPT-5.2'],
          standard: ['Claude Sonnet 4.5'],
          fast: ['Claude Haiku 4.5'],
        },
      },
    },
    parallelism: {
      maxSubagents: 8,
    },
    autonomy: autonomyPreset('balanced'),
    webTesting: {
      enabled: domains.includes('web') || domains.includes('salesforce'),
      // Salesforce-only repos test in an org (scratch/sandbox), not on a local dev server.
      ...(domains.includes('salesforce') && !domains.includes('web')
        ? { baseUrl: 'org URL from `sf org open --url-only --target-org <sandbox alias>`', startCommand: 'sf project deploy start --target-org <sandbox alias>' }
        : { baseUrl: 'http://localhost:3000', startCommand: 'npm run dev' }),
      tools: {
        'claude-code': 'claude-in-chrome',
        copilot: 'playwright',
      },
    },
    dod: {
      dir: 'docs/superpowers/dod',
      extraCriteria: [],
    },
    sessions: {
      // false: session files stay local (git-ignored); true: they travel with the feature branch.
      commit: false,
    },
    guardrails: {
      commands: {
        deny: ['git push --force', 'git push -f', 'git reset --hard', 'git clean -fdx'],
        ask: ['git push', 'rm -rf', 'Remove-Item -Recurse', 'rmdir /s', 'rd /s', 'del /s', 'npm publish', 'sf project deploy start', 'terraform apply', 'kubectl delete'],
        allow: ['git status', 'git diff', 'git log'],
      },
      protectedPaths: ['**/.env', '**/.env.*', '**/*.pem', '**/*.key', '**/secrets/**'],
      maxFixRounds: 5,
    },
    mcp: {
      enable: [],
      servers: {},
    },
    imports: {
      // awesome-copilot instructions to also install natively for Copilot (.github/instructions/),
      // where they apply automatically by file glob. Off by default: several are large and apply to "**".
      nativeInstructions: [],
    },
    skills: {
      promoted: [],
    },
  };
}

export function configPath(root) {
  return path.join(root, CONFIG_FILE);
}

export function loadConfig(root) {
  const file = configPath(root);
  if (!fs.existsSync(file)) {
    throw new Error(`${CONFIG_FILE} not found in ${root}. Run "octo init" first.`);
  }
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = validateConfig(config);
  if (errors.length) {
    throw new Error(`Invalid ${CONFIG_FILE}:\n  - ${errors.join('\n  - ')}`);
  }
  return config;
}

export function writeConfig(root, config) {
  fs.writeFileSync(configPath(root), `${JSON.stringify(config, null, 2)}\n`);
}

export function validateConfig(config) {
  const errors = [];
  const targets = config.targets ?? [];
  if (!Array.isArray(targets) || targets.length === 0) errors.push('"targets" must list at least one host');
  for (const target of targets) {
    if (!TARGETS.includes(target)) {
      errors.push(`unknown target "${target}" (expected one of: ${TARGETS.join(', ')})`);
      continue;
    }
    const models = config.models?.[target];
    if (!models) {
      errors.push(`models.${target} is missing`);
      continue;
    }
    const allowed = models.allowed ?? [];
    if (!Array.isArray(allowed) || allowed.length === 0) errors.push(`models.${target}.allowed must not be empty`);
    for (const tier of TIERS) {
      const chosen = asList(models.tiers?.[tier]);
      if (chosen.length === 0) errors.push(`models.${target}.tiers.${tier} is missing`);
      for (const model of chosen) {
        if (!allowed.includes(model)) {
          errors.push(`models.${target}.tiers.${tier} uses "${model}", which is not in models.${target}.allowed`);
        }
      }
    }
  }
  for (const domain of config.domains ?? []) {
    if (!DOMAINS.includes(domain)) errors.push(`unknown domain "${domain}" (expected one of: ${DOMAINS.join(', ')})`);
  }
  const max = config.parallelism?.maxSubagents;
  if (max !== undefined && (!Number.isInteger(max) || max < 1)) errors.push('parallelism.maxSubagents must be a positive integer');
  const guardrails = config.guardrails ?? {};
  for (const kind of ['deny', 'ask', 'allow']) {
    const list = guardrails.commands?.[kind];
    if (list !== undefined && (!Array.isArray(list) || list.some((c) => typeof c !== 'string' || !c.trim()))) {
      errors.push(`guardrails.commands.${kind} must be a list of non-empty strings`);
    }
  }
  const allowed = guardrails.commands?.allow ?? [];
  for (const cmd of allowed) {
    const blocked = [...(guardrails.commands?.deny ?? []), ...(guardrails.commands?.ask ?? [])].find((c) => c.startsWith(cmd) || cmd.startsWith(c));
    if (blocked) errors.push(`guardrails.commands.allow "${cmd}" overlaps with deny/ask "${blocked}"`);
  }
  const pattern = config.autonomy?.branchPattern;
  if (pattern !== undefined && (typeof pattern !== 'string' || !pattern.includes('{topic}'))) {
    errors.push('autonomy.branchPattern must be a string containing {topic} (e.g. "{type}/{topic}-octo")');
  }
  const rounds = guardrails.maxFixRounds;
  if (rounds !== undefined && (!Number.isInteger(rounds) || rounds < 1)) errors.push('guardrails.maxFixRounds must be a positive integer');
  // Secrets must come from the environment: a secret-looking value may only contain {env:NAME} placeholders
  // (plus a scheme like "Bearer "), never a literal. Checked in env, headers, args and url.
  const SECRET_NAME = /(token|secret|password|passwd|api[_-]?key|access[_-]?key|auth)/i;
  const onlyPlaceholders = (value) => /\{env:[A-Za-z_]\w*\}/.test(value)
    && value.replace(/\{env:[A-Za-z_]\w*\}/g, '').replace(/^(Bearer|Basic|token)\s*/i, '').trim() === '';
  for (const [name, def] of Object.entries(config.mcp?.servers ?? {})) {
    for (const [key, value] of Object.entries({ ...def.env, ...def.headers })) {
      if (SECRET_NAME.test(key) && typeof value === 'string' && !onlyPlaceholders(value)) {
        errors.push(`mcp.servers.${name}: "${key}" looks like a secret; use "{env:NAME}" instead of a literal value`);
      }
    }
    for (const value of [...(def.args ?? []), def.url ?? '']) {
      const m = String(value).match(/(?:--?|[?&])([\w-]*(?:token|secret|password|api[_-]?key|key))[=:](\S+)/i);
      if (m && !onlyPlaceholders(m[2].replace(/&.*$/, ''))) {
        errors.push(`mcp.servers.${name}: "${m[1]}" in args/url looks like a literal secret; use "{env:NAME}"`);
      }
    }
  }
  return errors;
}

export function asList(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

// Infers stack domains from project files; always includes the default concern domains.
export function detectDomains(root) {
  const has = (file) => fs.existsSync(path.join(root, file));
  const found = new Set(DEFAULT_DOMAINS);
  if (has('sfdx-project.json')) found.add('salesforce');
  if (has('pyproject.toml') || has('requirements.txt') || has('setup.py') || has('Pipfile')) found.add('python');
  if (has('package.json')) {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const webSignals = ['react', 'next', 'vue', 'svelte', '@angular/core', 'express', 'fastify', '@nestjs/core', 'vite'];
    if (webSignals.some((dep) => dep in deps)) found.add('web');
  }
  return DOMAINS.filter((domain) => found.has(domain));
}
