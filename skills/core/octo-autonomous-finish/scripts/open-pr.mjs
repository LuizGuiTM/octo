#!/usr/bin/env node
// Pushes the current branch and (optionally) opens a pull request on GitHub or Azure DevOps. Zero dependencies.
// Usage:
//   node open-pr.mjs --title "<title>" --body-file <file.md> [--base <branch>] [--draft] [--dry-run]
//   node open-pr.mjs --push-only [--dry-run]
// Pushing is always `git push -u origin <current branch>`: never forced, never from a protected branch.
// The provider comes from the `origin` remote and needs its CLI, authenticated:
//   GitHub:       gh        (gh auth login)
//   Azure DevOps: az + azure-devops extension (az login, or AZURE_DEVOPS_EXT_PAT)
// Exit 0 = done (URL printed) or dry run; 1 = cannot (reason + exact manual commands printed); 2 = usage.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
};
const flag = (name) => process.argv.includes(`--${name}`);
const WINDOWS = process.platform === 'win32';

// On Windows, gh/az are often .cmd shims that execFile can't start directly; go through cmd.exe with
// explicit quoting (arguments never contain the PR body: Azure reads it from a file, GitHub from --body-file).
const quoteCmd = (a) => (/^[\w./:@=+-]+$/.test(a) ? a : `"${a.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1')}"`);
function run(cmd, args) {
  const options = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] };
  if (WINDOWS && cmd !== 'git') {
    return execFileSync('cmd.exe', ['/d', '/s', '/c', `"${[cmd, ...args].map(quoteCmd).join(' ')}"`], { ...options, windowsVerbatimArguments: true }).trim();
  }
  return execFileSync(cmd, args, options).trim();
}
const has = (cmd) => spawnSync(cmd, ['--version'], { stdio: 'ignore', shell: WINDOWS }).status === 0;

export function parseRemote(url) {
  let m = url.match(/github\.com[/:]([^/]+)\/(.+?)(?:\.git)?$/);
  if (m) return { provider: 'github', owner: m[1], repo: m[2] };
  m = url.match(/dev\.azure\.com[/:](?:v3\/)?([^/]+)\/([^/]+)\/(?:_git\/)?([^/]+?)(?:\.git)?$/);
  if (m) return { provider: 'azure-devops', org: `https://dev.azure.com/${m[1]}`, project: decodeURIComponent(m[2]), repo: decodeURIComponent(m[3]) };
  m = url.match(/([^/.@]+)\.visualstudio\.com[/:](?:v3\/[^/]+\/)?(?:DefaultCollection\/)?([^/]+)\/_git\/([^/]+?)(?:\.git)?$/);
  if (m) return { provider: 'azure-devops', org: `https://dev.azure.com/${m[1]}`, project: decodeURIComponent(m[2]), repo: decodeURIComponent(m[3]) };
  return { provider: 'unknown' };
}

export function prCommand(remote, { branch, base, title, bodyFile, draft }) {
  if (remote.provider === 'github') {
    return ['gh', ['pr', 'create', '--base', base, '--head', branch, '--title', title, '--body-file', bodyFile, ...(draft ? ['--draft'] : [])]];
  }
  if (remote.provider === 'azure-devops') {
    // Azure CLI reads an argument's value from a file with "@<path>".
    return ['az', ['repos', 'pr', 'create', '--organization', remote.org, '--project', remote.project, '--repository', remote.repo,
      '--source-branch', branch, '--target-branch', base, '--title', title,
      '--description', `@${path.resolve(bodyFile)}`, '--draft', draft ? 'true' : 'false', '--output', 'json']];
  }
  return null;
}

// A browser link to the provider's "create pull request" page, pre-filled with the branches. Needs no CLI:
// the fallback when gh/az are missing or not signed in (one click for the user).
export function prLink(remote, { branch, base }) {
  const e = encodeURIComponent;
  if (remote.provider === 'github') return `https://github.com/${remote.owner}/${remote.repo}/compare/${e(base)}...${e(branch)}?expand=1`;
  if (remote.provider === 'azure-devops') {
    return `${remote.org}/${e(remote.project)}/_git/${e(remote.repo)}/pullrequestcreate?sourceRef=${e(branch)}&targetRef=${e(base)}`;
  }
  return null;
}

function protectedBranches() {
  try {
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
    const config = JSON.parse(fs.readFileSync(path.join(root, 'octo.config.json'), 'utf8'));
    return config.autonomy?.protectedBranches ?? ['main', 'master', 'develop'];
  } catch {
    return ['main', 'master', 'develop'];
  }
}

function defaultBase() {
  try {
    return run('git', ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']).replace(/^origin\//, '');
  } catch {
    return 'main';
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  const pushOnly = flag('push-only');
  const title = arg('title');
  const bodyFile = arg('body-file');
  if (!pushOnly && (!title || !bodyFile || !fs.existsSync(bodyFile))) {
    console.error('usage: open-pr.mjs --title "<title>" --body-file <file.md> [--base <branch>] [--draft] [--dry-run]\n       open-pr.mjs --push-only [--dry-run]');
    process.exit(2);
  }
  const branch = run('git', ['branch', '--show-current']);
  const base = arg('base') ?? defaultBase();
  const remoteUrl = (() => { try { return run('git', ['remote', 'get-url', 'origin']); } catch { return ''; } })();
  const remote = parseRemote(remoteUrl);
  const push = ['git', ['push', '-u', 'origin', branch]];
  const pr = pushOnly ? null : prCommand(remote, { branch, base, title, bodyFile, draft: flag('draft') });
  const show = ([cmd, args]) => `${cmd} ${args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')}`;
  const manual = () => {
    console.log('Run manually:');
    console.log(`  ${show(push)}`);
    if (pr) console.log(`  ${show(pr)}`);
  };

  console.log(`provider: ${remote.provider} · branch: ${branch}${pushOnly ? ' (push only)' : ` → ${base}${flag('draft') ? ' (draft)' : ''}`}`);
  if (!branch) { console.log('detached HEAD: check out a feature branch first'); process.exit(1); }
  if (protectedBranches().includes(branch)) { console.log(`"${branch}" is a protected branch: push from a feature branch`); process.exit(1); }
  if (!pushOnly && branch === base) { console.log(`cannot open a PR from "${branch}" into itself`); process.exit(1); }
  if (!remoteUrl) { console.log('no "origin" remote'); process.exit(1); }
  if (!pushOnly && remote.provider === 'unknown') { console.log(`origin "${remoteUrl}" is not GitHub or Azure DevOps`); manual(); process.exit(1); }
  if (flag('dry-run')) {
    console.log('dry run:');
    console.log(`  ${show(push)}`);
    if (pr) console.log(`  ${show(pr)}`);
    process.exit(0);
  }

  const firstLine = (err) => String(err.stderr || err.message).trim().split(/\r?\n/).slice(0, 3).join(' | ');
  try {
    run(...push);
    console.log(`pushed: origin/${branch}`);
  } catch (err) {
    console.log(`push failed: ${firstLine(err)}`);
    manual();
    process.exit(1);
  }
  if (!pr) process.exit(0);

  // Without the provider CLI (or when it isn't signed in), hand over a one-click link instead of failing.
  const link = prLink(remote, { branch, base });
  const fallback = (reason) => {
    console.log(`PR not created automatically (${reason}).`);
    console.log(`PR link (one click, already filled in): ${link}`);
    console.log('Tip: with the Azure DevOps or GitHub MCP server enabled, the agent can create it through the MCP tool instead.');
    process.exit(0);
  };
  if (!has(pr[0])) fallback(`${pr[0]} CLI not installed`);
  try {
    const out = run(...pr);
    const url = remote.provider === 'github'
      ? out.split(/\r?\n/).pop()
      : `${remote.org}/${encodeURIComponent(remote.project)}/_git/${encodeURIComponent(remote.repo)}/pullrequest/${JSON.parse(out).pullRequestId}`;
    console.log(`PR opened: ${url}`);
  } catch (err) {
    fallback(`${pr[0]} failed: ${firstLine(err)}`);
  }
}
