// FlowDesk AI 비서 — GitHub Copilot SDK 프로바이더.
// @github/copilot-sdk(in-process 래퍼)가 copilot.exe(forStdio)를 spawn해 추론을 수행한다.
// ALL_TOOLS(zod 단일원본)를 Copilot defineTool로 변환하고, 승인 게이트는 핸들러 래퍼에서 직접 처리.
import path from "node:path";
import { z } from "zod";
import { ALL_TOOLS, TOOLS_BY_NAME } from "../tools";
import type { AssistantProvider, RunOptions } from "../types";

export const DEFAULT_MODEL = "claude-sonnet-4.6";

// copilot.exe: 패키지에선 main.js가 FLOWDESK_COPILOT_EXE(resources/agent-bins) 주입,
// dev/standalone 폴백은 cwd 기준 node_modules.
function copilotExePath(): string {
  if (process.env.FLOWDESK_COPILOT_EXE) return process.env.FLOWDESK_COPILOT_EXE;
  return path.join(
    process.cwd(),
    "node_modules",
    "@github",
    "copilot-win32-x64",
    "copilot.exe",
  );
}

// data가 큰 read 결과를 모델에 넘길 때 토큰 폭주 방지(임시 캡 — Phase 4에서 예산화).
const RESULT_DATA_CAP = 8000;

// 이전 대화 맥락을 prompt 앞에 붙여 멀티턴 지시어("이거", "방금 그거")가 동작하게 한다.
// (Copilot 세션 복원이 불안정해 히스토리를 직접 주입하는 방식을 사용.)
function buildContextualPrompt(
  history: { role: "user" | "assistant"; content: string }[] | undefined,
  prompt: string,
): string {
  const turns = (history ?? []).filter((m) => m.content?.trim());
  if (turns.length === 0) return prompt;
  const ctx = turns.map((m) => `${m.role === "user" ? "사용자" : "비서"}: ${m.content}`).join("\n");
  return (
    `다음은 지금까지의 대화 맥락입니다(참고용, 이미 처리된 내용):\n${ctx}\n\n` +
    `---\n위 맥락을 바탕으로 사용자의 새 요청을 처리하세요:\n사용자: ${prompt}`
  );
}

export class CopilotProvider implements AssistantProvider {
  readonly id = "copilot";

  async listModels(): Promise<string[]> {
    const { CopilotClient, RuntimeConnection } = await import("@github/copilot-sdk");
    const client = new CopilotClient({
      connection: RuntimeConnection.forStdio({ path: copilotExePath() }),
      logLevel: "warning",
    });
    try {
      await client.start();
      const models = await client.listModels();
      return models.map((m) => m.id || m.name).filter((x): x is string => !!x);
    } finally {
      await client.stop().catch(() => {});
    }
  }

  // 비서 설정 패널용: 사용 가능한 모델 목록 + 구독 인증 상태를 한 번에.
  async status(): Promise<{ models: string[]; authenticated: boolean; login?: string }> {
    const { CopilotClient, RuntimeConnection } = await import("@github/copilot-sdk");
    const client = new CopilotClient({
      connection: RuntimeConnection.forStdio({ path: copilotExePath() }),
      logLevel: "warning",
    });
    try {
      await client.start();
      const auth = (await client.getAuthStatus().catch(() => null)) as
        | { isAuthenticated?: boolean; login?: string }
        | null;
      const list = await client.listModels().catch(() => []);
      const models = list.map((m) => m.id || m.name).filter((x): x is string => !!x);
      return { models, authenticated: !!auth?.isAuthenticated, login: auth?.login };
    } finally {
      await client.stop().catch(() => {});
    }
  }

  async run(opts: RunOptions): Promise<void> {
    const { CopilotClient, RuntimeConnection, defineTool, approveAll, ToolSet } =
      await import("@github/copilot-sdk");

    const client = new CopilotClient({
      connection: RuntimeConnection.forStdio({ path: copilotExePath() }),
      logLevel: "warning",
    });

    // ALL_TOOLS → Copilot defineTool. 권한은 skipPermission:true로 SDK 게이트를 우회하고
    // 아래 핸들러 래퍼에서 category 기반으로 직접 승인 처리.
    const tools = ALL_TOOLS.map((spec) =>
      defineTool(spec.name, {
        description: spec.description,
        parameters: z.toJSONSchema(spec.parameters) as Record<string, unknown>,
        skipPermission: true,
        handler: async (rawArgs: unknown) => {
          // 1) 인자 검증
          let parsed: unknown;
          try {
            parsed = spec.parameters.parse(rawArgs ?? {});
          } catch (err) {
            return `❌ 인자 검증 실패(${spec.name}): ${(err as Error).message}`;
          }

          opts.onEvent({ type: "tool_start", tool: spec.name, category: spec.category, args: parsed });

          // 2) 승인 게이트: destructive는 항상, write는 autoExecute=false일 때 승인 요구.
          const needsApproval =
            spec.category === "destructive" ||
            (spec.category === "write" && !opts.autoExecute);
          if (needsApproval) {
            const approved = opts.requestApproval
              ? await opts.requestApproval(spec.name, spec.category, parsed)
              : false;
            opts.onEvent({
              type: "permission_resolved",
              tool: spec.name,
              category: spec.category,
              decision: approved ? "allow" : "deny",
            });
            if (!approved) return `🚫 사용자가 '${spec.name}' 실행을 거부했습니다.`;
          }

          // 3) 실행 (throw 금지 — 문자열로 회수)
          try {
            const result = await spec.handler(parsed as Record<string, unknown>);
            opts.onEvent({
              type: "tool_result",
              tool: spec.name,
              ok: result.ok,
              message: result.message,
            });
            if (result.data !== undefined) {
              const json = JSON.stringify(result.data);
              const capped =
                json.length > RESULT_DATA_CAP
                  ? json.slice(0, RESULT_DATA_CAP) + "…(결과가 길어 일부 생략)"
                  : json;
              return `${result.message}\n\n${capped}`;
            }
            return result.message;
          } catch (err) {
            opts.onEvent({
              type: "tool_result",
              tool: spec.name,
              ok: false,
              message: String(err),
            });
            return `❌ 실행 오류(${spec.name}): ${(err as Error).message}`;
          }
        },
      }),
    );

    const model = opts.model || DEFAULT_MODEL;

    try {
      await client.start();
      const session = await client.createSession({
        model,
        tools,
        availableTools: new ToolSet().addCustom("*"), // 빌트인 tool 비활성, 우리 custom tool만
        onPermissionRequest: approveAll, // 빌트인 경로 대비(우리 tool은 skipPermission)
        streaming: true,
      });

      opts.onEvent({ type: "session", sessionId: session.sessionId, model });

      let finalContent = "";
      session.on((ev) => {
        const e = ev as { type?: string; data?: { deltaContent?: string; content?: string } };
        if (e.type === "assistant.message_delta") {
          opts.onEvent({ type: "delta", text: e.data?.deltaContent ?? "" });
        } else if (e.type === "assistant.message") {
          const c = e.data?.content ?? "";
          if (c) finalContent = c;
          opts.onEvent({ type: "message", text: c });
        }
      });

      if (opts.signal) {
        opts.signal.addEventListener("abort", () => {
          session.abort().catch(() => {});
        });
      }

      const res = await session.sendAndWait(
        { prompt: buildContextualPrompt(opts.history, opts.prompt) },
        180000,
      );
      const content = res?.data?.content ?? finalContent;
      opts.onEvent({ type: "done", content });

      await session.disconnect().catch(() => {});
    } catch (err) {
      opts.onEvent({ type: "error", message: (err as Error).message ?? String(err) });
    } finally {
      await client.stop().catch(() => {});
    }
  }
}
