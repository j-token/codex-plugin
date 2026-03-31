---
description: Check Codex MCP server connectivity and status
allowed-tools:
  - mcp__codex__codex_execute_structured
---

# Codex Status Check

Verify that the Codex MCP server is running and accessible.

Call `mcp__codex__codex_execute_structured` with:

- **prompt**: "Return a status check. Confirm you are operational. Set task_type to 'ask', status to 'success', put 'Codex is operational' in result.answer, set confidence to 'high'. Leave files and issues as empty arrays, data.key_values as empty array. For metadata, set model to empty string, thread_id to empty string, tokens_used to 0."

- **output_schema**:
```json
{
  "type": "object",
  "properties": {
    "status": { "type": "string", "enum": ["success", "partial", "error"] },
    "task_type": { "type": "string", "enum": ["generate", "review", "ask"] },
    "summary": { "type": "string" },
    "result": {
      "type": "object",
      "properties": {
        "files": { "type": "array", "items": { "type": "object", "properties": { "path": { "type": "string" }, "action": { "type": "string", "enum": ["create", "modify", "delete", "review"] }, "language": { "type": "string" }, "content": { "type": "string" }, "diff": { "type": "string" } }, "required": ["path", "action", "language", "content", "diff"] } },
        "issues": { "type": "array", "items": { "type": "object", "properties": { "severity": { "type": "string", "enum": ["critical", "warning", "info", "suggestion"] }, "category": { "type": "string" }, "file": { "type": "string" }, "line": { "type": "integer" }, "message": { "type": "string" }, "fix": { "type": "string" } }, "required": ["severity", "category", "file", "line", "message", "fix"] } },
        "answer": { "type": "string" },
        "data": { "type": "object", "properties": { "key_values": { "type": "array", "items": { "type": "object", "properties": { "key": { "type": "string" }, "value": { "type": "string" } }, "required": ["key", "value"] } } }, "required": ["key_values"] }
      },
      "required": ["files", "issues", "answer", "data"]
    },
    "metadata": { "type": "object", "properties": { "model": { "type": "string" }, "thread_id": { "type": "string" }, "tokens_used": { "type": "integer" }, "confidence": { "type": "string", "enum": ["high", "medium", "low"] } }, "required": ["model", "thread_id", "tokens_used", "confidence"] }
  },
  "required": ["status", "task_type", "summary", "result", "metadata"]
}
```

## Interpreting Results

- On success: report "Codex MCP server is online. Model: [metadata.model]"
- On failure: report the error and suggest checking:
  1. codex-mcp is installed at `C:/Users/WinUser/codex-mcp`
  2. ChatGPT OAuth login is complete (`codex login`)
  3. Bun runtime is installed
