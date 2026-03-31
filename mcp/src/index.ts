#!/usr/bin/env bun

/**
 * Codex MCP Server
 *
 * OpenAI Codex SDK를 기반으로 한 MCP 서버.
 * ChatGPT OAuth 로그인을 통해 API 키 없이 Codex 에이전트를 사용할 수 있다.
 *
 * 사전 준비:
 *   bunx codex login   # 브라우저에서 ChatGPT OAuth 로그인
 *
 * 실행:
 *   bun run src/index.ts
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools";

const server = new McpServer({
  name: "codex-mcp",
  version: "1.0.0",
});

registerTools(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[codex-mcp] Server started — communicating via stdio");
}

main().catch((error) => {
  console.error("[codex-mcp] Fatal error:", error);
  process.exit(1);
});
