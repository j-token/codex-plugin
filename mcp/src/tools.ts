import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  executePrompt,
  executeStructured,
  resumeThread,
  executeStreamed,
  formatTurnResult,
} from "./codex-client";

const sandboxModeSchema = z
  .enum(["read-only", "workspace-write", "danger-full-access"])
  .optional()
  .describe("샌드박스 모드. read-only: 읽기 전용, workspace-write: 작업 디렉토리 쓰기 허용, danger-full-access: 전체 접근");

const reasoningEffortSchema = z
  .enum(["minimal", "low", "medium", "high", "xhigh"])
  .optional()
  .describe("모델 추론 깊이 설정");

const approvalPolicySchema = z
  .enum(["never", "on-request", "on-failure", "untrusted"])
  .optional()
  .describe("명령 실행 승인 정책. 기본값: never (자동 승인)");

const webSearchModeSchema = z
  .enum(["disabled", "cached", "live"])
  .optional()
  .describe("웹 검색 모드");

export function registerTools(server: McpServer): void {
  // ─── codex_execute: 프롬프트 실행 ───
  server.registerTool(
    "codex_execute",
    {
      title: "Codex Execute",
      description:
        "OpenAI Codex 에이전트에 프롬프트를 전달하여 실행합니다. " +
        "코드 생성, 버그 수정, 리팩토링, 코드 분석 등 다양한 작업을 수행할 수 있습니다. " +
        "ChatGPT OAuth 로그인 기반으로 동작하며, API 키 없이도 사용 가능합니다.",
      inputSchema: {
        prompt: z.string().describe("Codex에 전달할 프롬프트 (작업 지시)"),
        model: z.string().optional().describe("사용할 모델 (예: gpt-5.4, o4-mini). 미지정 시 gpt-5.4 사용"),
        sandbox_mode: sandboxModeSchema,
        working_directory: z.string().optional().describe("작업 디렉토리 경로"),
        reasoning_effort: reasoningEffortSchema,
        approval_policy: approvalPolicySchema,
        web_search_mode: webSearchModeSchema,
        additional_directories: z
          .array(z.string())
          .optional()
          .describe("추가로 접근할 디렉토리 목록"),
        api_key: z.string().optional().describe("OpenAI API 키 (미지정 시 OAuth 로그인 사용)"),
        base_url: z.string().optional().describe("커스텀 API base URL"),
      },
    },
    async (args) => {
      try {
        const turn = await executePrompt({
          prompt: args.prompt,
          model: args.model,
          sandboxMode: args.sandbox_mode,
          workingDirectory: args.working_directory,
          reasoningEffort: args.reasoning_effort,
          approvalPolicy: args.approval_policy,
          webSearchMode: args.web_search_mode,
          additionalDirectories: args.additional_directories,
          apiKey: args.api_key,
          baseUrl: args.base_url,
        });

        return {
          content: [{ type: "text" as const, text: formatTurnResult(turn) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Codex 실행 오류: ${message}` }],
          isError: true,
        };
      }
    },
  );

  // ─── codex_execute_structured: 구조화된 출력 ───
  server.registerTool(
    "codex_execute_structured",
    {
      title: "Codex Execute (Structured Output)",
      description:
        "JSON 스키마를 지정하여 Codex 에이전트의 출력을 구조화된 형태로 받습니다. " +
        "코드 분석 결과, 상태 요약 등 파싱하기 쉬운 형태의 출력이 필요할 때 사용합니다.",
      inputSchema: {
        prompt: z.string().describe("Codex에 전달할 프롬프트"),
        output_schema: z
          .record(z.string(), z.unknown())
          .describe(
            "출력 JSON 스키마 (JSON Schema 형식). " +
            "모든 object 타입에 additionalProperties: false가 자동 적용됩니다.",
          ),
        model: z.string().optional().describe("사용할 모델 (기본값: gpt-5.4)"),
        sandbox_mode: sandboxModeSchema,
        working_directory: z.string().optional().describe("작업 디렉토리 경로"),
        reasoning_effort: reasoningEffortSchema,
        api_key: z.string().optional().describe("OpenAI API 키 (미지정 시 OAuth 로그인 사용)"),
        base_url: z.string().optional().describe("커스텀 API base URL"),
      },
    },
    async (args) => {
      try {
        const turn = await executeStructured({
          prompt: args.prompt,
          outputSchema: args.output_schema,
          model: args.model,
          sandboxMode: args.sandbox_mode,
          workingDirectory: args.working_directory,
          reasoningEffort: args.reasoning_effort,
          apiKey: args.api_key,
          baseUrl: args.base_url,
        });

        // 서버가 아는 실제 모델명을 metadata.model에 주입
        const effectiveModel = args.model ?? "gpt-5.4";
        let responseText = turn.finalResponse;
        try {
          const parsed = JSON.parse(turn.finalResponse);
          if (parsed.metadata) {
            parsed.metadata.model = effectiveModel;
          }
          responseText = JSON.stringify(parsed);
        } catch { /* JSON 파싱 실패 시 원본 유지 */ }

        return {
          content: [{ type: "text" as const, text: responseText }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Codex 구조화 출력 오류: ${message}` }],
          isError: true,
        };
      }
    },
  );

  // ─── codex_resume_thread: 스레드 재개 ───
  server.registerTool(
    "codex_resume_thread",
    {
      title: "Codex Resume Thread",
      description:
        "이전에 실행했던 Codex 스레드를 재개하여 대화를 이어갑니다. " +
        "이전 컨텍스트를 유지한 채 추가 작업을 요청할 수 있습니다.",
      inputSchema: {
        thread_id: z.string().describe("재개할 스레드 ID"),
        prompt: z.string().describe("추가로 전달할 프롬프트"),
        model: z.string().optional().describe("사용할 모델"),
        sandbox_mode: sandboxModeSchema,
        working_directory: z.string().optional().describe("작업 디렉토리 경로"),
        reasoning_effort: reasoningEffortSchema,
        approval_policy: approvalPolicySchema,
      },
    },
    async (args) => {
      try {
        const turn = await resumeThread({
          threadId: args.thread_id,
          prompt: args.prompt,
          model: args.model,
          sandboxMode: args.sandbox_mode,
          workingDirectory: args.working_directory,
          reasoningEffort: args.reasoning_effort,
          approvalPolicy: args.approval_policy,
        });

        return {
          content: [{ type: "text" as const, text: formatTurnResult(turn) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `스레드 재개 오류: ${message}` }],
          isError: true,
        };
      }
    },
  );

  // ─── codex_streamed: 스트리밍 실행 (이벤트 수집 후 반환) ───
  server.registerTool(
    "codex_streamed",
    {
      title: "Codex Streamed Execute",
      description:
        "Codex 에이전트를 스트리밍 모드로 실행합니다. " +
        "모든 중간 이벤트(추론, 커맨드 실행, 파일 변경 등)를 수집하여 상세하게 반환합니다. " +
        "에이전트의 작업 과정을 상세히 확인하고 싶을 때 사용합니다.",
      inputSchema: {
        prompt: z.string().describe("Codex에 전달할 프롬프트"),
        model: z.string().optional().describe("사용할 모델"),
        sandbox_mode: sandboxModeSchema,
        working_directory: z.string().optional().describe("작업 디렉토리 경로"),
        reasoning_effort: reasoningEffortSchema,
        approval_policy: approvalPolicySchema,
        web_search_mode: webSearchModeSchema,
        api_key: z.string().optional().describe("OpenAI API 키 (미지정 시 OAuth 로그인 사용)"),
        base_url: z.string().optional().describe("커스텀 API base URL"),
      },
    },
    async (args) => {
      try {
        const result = await executeStreamed({
          prompt: args.prompt,
          model: args.model,
          sandboxMode: args.sandbox_mode,
          workingDirectory: args.working_directory,
          reasoningEffort: args.reasoning_effort,
          approvalPolicy: args.approval_policy,
          webSearchMode: args.web_search_mode,
          apiKey: args.api_key,
          baseUrl: args.base_url,
        });

        const commands: string[] = [];
        const files: string[] = [];
        const summarySteps: string[] = [];
        const errors: string[] = [];

        for (const item of result.items) {
          switch (item.type) {
            case "agent_message":
              summarySteps.push(item.text);
              break;
            case "reasoning":
              summarySteps.push(item.text);
              break;
            case "command_execution":
              commands.push(
                `$ ${item.command}  (${item.status})` +
                  (item.aggregated_output ? `\n    출력: ${item.aggregated_output}` : ""),
              );
              break;
            case "file_change":
              for (const c of item.changes) {
                files.push(`${c.kind}: ${c.path}`);
              }
              break;
            case "error":
              errors.push(item.message);
              break;
          }
        }

        const sections: string[] = [];

        if (commands.length > 0) {
          sections.push(`📌 명령어:\n  ${commands.join("\n  ")}`);
        }

        if (files.length > 0) {
          sections.push(`📁 관련 파일:\n  ${files.join("\n  ")}`);
        }

        if (summarySteps.length > 0) {
          sections.push(`📝 과정 요약:\n  ${summarySteps.join("\n  ")}`);
        }

        if (errors.length > 0) {
          sections.push(`⚠️ 에러:\n  ${errors.join("\n  ")}`);
        }

        if (result.finalResponse) {
          sections.push(`📤 Codex 출력:\n${result.finalResponse}`);
        }

        return {
          content: [{ type: "text" as const, text: sections.join("\n\n") }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Codex 스트리밍 실행 오류: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
