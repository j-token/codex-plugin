---
name: ask
description: >
  OpenAI Codex에 일반적인 질문을 하거나 범용 작업을 수행합니다.
  코드 설명, 기술 비교, 아키텍처 논의, 문서 생성 등에 사용합니다.
  결과는 항상 구조화된 JSON으로 반환됩니다.
allowed-tools:
  - mcp__codex__codex_execute_structured
---

# 범용 질의 스킬

OpenAI Codex에 일반적인 질문이나 범용 작업을 요청하고, 결과를 구조화된 JSON으로 반환합니다.

사용자 요청: $ARGUMENTS

## 실행 방법

`mcp__codex__codex_execute_structured` 도구를 호출합니다.

### prompt 구성

아래 형식으로 프롬프트를 구성하세요:

```
You are a knowledgeable coding assistant. Your task is to answer questions and perform general tasks.

Task: [사용자의 $ARGUMENTS 요청을 여기에 삽입]

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
- For metadata: set model to the model you are using, thread_id to the current thread ID, tokens_used to 0 if unknown, confidence based on your certainty about the answer.
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

- `sandbox_mode`: 항상 `read-only` (질의는 파일을 수정하지 않음)
- `working_directory`: 코드베이스 관련 질문이면 현재 프로젝트 디렉토리를 전달
- 나머지 파라미터는 사용자가 명시하지 않는 한 기본값 유지

## 결과 표시

JSON 응답을 받은 후:

1. `status` 확인
2. `result.answer`를 주요 응답으로 표시
3. `result.data.key_values`가 비어있지 않으면 테이블 형태로 정리하여 표시
4. `result.files`가 비어있지 않으면 참조된 파일 목록 표시
5. `metadata.confidence`가 "low"이면 주의 표시
