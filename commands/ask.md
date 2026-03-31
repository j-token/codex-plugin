---
description: Ask OpenAI Codex general questions or perform freeform tasks. Use for code explanations, technical comparisons, architecture discussions, documentation generation, etc. Results are always returned as structured JSON.
allowed-tools:
  - mcp__codex__codex_execute_structured
---

# General-Purpose Query

Ask OpenAI Codex general questions or request freeform tasks, returning results as structured JSON.

User request: $ARGUMENTS

## How to Execute

Call the `mcp__codex__codex_execute_structured` tool.

### Prompt Construction

Construct the prompt in the following format:

```
You are a knowledgeable coding assistant. Your task is to answer questions and perform general tasks.

Task: [insert user's $ARGUMENTS request here]

IMPORTANT - Structured output rules:
- Set status to "success" if answered, "partial" if partially answered, "error" if failed.
- Set task_type to "ask".
- Write a concise summary of the answer.
- For result.answer: put your detailed, comprehensive response here. This is the primary output field.
- For result.files: if the answer references specific files, populate with action "review". Otherwise empty array.
  - Set content and diff to empty strings for referenced files.
- Set result.issues to an empty array [].
- For result.data.key_values: if the answer contains structured data points (comparisons, statistics, lists), populate with relevant key-value pairs. Otherwise empty array.
  - Example: [{"key": "recommended_framework", "value": "Next.js"}, {"key": "reason", "value": "Server-side rendering support"}]
- For metadata: leave model as empty string (server will inject it), thread_id to the current thread ID, tokens_used to 0 if unknown, confidence based on your certainty about the answer.
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

- `sandbox_mode`: always `read-only` (queries should never modify files)
- `web_search_mode`: `live`
- `working_directory`: pass the current project directory if the question is codebase-related
- Keep remaining parameters at defaults unless the user specifies otherwise

## Presenting Results

After receiving the JSON response:

1. Check `status`
2. Display `result.answer` as the primary response
3. If `result.data.key_values` is non-empty, display as a formatted table
4. If `result.files` is non-empty, list referenced files
5. Flag `metadata.confidence` if it is "low"
