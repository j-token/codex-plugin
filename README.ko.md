# codex-plugin

OpenAI Codex를 Claude Code에 통합하는 [Claude Code 플러그인](https://code.claude.com/docs/en/plugins)입니다. 모든 결과는 통일된 스키마의 **구조화된 JSON 출력**으로 반환되어 프로그래밍 방식으로 쉽게 파싱하고 처리할 수 있습니다.

## 사전 요구 사항

- [Claude Code](https://code.claude.com) v1.0.33+
- [Bun](https://bun.sh) v1.0+
- [OpenAI Codex CLI](https://github.com/openai/codex) 글로벌 설치: `npm install -g @openai/codex`
- ChatGPT OAuth 로그인: `codex login`
- [codex-mcp](https://github.com/WinUser/codex-mcp) 클론 및 의존성 설치 (기본 경로: `C:/Users/WinUser/codex-mcp`)

## 설치

### 마켓플레이스를 통한 설치 (권장)

**1단계.** 마켓플레이스 추가:

```shell
/plugin marketplace add j-token/codex-plugin
```

**2단계.** 플러그인 설치:

```shell
/plugin install codex-plugin@codex-marketplace
```

**3단계.** 플러그인 리로드:

```shell
/reload-plugins
```

이것으로 완료입니다! 플러그인을 바로 사용할 수 있습니다.

### CLI를 통한 설치 (한 줄)

```bash
claude plugin install codex-plugin@codex-marketplace
```

> 마켓플레이스가 먼저 추가되어 있어야 합니다. 위 내용을 참조하세요.

### 로컬 개발용

```bash
claude --plugin-dir /path/to/codex-plugin
```

### 팀 설정 (공동 작업자 자동 설치)

프로젝트의 `.claude/settings.json`에 추가하면 팀원들에게 자동으로 설치 안내가 표시됩니다:

```json
{
  "extraKnownMarketplaces": {
    "codex-marketplace": {
      "source": {
        "source": "github",
        "repo": "j-token/codex-plugin"
      }
    }
  },
  "enabledPlugins": {
    "codex-plugin@codex-marketplace": true
  }
}
```

## 스킬

모든 스킬은 `codex_execute_structured`를 통해 실행되며 동일한 통합 JSON 스키마를 반환합니다.

| 스킬 | 명령어 | 설명 |
|------|--------|------|
| **Generate** | `/codex-plugin:generate <프롬프트>` | 코드 생성 및 수정 — 새 파일, 기능 구현, 버그 수정, 리팩토링 |
| **Review** | `/codex-plugin:review <프롬프트>` | 코드 리뷰 및 분석 — 품질 검사, 보안 감사, 버그 탐지 |
| **Ask** | `/codex-plugin:ask <프롬프트>` | 범용 질의 — 설명, 비교, 아키텍처 논의 |
| **Status** | `/codex-plugin:codex-status` | Codex MCP 서버 연결 상태 확인 |

### 사용 예시

```
/codex-plugin:generate Express에서 JWT 인증 미들웨어 구현해줘
/codex-plugin:review src/auth.ts의 보안 취약점 검사해줘
/codex-plugin:ask 이 프로젝트에 REST vs GraphQL 중 어떤 게 적합한지 비교해줘
```

## 통합 JSON 출력 스키마

모든 스킬은 작업 유형에 관계없이 동일한 JSON 구조를 반환합니다. 해당 작업 유형에 적용되지 않는 필드는 빈 값(빈 배열 `[]` 또는 빈 문자열 `""`)으로 채워집니다.

```json
{
  "status": "success | partial | error",
  "task_type": "generate | review | ask",
  "summary": "수행된 작업에 대한 간략한 설명",
  "result": {
    "files": [
      {
        "path": "src/example.ts",
        "action": "create | modify | delete | review",
        "language": "typescript",
        "content": "전체 파일 내용 (create 시)",
        "diff": "통합 diff (modify 시)"
      }
    ],
    "issues": [
      {
        "severity": "critical | warning | info | suggestion",
        "category": "security | performance | style | bug",
        "file": "src/example.ts",
        "line": 42,
        "message": "이슈에 대한 설명",
        "fix": "수정 제안"
      }
    ],
    "answer": "자유 형식 텍스트 응답 (ask 작업용)",
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

### 작업 유형별 필드 사용

| 필드 | generate | review | ask |
|------|----------|--------|-----|
| `result.files` | 생성/수정된 파일 | 리뷰된 파일 (`action: "review"`) | 참조된 파일 |
| `result.issues` | 빈 배열 `[]` | 발견된 이슈 | 빈 배열 `[]` |
| `result.answer` | 빈 문자열 `""` | 빈 문자열 `""` | 상세 응답 |
| `result.data.key_values` | 빈 배열 `[]` | 분석 메트릭 | 구조화된 데이터 포인트 |

### 설계 제약 사항

- 모든 필드는 **필수**입니다 (선택적 속성 없음) — OpenAI 구조화 출력은 엄격한 스키마 검증을 강제합니다.
- `additionalProperties: false` 하에서는 동적 키가 불가능하므로, `data`는 자유형 객체 대신 `{key, value}` 쌍의 배열을 사용합니다.
- 스키마는 codex-mcp에 의해 자동 정규화됩니다: `additionalProperties: false`가 모든 object 타입에 재귀적으로 추가됩니다.

## 플러그인 구조

```
codex-plugin/
├── .claude-plugin/
│   ├── plugin.json                 # 플러그인 매니페스트
│   └── marketplace.json            # 마켓플레이스 카탈로그
├── .mcp.json                       # codex-mcp를 MCP 서버로 번들링
├── skills/
│   ├── generate/
│   │   └── SKILL.md                # 코드 생성/수정 스킬
│   ├── review/
│   │   └── SKILL.md                # 코드 리뷰/분석 스킬
│   └── ask/
│       └── SKILL.md                # 범용 질의 스킬
├── commands/
│   ├── codex-status.md             # 서버 상태 확인 명령어
│   ├── generate.md                 # 코드 생성 명령어
│   ├── review.md                   # 코드 리뷰 명령어
│   └── ask.md                      # 범용 질의 명령어
└── schema/
    └── unified-output-schema.json  # 통합 스키마 레퍼런스
```

## 설정

플러그인은 `.mcp.json`을 통해 codex-mcp에 연결됩니다. 기본적으로 `C:/Users/WinUser/codex-mcp` 경로의 codex-mcp를 사용합니다. 경로를 변경하려면 `.mcp.json`을 수정하세요:

```json
{
  "mcpServers": {
    "codex": {
      "command": "bun",
      "args": ["--cwd", "/your/path/to/codex-mcp", "run", "src/index.ts"]
    }
  }
}
```

### Codex 파라미터

스킬은 `codex_execute_structured` 도구를 통해 다음 파라미터를 지원합니다:

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `model` | `gpt-5.4` | 사용할 AI 모델 |
| `sandbox_mode` | `read-only` | `read-only`, `workspace-write`, `danger-full-access` |
| `reasoning_effort` | `medium` | `minimal`, `low`, `medium`, `high`, `xhigh` |
| `working_directory` | — | 프로젝트 디렉토리 경로 |
| `web_search_mode` | `live` | `disabled`, `cached`, `live` |

## 제거

```shell
/plugin uninstall codex-plugin@codex-marketplace
/plugin marketplace remove codex-marketplace
```

## 라이선스

MIT
