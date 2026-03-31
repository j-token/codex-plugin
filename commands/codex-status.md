---
description: Codex MCP 서버 연결 상태 및 설정을 확인합니다
allowed-tools:
  - mcp__codex__codex_execute_structured
---

# Codex 상태 확인

Codex MCP 서버가 정상적으로 동작하는지 확인합니다.

`mcp__codex__codex_execute_structured` 도구를 호출하세요:

- **prompt**: "Return a status check. Confirm you are operational. Set task_type to 'ask', status to 'success', put 'Codex is operational' in result.answer, set confidence to 'high'. Leave files and issues as empty arrays, data.key_values as empty array. For metadata, report the model name you are using."

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

## 결과 해석

- 호출 성공 시: "Codex MCP 서버 정상. 모델: [metadata.model]" 보고
- 호출 실패 시: 오류 내용을 보고하고, 다음을 확인하도록 안내:
  1. codex-mcp가 설치되어 있는지 (`C:/Users/WinUser/codex-mcp`)
  2. `codex login`으로 ChatGPT OAuth 로그인이 완료되었는지
  3. Bun 런타임이 설치되어 있는지
