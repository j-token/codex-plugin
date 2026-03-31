# codex-plugin

A [Claude Code plugin](https://code.claude.com/docs/en/plugins) that integrates OpenAI Codex into Claude Code. Every result is returned as **structured JSON output** with a unified schema, making it easy to parse and process programmatically.

## Prerequisites

- [Claude Code](https://code.claude.com) v1.0.33+
- [Bun](https://bun.sh) v1.0+
- [OpenAI Codex CLI](https://github.com/openai/codex) installed globally: `npm install -g @openai/codex`
- ChatGPT OAuth login: `codex login`
- [codex-mcp](https://github.com/WinUser/codex-mcp) cloned and dependencies installed at `C:/Users/WinUser/codex-mcp`

## Installation

### Local development

```bash
claude --plugin-dir /path/to/codex-plugin
```

### Install as a plugin

```bash
claude plugin install codex-plugin@<marketplace>
```

## Skills

All skills route through `codex_execute_structured` and return the same unified JSON schema.

| Skill | Command | Description |
|-------|---------|-------------|
| **Generate** | `/codex-plugin:generate <prompt>` | Generate or modify code — new files, features, bug fixes, refactoring |
| **Review** | `/codex-plugin:review <prompt>` | Review and analyze code — quality checks, security audits, bug detection |
| **Ask** | `/codex-plugin:ask <prompt>` | General-purpose queries — explanations, comparisons, architecture discussions |
| **Status** | `/codex-plugin:codex-status` | Check Codex MCP server connectivity |

### Examples

```
/codex-plugin:generate implement a JWT authentication middleware in Express
/codex-plugin:review check src/auth.ts for security vulnerabilities
/codex-plugin:ask compare REST vs GraphQL for this project's use case
```

## Unified JSON Output Schema

Every skill returns the same JSON structure, regardless of task type. Fields not applicable to a task type are populated with empty values (empty arrays `[]` or empty strings `""`).

```json
{
  "status": "success | partial | error",
  "task_type": "generate | review | ask",
  "summary": "Brief description of what was done",
  "result": {
    "files": [
      {
        "path": "src/example.ts",
        "action": "create | modify | delete | review",
        "language": "typescript",
        "content": "full file content (on create)",
        "diff": "unified diff (on modify)"
      }
    ],
    "issues": [
      {
        "severity": "critical | warning | info | suggestion",
        "category": "security | performance | style | bug",
        "file": "src/example.ts",
        "line": 42,
        "message": "Description of the issue",
        "fix": "Suggested fix"
      }
    ],
    "answer": "Free-form text response (for ask tasks)",
    "data": {
      "key_values": [
        { "key": "metric_name", "value": "metric_value" }
      ]
    }
  },
  "metadata": {
    "model": "gpt-5.4",
    "thread_id": "thread_abc123",
    "tokens_used": 1500,
    "confidence": "high | medium | low"
  }
}
```

### Field usage by task type

| Field | generate | review | ask |
|-------|----------|--------|-----|
| `result.files` | Created/modified files | Reviewed files (`action: "review"`) | Referenced files |
| `result.issues` | Empty `[]` | Discovered issues | Empty `[]` |
| `result.answer` | Empty `""` | Empty `""` | Detailed response |
| `result.data.key_values` | Empty `[]` | Analysis metrics | Structured data points |

### Design constraints

- All fields are **required** (no optional properties) — OpenAI structured output enforces strict schema validation.
- Dynamic keys are impossible under `additionalProperties: false`, so `data` uses an array of `{key, value}` pairs instead of a freeform object.
- The schema is auto-normalized by codex-mcp: `additionalProperties: false` is recursively added to every object type.

## Plugin Structure

```
codex-plugin/
├── .claude-plugin/
│   └── plugin.json                 # Plugin manifest
├── .mcp.json                       # Bundles codex-mcp as MCP server
├── skills/
│   ├── generate/
│   │   └── SKILL.md                # Code generation/modification skill
│   ├── review/
│   │   └── SKILL.md                # Code review/analysis skill
│   └── ask/
│       └── SKILL.md                # General-purpose query skill
├── commands/
│   └── codex-status.md             # Server health check command
└── schema/
    └── unified-output-schema.json  # Unified schema reference
```

## Configuration

The plugin connects to codex-mcp via `.mcp.json`. By default, it expects codex-mcp at `C:/Users/WinUser/codex-mcp`. To change the path, edit `.mcp.json`:

```json
{
  "mcpServers": {
    "codex": {
      "command": "bun",
      "args": ["run", "--cwd", "/your/path/to/codex-mcp", "src/index.ts"]
    }
  }
}
```

### Codex parameters

Skills support these parameters through the underlying `codex_execute_structured` tool:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `model` | `gpt-5.4` | AI model to use |
| `sandbox_mode` | `read-only` | `read-only`, `workspace-write`, or `danger-full-access` |
| `reasoning_effort` | `medium` | `minimal`, `low`, `medium`, `high`, `xhigh` |
| `working_directory` | — | Path to the project directory |
| `web_search_mode` | `disabled` | `disabled`, `cached`, `live` |

## License

MIT
