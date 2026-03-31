import {
  Codex,
  type CodexOptions,
  type ThreadOptions,
  type TurnOptions,
  type RunResult,
  type ThreadItem,
  type ThreadEvent,
  type SandboxMode,
  type ModelReasoningEffort,
  type ApprovalMode,
  type WebSearchMode,
} from "@openai/codex-sdk";

let codexInstance: Codex | null = null;

/**
 * Codex 인스턴스를 가져오거나 새로 생성한다.
 * OAuth 로그인 기반이므로 apiKey 없이도 동작한다.
 */
export function getCodex(options?: CodexOptions): Codex {
  if (!codexInstance) {
    codexInstance = new Codex(options ?? {});
  }
  return codexInstance;
}

export function resetCodex(): void {
  codexInstance = null;
}

export interface ExecuteParams {
  prompt: string;
  model?: string;
  sandboxMode?: SandboxMode;
  workingDirectory?: string;
  reasoningEffort?: ModelReasoningEffort;
  approvalPolicy?: ApprovalMode;
  webSearchMode?: WebSearchMode;
  additionalDirectories?: string[];
  apiKey?: string;
  baseUrl?: string;
}

export interface ExecuteStructuredParams extends ExecuteParams {
  outputSchema: Record<string, unknown>;
}

export interface ResumeParams {
  threadId: string;
  prompt: string;
  model?: string;
  sandboxMode?: SandboxMode;
  workingDirectory?: string;
  reasoningEffort?: ModelReasoningEffort;
  approvalPolicy?: ApprovalMode;
  apiKey?: string;
  baseUrl?: string;
}

function buildThreadOptions(
  params: Pick<
    ExecuteParams,
    | "model"
    | "sandboxMode"
    | "workingDirectory"
    | "reasoningEffort"
    | "approvalPolicy"
    | "webSearchMode"
    | "additionalDirectories"
  >,
): ThreadOptions {
  const opts: ThreadOptions = {};
  opts.model = params.model ?? "gpt-5.4";
  opts.sandboxMode = params.sandboxMode ?? "read-only";
  if (params.workingDirectory) opts.workingDirectory = params.workingDirectory;
  opts.modelReasoningEffort = params.reasoningEffort ?? "medium";
  if (params.approvalPolicy) opts.approvalPolicy = params.approvalPolicy;
  if (params.webSearchMode) opts.webSearchMode = params.webSearchMode;
  if (params.additionalDirectories) opts.additionalDirectories = params.additionalDirectories;

  // MCP 환경에서는 자동 승인이 기본
  if (!opts.approvalPolicy) opts.approvalPolicy = "never";
  opts.skipGitRepoCheck = true;

  return opts;
}

function buildCodexOptions(params: Pick<ExecuteParams, "apiKey" | "baseUrl">): CodexOptions {
  const opts: CodexOptions = {};
  if (params.apiKey) opts.apiKey = params.apiKey;
  if (params.baseUrl) opts.baseUrl = params.baseUrl;
  return opts;
}

/** Turn 결과를 구조화된 포맷으로 정리하여 반환 */
export function formatTurnResult(turn: RunResult): string {
  const commands: string[] = [];
  const files: string[] = [];
  const summarySteps: string[] = [];
  const errors: string[] = [];

  for (const item of turn.items) {
    switch (item.type) {
      case "agent_message":
        summarySteps.push(item.text);
        break;
      case "reasoning":
        summarySteps.push(item.text);
        break;
      case "command_execution":
        commands.push(`$ ${item.command}  (${item.status}, exit: ${item.exit_code ?? "N/A"})`);
        break;
      case "file_change":
        for (const c of item.changes as { path: string; kind: string }[]) {
          files.push(`${c.kind}: ${c.path}`);
        }
        break;
      case "mcp_tool_call":
        commands.push(`[MCP] ${item.server}/${item.tool}  (${item.status})`);
        break;
      case "web_search":
        commands.push(`[Web Search] ${item.query}`);
        break;
      case "todo_list": {
        const todos = item.items
          .map((t: { text: string; completed: boolean }) => `${t.completed ? "[x]" : "[ ]"} ${t.text}`)
          .join("\n  ");
        summarySteps.push(`[Todo]\n  ${todos}`);
        break;
      }
      case "error":
        errors.push(item.message);
        break;
    }
  }

  const sections: string[] = [];

  // 명령어 섹션
  if (commands.length > 0) {
    sections.push(`📌 명령어:\n  ${commands.join("\n  ")}`);
  }

  // 관련 파일 섹션 (파일명만 표기)
  if (files.length > 0) {
    sections.push(`📁 관련 파일:\n  ${files.join("\n  ")}`);
  }

  // 과정 요약 섹션
  if (summarySteps.length > 0) {
    sections.push(`📝 과정 요약:\n  ${summarySteps.join("\n  ")}`);
  }

  // 에러 섹션
  if (errors.length > 0) {
    sections.push(`⚠️ 에러:\n  ${errors.join("\n  ")}`);
  }

  // Codex 최종 출력
  if (turn.finalResponse) {
    sections.push(`📤 Codex 출력:\n${turn.finalResponse}`);
  }

  // 토큰 사용량
  if (turn.usage) {
    sections.push(
      `[Usage] input: ${turn.usage.input_tokens}, cached: ${turn.usage.cached_input_tokens}, output: ${turn.usage.output_tokens}`,
    );
  }

  return sections.join("\n\n");
}

export async function executePrompt(params: ExecuteParams): Promise<RunResult> {
  const codex = getCodex(buildCodexOptions(params));
  const thread = codex.startThread(buildThreadOptions(params));
  return thread.run(params.prompt);
}

/**
 * JSON 스키마의 모든 object 타입에 additionalProperties: false를 재귀적으로 추가한다.
 * OpenAI structured output API는 모든 object에 이 속성이 필수이므로,
 * 사용자가 누락해도 자동으로 보정한다.
 */
function normalizeSchemaForStructuredOutput(schema: Record<string, unknown>): Record<string, unknown> {
  if (typeof schema !== "object" || schema === null) return schema;

  const result = { ...schema };

  // object 타입이고 properties가 있으면 additionalProperties: false 강제
  if (result.type === "object" && result.properties) {
    result.additionalProperties = false;
    const props = result.properties as Record<string, Record<string, unknown>>;
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      normalized[key] = normalizeSchemaForStructuredOutput(value);
    }
    result.properties = normalized;
  }

  // array의 items 처리
  if (result.items && typeof result.items === "object") {
    result.items = normalizeSchemaForStructuredOutput(result.items as Record<string, unknown>);
  }

  // anyOf / oneOf / allOf 처리
  for (const keyword of ["anyOf", "oneOf", "allOf"] as const) {
    if (Array.isArray(result[keyword])) {
      result[keyword] = (result[keyword] as Record<string, unknown>[]).map(normalizeSchemaForStructuredOutput);
    }
  }

  // $defs / definitions 처리
  for (const defsKey of ["$defs", "definitions"] as const) {
    if (result[defsKey] && typeof result[defsKey] === "object") {
      const defs = result[defsKey] as Record<string, Record<string, unknown>>;
      const normalizedDefs: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(defs)) {
        normalizedDefs[key] = normalizeSchemaForStructuredOutput(value);
      }
      result[defsKey] = normalizedDefs;
    }
  }

  return result;
}

export async function executeStructured(params: ExecuteStructuredParams): Promise<RunResult> {
  const codex = getCodex(buildCodexOptions(params));
  const thread = codex.startThread(buildThreadOptions(params));
  const normalized = normalizeSchemaForStructuredOutput(params.outputSchema);
  const turnOptions: TurnOptions = { outputSchema: normalized };
  return thread.run(params.prompt, turnOptions);
}

export async function resumeThread(params: ResumeParams): Promise<RunResult> {
  const codex = getCodex(buildCodexOptions(params));
  const thread = codex.resumeThread(params.threadId, buildThreadOptions(params));
  return thread.run(params.prompt);
}

/**
 * 스트리밍 모드로 실행하여 이벤트를 수집한 뒤 결과를 반환한다.
 * MCP는 request-response 모델이므로, 모든 이벤트를 모아서 한 번에 반환한다.
 */
export async function executeStreamed(params: ExecuteParams): Promise<{
  events: ThreadEvent[];
  items: ThreadItem[];
  finalResponse: string;
}> {
  const codex = getCodex(buildCodexOptions(params));
  const thread = codex.startThread(buildThreadOptions(params));
  const { events } = await thread.runStreamed(params.prompt);

  const collectedEvents: ThreadEvent[] = [];
  const collectedItems: ThreadItem[] = [];
  let finalResponse = "";

  for await (const event of events) {
    collectedEvents.push(event);

    if (event.type === "item.completed") {
      collectedItems.push(event.item);
      if (event.item.type === "agent_message") {
        finalResponse = event.item.text;
      }
    }
  }

  return { events: collectedEvents, items: collectedItems, finalResponse };
}

export {
  type SandboxMode,
  type ModelReasoningEffort,
  type ApprovalMode,
  type WebSearchMode,
  type RunResult,
  type ThreadItem,
  type ThreadEvent,
};
