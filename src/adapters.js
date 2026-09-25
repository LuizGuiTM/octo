import { asList } from './config.js';
import { stringifyFrontmatter } from './yaml-lite.js';

// Each adapter turns the neutral agent definitions and bootstrap into the host's native format.
// Skills need no adapter: both hosts read SKILL.md from .claude/skills.

export const adapters = {
  'claude-code': {
    label: 'Claude Code',
    instructionsFile: 'CLAUDE.md',
    // Claude Code imports AGENTS.md explicitly; Copilot reads it natively.
    instructionsPrefix: '@AGENTS.md\n\n',
    agentPath: (agent) => `.claude/agents/octo-${agent.name}.md`,
    agentFile(agent, config, body) {
      const model = asList(config.models['claude-code'].tiers[agent.tier])[0];
      const frontmatter = {
        name: `octo-${agent.name}`,
        description: agent.description,
        model,
        tools: agent['claude-code']?.tools,
      };
      return stringifyFrontmatter(frontmatter, body);
    },
    webTool: {
      'claude-in-chrome': 'the Claude in Chrome extension (mcp__claude-in-chrome__* tools; start the session with `claude --chrome` or run `/chrome`)',
      playwright: 'the Playwright MCP server (browser_* tools, configured in .mcp.json)',
    },
    mcp: { file: '.mcp.json', rootKey: 'mcpServers' },
  },
  copilot: {
    label: 'GitHub Copilot',
    instructionsFile: '.github/copilot-instructions.md',
    instructionsPrefix: '',
    agentPath: (agent) => `.github/agents/octo-${agent.name}.agent.md`,
    agentFile(agent, config, body) {
      const models = asList(config.models.copilot.tiers[agent.tier]);
      const frontmatter = {
        name: `octo-${agent.name}`,
        description: agent.description,
        model: models.length === 1 ? models[0] : models,
        tools: agent.copilot?.tools,
        'user-invocable': agent.userInvocable ?? false,
      };
      return stringifyFrontmatter(frontmatter, body);
    },
    webTool: {
      playwright: 'the Playwright MCP server (browser_* tools, configured in .vscode/mcp.json)',
      'claude-in-chrome': 'a browser automation MCP server (Claude in Chrome is not available in Copilot; configure Playwright instead)',
    },
    mcp: { file: '.vscode/mcp.json', rootKey: 'servers' },
  },
};

export function templateVars(config, target, extra = {}) {
  const adapter = adapters[target];
  const models = config.models[target];
  const tiers = Object.entries(models.tiers)
    .map(([tier, value]) => `- \`${tier}\`: ${asList(value).map((m) => `\`${m}\``).join(' → ')}`)
    .join('\n');
  const autonomy = config.autonomy ?? {};
  const webTool = config.webTesting?.tools?.[target] ?? 'playwright';
  return {
    host: adapter.label,
    responseLanguage: config.language?.responses ?? 'en',
    artifactLanguage: config.language?.artifacts ?? 'en',
    documentLanguage: config.language?.documents ?? config.language?.responses ?? 'en',
    allowedModels: models.allowed.map((m) => `\`${m}\``).join(', '),
    modelTiers: tiers,
    maxSubagents: String(config.parallelism?.maxSubagents ?? 8),
    commitPolicy: autonomy.commit
      ? `Commit automatically when a unit of work is verified, on a feature branch (prefix \`${autonomy.branchPrefix ?? 'octo/'}\`). Never commit directly to: ${(autonomy.protectedBranches ?? []).map((b) => `\`${b}\``).join(', ')}.`
      : 'Do not commit. Stage nothing; summarize the changes and let the user commit.',
    pushPolicy: autonomy.push ? 'Push the feature branch after committing.' : 'Do not push. Ask first.',
    prPolicy: autonomy.pullRequest ? 'Open a pull request after pushing (summary, spec link, test and web-testing evidence).' : 'Do not open pull requests. Ask first.',
    askWhen: (autonomy.askWhen ?? []).map((reason) => `- ${reason}`).join('\n'),
    webTestingEnabled: config.webTesting?.enabled ? 'enabled' : 'disabled',
    webTool: adapter.webTool[webTool] ?? webTool,
    webBaseUrl: config.webTesting?.baseUrl ?? 'http://localhost:3000',
    webStartCommand: config.webTesting?.startCommand ?? 'npm run dev',
    dodDir: config.dod?.dir ?? 'docs/superpowers/dod',
    dodExtraCriteria: (config.dod?.extraCriteria ?? []).length
      ? config.dod.extraCriteria.map((c) => `- ${c}`).join('\n')
      : '- (none)',
    ...extra,
  };
}
