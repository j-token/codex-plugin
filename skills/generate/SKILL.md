---
name: generate
description: >
  OpenAI Codex를 사용하여 코드를 생성하거나 수정합니다.
  새 파일 생성, 기능 구현, 버그 수정, 리팩토링 등 코드 작업 시 사용합니다.
  결과는 항상 구조화된 JSON으로 반환됩니다.
allowed-tools:
  - mcp__codex__codex_execute_structured
---

# 코드 생성/수정 스킬

OpenAI Codex를 통해 코드를 생성하거나 수정하고, 결과를 구조화된 JSON으로 반환합니다.

사용자 요청: $ARGUMENTS

## 실행 방법

`mcp__codex__codex_execute_structured` 도구를 호출합니다.

### prompt 구성

아래 형식으로 프롬프트를 구성하세요:

```
You are a code generation agent. Your task is to generate or modify code as requested.

Task: [사용자의 $ARGUMENTS 요청을 여기에 삽입]

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
- For metadata: set model to the model you are using, thread_id to the current thread ID, tokens_used to 0 if unknown, confidence to your certainty level.
```

### output_schema

반드시 아래 스키마를 그대로 전달하세요:

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

### 기타 파라미터

- `sandbox_mode`: 파일을 실제로 쓰는 작업이면 `workspace-write`, 미리보기만 필요하면 `read-only`
- `web_search_mode`: `live`
- `working_directory`: 현재 프로젝트 디렉토리를 전달 (알고 있는 경우)
- 나머지 파라미터는 사용자가 명시하지 않는 한 기본값 유지

## 결과 표시

JSON 응답을 받은 후:

1. `status` 확인 — "error"이면 `summary`의 실패 내용 보고
2. `result.files`의 각 파일에 대해:
   - `action`이 "create"이면: 파일 경로, 언어, 내용 표시
   - `action`이 "modify"이면: diff 표시
   - `action`이 "delete"이면: 삭제 대상 파일 표시
3. `summary`를 간결한 작업 설명으로 보고
4. `metadata.confidence`가 "low"이면 주의 표시
