// FlowDesk AI 비서 — 공통 타입.
// tool 레이어(프로바이더 중립)와 프로바이더 어댑터(Copilot 등)가 공유한다.
import type { z } from "zod";

// read=자동승인, write=승인게이트(자동실행 토글), destructive=항상 승인.
export type ToolCategory = "read" | "write" | "destructive";

export interface ToolResult {
  ok: boolean;
  message: string; // 모델/사용자에게 보일 한국어 요약
  data?: unknown; // read tool의 구조화 결과(직렬화되어 모델에 전달)
}

export type ToolHandler = (
  args: Record<string, unknown>,
) => Promise<ToolResult> | ToolResult;

export interface AssistantTool {
  name: string;
  description: string;
  category: ToolCategory;
  parameters: z.ZodType;
  handler: ToolHandler;
}

// 프로바이더가 방출하는 정규화 이벤트(라우트가 SSE로 중계).
export type AssistantEvent =
  | { type: "session"; sessionId: string; model: string }
  | { type: "delta"; text: string } // 토큰 델타
  | { type: "message"; text: string } // 완성된 어시스턴트 메시지
  | { type: "tool_start"; tool: string; category: ToolCategory; args?: unknown }
  | { type: "tool_result"; tool: string; ok: boolean; message: string }
  | { type: "permission_request"; requestId: string; tool: string; category: ToolCategory; args: unknown }
  | { type: "permission_resolved"; tool: string; category: ToolCategory; decision: "allow" | "deny" }
  | { type: "done"; content: string }
  | { type: "error"; message: string };

export interface RunOptions {
  prompt: string;
  // 지금까지의 대화 맥락(멀티턴). prompt 앞에 참고용으로 구성되어 "이거/방금 그거" 등 지시어가 동작.
  history?: { role: "user" | "assistant"; content: string }[];
  model?: string;
  // write 자동 실행(설정 토글). destructive는 이 값과 무관하게 항상 승인 요구.
  autoExecute?: boolean;
  signal?: AbortSignal;
  onEvent: (ev: AssistantEvent) => void;
  // 승인 게이트: 프로바이더가 호출, 호출부가 resolve(true=허용). 미제공 시 deny.
  requestApproval?: (
    tool: string,
    category: ToolCategory,
    args: unknown,
  ) => Promise<boolean>;
}

export interface AssistantProvider {
  readonly id: string;
  run(opts: RunOptions): Promise<void>;
  listModels(): Promise<string[]>;
}
