import { asList, branchPattern } from './config.js';
import { stringifyFrontmatter } from './yaml-lite.js';

// Reasoning effort per tier on Claude Code (agents may override with `claude-code: effort:`).
export const TIER_EFFORT = { deep: 'high', standard: 'medium', fast: 'low' };

// Each adapter turns the neutral agent definitions and bootstrap into the host's native format.
// Skills need no adapter: both hosts read SKILL.md from .claude/skills.

export const adapters = {
  'claude-code': {
    label: 'Claude Code',
    instructionsFile: 'CLAUDE.md',
    // Claude Code imports AGENTS.md explicitly; Copilot reads it natively.
    instructionsPrefix: '@AGENTS.md\n\n',
    agentPath: (agent) => `.claude/agents/octo-${agent.name}.md`,
    // Claude Code subagent fields: name, description, model, effort, tools, disallowedTools, skills,
    // maxTurns, color, permissionMode, memory… Host-specific fields come from the agent's `claude-code:` block.
    agentFile(agent, config, body) {
      const model = asList(config.models['claude-code'].tiers[agent.tier])[0];
      const frontmatter = {
        name: `octo-${agent.name}`,
        description: agent.description,
        model,
        effort: TIER_EFFORT[agent.tier],
        ...(agent['claude-code'] ?? {}),
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
    // Copilot custom agent fields: name, description, argument-hint, model (list = fallback order), tools,
    // agents, handoffs, user-invocable, disable-model-invocation, target… Host-specific fields come from `copilot:`.
    agentFile(agent, config, body) {
      // Copilot silently falls back to another model when a pinned name doesn't exist in the org, so models are
      // only pinned once someone confirmed the real names (models.copilot.pin = true, set by /octo-prefs).
      const models = asList(config.models.copilot.tiers[agent.tier]);
      const frontmatter = {
        name: `octo-${agent.name}`,
        description: agent.description,
        'argument-hint': agent['argument-hint'],
        model: config.models.copilot.pin ? (models.length === 1 ? models[0] : models) : undefined,
        'user-invocable': false,
        ...(agent.copilot ?? {}),
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
    modelTiers: target === 'copilot' && !models.pin
      ? `${tiers}\nThese names are **not confirmed** for this organization, so agents are **not pinned**: every subagent runs on the model the user picked in the chat. Don't choose other models yourself. When the user confirms the real names (\`/octo-prefs\`), set \`models.copilot.pin: true\` and run \`npx -y @luizguitm/octo@latest sync\`.`
      : tiers,
    maxSubagents: String(config.parallelism?.maxSubagents ?? 8),
    branchPolicy: `Work branches are named \`${branchPattern(autonomy)}\` ({type} = feature | fix | docs | chore; {topic} = short kebab-case topic), e.g. \`${branchPattern(autonomy).replace('{type}', 'feature').replace('{topic}', 'status-filter')}\` or \`${branchPattern(autonomy).replace('{type}', 'fix').replace('{topic}', 'discount-error')}\`. Never work directly on: ${(autonomy.protectedBranches ?? []).map((b) => `\`${b}\``).join(', ')}.`,
    commitPolicy: autonomy.commit
      ? 'Commit automatically on the work branch when a unit of work is verified.'
      : 'Do not commit. Stage nothing; summarize the changes and let the user commit.',
    pushPolicy: autonomy.push
      ? 'Push the feature branch after committing, only through `node .claude/skills/octo-autonomous-finish/scripts/open-pr.mjs --push-only` (or the PR flow). Never run `git push` yourself; force pushes are forbidden.'
      : 'Do not push. Ask first.',
    prPolicy: autonomy.pullRequest
      ? `Open a${autonomy.draftPullRequest ? ' **draft**' : ''} pull request after pushing, without asking, with \`node .claude/skills/octo-autonomous-finish/scripts/open-pr.mjs\` (GitHub or Azure DevOps, detected from \`origin\`). If it can't (CLI missing or not authenticated), report its output and the manual commands; don't retry blindly.`
      : 'Do not open pull requests. Ask first.',
    autonomyLevel: autonomy.level ?? 'custom',
    approvalsPolicy: [
      autonomy.approvals?.spec === false
        ? '- Design (spec or bounded in-chat design): **no approval wait**. This standing instruction from your human partner is the approval brainstorming\'s HARD-GATE asks for: self-review the design against the request, record "approved by standing autonomy policy" in the spec or session, and continue. Still ask if a point in "ask when" applies.'
        : '- Design (spec or bounded in-chat design): wait for the user\'s approval, as brainstorming\'s HARD-GATE says.',
      autonomy.approvals?.plan === true
        ? '- Plan: wait for the user\'s review before executing.'
        : '- Plan: this policy is your human partner\'s standing plan approval; execute right after the plan passes `check-waves` and self-review.',
      '- Execution method: always **subagent-driven with parallel waves** (`octo-parallel-waves`); don\'t ask which one.',
      autonomy.pullRequest || autonomy.push
        ? '- Finishing: follow the git policy below instead of presenting superpowers\' merge/PR menu. Never merge into a protected branch or discard work without asking.'
        : '- Finishing: present superpowers\' options after committing; "keep the branch" is the safe default.',
    ].join('\n'),
    askWhen: (autonomy.askWhen ?? []).map((reason) => `- ${reason}`).join('\n'),
    rigorLevel: config.rigor ?? 'proportional',
    rigorPolicy: (config.rigor ?? 'proportional') === 'strict'
      ? [
        '- Full superpowers rigor: TDD for every change, spec and quality review per task, full test suite after every wave.',
        '- Salesforce: `RunLocalTests` validation before the final commit.',
      ].join('\n')
      : [
        '- **Test what changed, once.** TDD for new behavior and bug fixes (the failing test first), but while working run only the tests of the code you touched. Run the full suite **once**, before the final commit.',
        '- **Salesforce orgs are slow and shared:** run only the test classes of the classes you changed (`sf apex run test --class-names A,B` / `RunSpecifiedTests`). Never `RunLocalTests` or all-org runs unless asked. Deploy only the changed metadata (`--source-dir` of those paths), not the whole project.',
        '- **Reviews:** one review of the whole diff at the end. Per-task reviews only for `deep`-tier tasks or plans with more than 6 tasks.',
        '- **Integration gate per wave:** the tests of the files the wave touched, not the full suite.',
        '- **Web scenarios:** once, at the end (`/octo-test-web`), only the scenarios the change affects.',
        '- **Don\'t re-verify** what hasn\'t changed since the last green run, and don\'t add tests for untouched legacy code.',
        '- Never skip: the regression test for a bug, the final full-suite run, the DoD evidence.',
      ].join('\n'),
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
