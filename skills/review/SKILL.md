---
name: review
description: >
  Review and analyze code using OpenAI Codex.
  Use for code quality checks, bug detection, security audits, performance analysis, etc.
  Results are always returned as structured JSON.
allowed-tools:
  - mcp__codex__codex_execute_structured
---

# Code Review / Analysis

Review and analyze code via OpenAI Codex, returning results as structured JSON.

User request: $ARGUMENTS

## How to Execute

Call the `mcp__codex__codex_execute_structured` tool.

### Prompt Construction

Construct the prompt in the following format:

```
You are a code review and analysis agent. Your task is to thoroughly review and analyze code.

Task: [insert user's $ARGUMENTS request here]

IMPORTANT - Structured output rules:
- Set status to "success" if review completed, "partial" if partially done, "error" if failed.
- Set task_type to "review".
- Write a concise summary of the review findings.
- For result.issues: populate with every finding. Categorize severity as:
  - critical: bugs, security vulnerabilities, data loss risks, crashes
  - warning: performance problems, potential bugs, bad practices, deprecated usage
  - info: style issues, minor improvements, readability concerns
  - suggestion: optional enhancements, alternative approaches, best practices
  - For each issue, include file path and line number when possible (use 0 if unknown).
  - Include a suggested fix in the "fix" field when you can provide one, empty string otherwise.
  - Set "category" to classify the issue (e.g. "security", "performance", "style", "bug", "error-handling").
- For result.files: populate with action "review" for each file examined. Set content and diff to empty strings.
- Set result.answer to an empty string "".
- For result.data.key_values: populate with review metrics if applicable (e.g. {"key": "total_files_reviewed", "value": "5"}), otherwise empty array.
- For metadata: set model to "gpt-5.4", thread_id to the current thread ID, tokens_used to 0 if unknown, confidence based on how thorough the analysis could be.
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

- `sandbox_mode`: always `read-only` (reviews should never modify files)
- `reasoning_effort`: `high` (for thorough analysis)
- `web_search_mode`: `live`
- `working_directory`: pass the current project directory if known
- Keep remaining parameters at defaults unless the user specifies otherwise

## Presenting Results

After receiving the JSON response:

1. Check `status`
2. Group `result.issues` by severity and display in order:
   - **Critical** issues first (with warning emphasis)
   - **Warning** issues
   - **Info** issues
   - **Suggestion** issues
3. For each issue with a `fix` field, show the suggested fix alongside
4. Report issue totals: N critical, N warning, N info, N suggestion
5. Report `summary` and `metadata.confidence`
6. If `result.data.key_values` contains metrics, display as a table
