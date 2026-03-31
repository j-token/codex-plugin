---
name: generate
description: >
  Generate or modify code using OpenAI Codex.
  Use for creating new files, implementing features, fixing bugs, refactoring, etc.
  Results are always returned as structured JSON.
allowed-tools:
  - mcp__codex__codex_execute_structured
---

# Code Generation / Modification

Generate or modify code via OpenAI Codex, returning results as structured JSON.

User request: $ARGUMENTS

## How to Execute

Call the `mcp__codex__codex_execute_structured` tool.

### Prompt Construction

Construct the prompt in the following format:

```
You are a code generation agent. Your task is to generate or modify code as requested.

Task: [insert user's $ARGUMENTS request here]

IMPORTANT - Structured output rules:
- Set status to "success" if completed, "partial" if partially done, "error" if failed.
- Set task_type to "generate".
- Write a concise summary of what you did.
- For result.files: populate with every file you create or modify.
  - action "create": put full file content in "content", set "diff" to empty string.
  - action "modify": put unified diff in "diff", set "content" to empty string.
  - action "delete": set both "content" and "diff" to empty string.
  - Always fill "language" with the programming language (e.g. "typescript", "python").
- Set result.issues to an empty array [].
- Set result.answer to an empty string "".
- Set result.data.key_values to an empty array [].
- For metadata: leave model as empty string (server will inject it), thread_id to the current thread ID, tokens_used to 0 if unknown, confidence to your certainty level.
```

### output_schema

Always pass the following schema exactly as-is:

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
        "files": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "path": { "type": "string" },
              "action": { "type": "string", "enum": ["create", "modify", "delete", "review"] },
              "language": { "type": "string" },
              "content": { "type": "string" },
              "diff": { "type": "string" }
            },
            "required": ["path", "action", "language", "content", "diff"]
          }
        },
        "issues": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "severity": { "type": "string", "enum": ["critical", "warning", "info", "suggestion"] },
              "category": { "type": "string" },
              "file": { "type": "string" },
              "line": { "type": "integer" },
              "message": { "type": "string" },
              "fix": { "type": "string" }
            },
            "required": ["severity", "category", "file", "line", "message", "fix"]
          }
        },
        "answer": { "type": "string" },
        "data": {
          "type": "object",
          "properties": {
            "key_values": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "key": { "type": "string" },
                  "value": { "type": "string" }
                },
                "required": ["key", "value"]
              }
            }
          },
          "required": ["key_values"]
        }
      },
      "required": ["files", "issues", "answer", "data"]
    },
    "metadata": {
      "type": "object",
      "properties": {
        "model": { "type": "string" },
        "thread_id": { "type": "string" },
        "tokens_used": { "type": "integer" },
        "confidence": { "type": "string", "enum": ["high", "medium", "low"] }
      },
      "required": ["model", "thread_id", "tokens_used", "confidence"]
    }
  },
  "required": ["status", "task_type", "summary", "result", "metadata"]
}
```

### Other Parameters

- `sandbox_mode`: `workspace-write` if files need to be written, `read-only` for preview only
- `web_search_mode`: `live`
- `working_directory`: pass the current project directory if known
- Keep remaining parameters at defaults unless the user specifies otherwise

## Presenting Results

After receiving the JSON response:

1. Check `status` — if "error", report the failure from `summary`
2. For each file in `result.files`:
   - If `action` is "create": show file path, language, and content
   - If `action` is "modify": show the diff
   - If `action` is "delete": show the target file for deletion
3. Report `summary` as a concise description of what was done
4. Flag `metadata.confidence` if it is "low"
