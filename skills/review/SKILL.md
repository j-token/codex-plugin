---
name: review
description: >
  OpenAI Codex를 사용하여 코드를 리뷰하고 분석합니다.
  코드 품질 검사, 버그 탐지, 보안 감사, 성능 분석 등에 사용합니다.
  결과는 항상 구조화된 JSON으로 반환됩니다.
allowed-tools:
  - mcp__codex__codex_execute_structured
---

# 코드 리뷰/분석 스킬

OpenAI Codex를 통해 코드를 리뷰하고 분석하며, 결과를 구조화된 JSON으로 반환합니다.

사용자 요청: $ARGUMENTS

## 실행 방법

`mcp__codex__codex_execute_structured` 도구를 호출합니다.

### prompt 구성

아래 형식으로 프롬프트를 구성하세요:

```
You are a code review and analysis agent. Your task is to thoroughly review and analyze code.

Task: [사용자의 $ARGUMENTS 요청을 여기에 삽입]

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
- For metadata: set model to the model you are using, thread_id to the current thread ID, tokens_used to 0 if unknown, confidence based on how thorough the analysis could be.
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

- `sandbox_mode`: 항상 `read-only` (리뷰는 파일을 수정하지 않음)
- `reasoning_effort`: `high` (정밀한 분석을 위해)
- `web_search_mode`: `live`
- `working_directory`: 현재 프로젝트 디렉토리를 전달 (알고 있는 경우)
- 나머지 파라미터는 사용자가 명시하지 않는 한 기본값 유지

## 결과 표시

JSON 응답을 받은 후:

1. `status` 확인
2. `result.issues`를 severity별로 그룹화하여 표시:
   - **Critical** 이슈를 먼저 표시 (경고 강조)
   - **Warning** 이슈
   - **Info** 이슈
   - **Suggestion** 이슈
3. 각 이슈에 `fix` 필드가 있으면 수정 제안도 함께 표시
4. 이슈 수 총계 보고: N critical, N warning, N info, N suggestion
5. `summary`와 `metadata.confidence` 보고
6. `result.data.key_values`에 메트릭이 있으면 테이블로 표시
