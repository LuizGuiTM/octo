# MCP registry

Company-wide MCP servers that any repo can enable with `"mcp": { "enable": ["<name>"] }` in
`octo.config.json`. `octo sync` writes them to `.mcp.json` (Claude Code) and `.vscode/mcp.json` (Copilot),
and installs the optional usage skill natively.

```
mcp/<name>/
├─ server.json          required
└─ skill/SKILL.md       optional: when and how agents should query this server (name: octo-mcp-<name>)
```

## server.json
```jsonc
{
  "description": "One line: what the server gives the agent",
  "usage": "When to use it (shown in the instructions block if there is no skill)",
  "command": "uvx",                       // stdio server…
  "args": ["some-mcp", "--repo", "{workspace}"],
  "env": { "API_TOKEN": "{env:SOME_TOKEN}" },
  // …or an HTTP server instead of command/args:
  // "url": "https://mcp.example.com/mcp", "headers": { "Authorization": "Bearer {env:SOME_TOKEN}" },
  "hosts": ["claude-code", "copilot"]     // optional; default: all configured hosts
}
```
Placeholders are translated per host:
| Placeholder | Claude Code (`.mcp.json`) | Copilot (`.vscode/mcp.json`) |
|---|---|---|
| `{env:NAME}` | `${NAME}` | `${env:NAME}` |
| `{workspace}` | `.` | `${workspaceFolder}` |

**Never put secrets in these files**: use `{env:NAME}`; the developer sets the variable locally.

## Usage skill
Write it like any Octo skill (see `octo-skill-domains`). `metadata.complements` should name the superpowers
skills where querying the server pays off, typically `brainstorming`, `writing-plans`, `systematic-debugging`
and `requesting-code-review`. Tell the agent to query the server **before** grepping around, what to ask,
and how to confirm the answer in the code.

Per-repo servers that aren't worth sharing can be declared inline in `octo.config.json` under
`mcp.servers` with the same fields (no skill; use `usage`).

`_example/` shows the layout and is never installed.
