#!/usr/bin/env bash
# codex-mcp 자동 시작 스크립트
# node_modules가 없으면 자동으로 bun install 실행 후 서버 시작

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d "node_modules" ]; then
  bun install --frozen-lockfile 2>/dev/null || bun install
fi

exec bun run src/index.ts
