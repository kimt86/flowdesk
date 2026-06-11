// Phase 0c — 패키징 검증용 스파이크 라우트.
// 목적: standalone 서버(Electron이 fork)에서 @github/copilot-sdk를 in-process로 로드해
// copilot.exe를 spawn하고, in-process custom tool(lib/today 바인딩)로 추론 → 파일 쓰기까지
// 패키지 환경에서 동작하는지 검증한다. (본 구현은 Phase 1의 app/api/assistant/* 로 대체된다.)
import { NextRequest } from "next/server";
import path from "node:path";
import { addTodayTask, readToday } from "@/lib/today";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// copilot.exe 경로: 패키지에선 main.js가 fork env(FLOWDESK_COPILOT_EXE)로 절대경로 주입,
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

export async function GET(req: NextRequest) {
  const prompt =
    req.nextUrl.searchParams.get("prompt") ||
    "오늘 할 일에 '비서 연결 테스트' 항목을 추가해줘. add_today_task 도구를 사용해.";
  const model = req.nextUrl.searchParams.get("model") || "claude-haiku-4.5";

  const { CopilotClient, RuntimeConnection, defineTool, approveAll } = await import(
    "@github/copilot-sdk"
  );

  const exe = copilotExePath();
  const client = new CopilotClient({
    connection: RuntimeConnection.forStdio({ path: exe }),
    logLevel: "warning",
  });

  const events: Array<{ type: string; tool?: string; content?: string }> = [];
  try {
    await client.start();
    const auth = await client.getAuthStatus().catch((e) => ({ error: String(e) }));

    const addTask = defineTool("add_today_task", {
      description: "오늘 할 일 목록에 항목을 추가한다.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "추가할 할 일 내용" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["content"],
      },
      handler: async (args: { content: string; priority?: "high" | "medium" | "low" }) => {
        const ok = addTodayTask({
          content: String(args.content),
          priority: args.priority || "medium",
          category: "@기타",
          tags: ["today"],
        });
        return ok ? `오늘 할 일에 "${args.content}" 추가 완료` : "추가 실패";
      },
      skipPermission: true,
    });

    const session = await client.createSession({
      model,
      tools: [addTask],
      onPermissionRequest: approveAll,
      streaming: false,
    });
    session.on((ev) => {
      const e = ev as { type?: string; data?: { toolName?: string; content?: string } };
      if (
        typeof e?.type === "string" &&
        (e.type.startsWith("tool.") || e.type === "assistant.message")
      ) {
        events.push({
          type: e.type,
          tool: e.data?.toolName,
          content: e.data?.content?.slice?.(0, 200),
        });
      }
    });

    const res = await session.sendAndWait({ prompt }, 120000);
    await session.disconnect();

    return Response.json({
      ok: true,
      exe,
      model,
      auth,
      content: res?.data?.content ?? null,
      events,
      today: readToday()?.tasks?.map((t) => t.content) ?? null,
    });
  } catch (e) {
    const err = e as Error;
    return Response.json(
      { ok: false, exe, error: String(err?.stack || err?.message || err), events },
      { status: 500 },
    );
  } finally {
    try {
      await client.stop();
    } catch {
      /* 무시 */
    }
  }
}
