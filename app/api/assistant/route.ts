// FlowDesk AI 비서 — 메인 라우트(SSE). 프로바이더를 실행하고 정규화 이벤트를 중계한다.
// 승인은 현재 body.approve 플래그로 단순화(Phase 3에서 SSE 양방향 승인 모달로 교체).
import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { CopilotProvider } from "@/lib/assistant/providers/copilot";
import { waitForApproval } from "@/lib/assistant/approvals";
import type { AssistantEvent } from "@/lib/assistant/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: {
    prompt?: string;
    model?: string;
    autoExecute?: boolean;
    history?: { role: "user" | "assistant"; content: string }[];
  } = {};
  try {
    body = await req.json();
  } catch {
    /* 빈 본문 허용 → 아래에서 검증 */
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return Response.json({ error: "prompt가 필요합니다." }, { status: 400 });
  }
  const model = typeof body.model === "string" ? body.model : undefined;
  const autoExecute = !!body.autoExecute;
  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (m): m is { role: "user" | "assistant"; content: string } =>
            !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
        )
        .slice(-20) // 최근 20턴까지만(토큰 보호)
    : undefined;

  const encoder = new TextEncoder();
  const provider = new CopilotProvider();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (ev: AssistantEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
        } catch {
          /* 컨트롤러가 이미 닫힘 */
        }
      };
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* 무시 */
        }
      };

      provider
        .run({
          prompt,
          history,
          model,
          autoExecute,
          signal: req.signal,
          onEvent: send,
          // 승인이 필요한 tool마다 permission_request(requestId)를 보내고, 클라이언트의
          // /api/assistant/approve POST가 결정을 회신할 때까지 대기.
          requestApproval: async (tool, category, args) => {
            const requestId = randomUUID();
            send({ type: "permission_request", requestId, tool, category, args });
            return waitForApproval(requestId, req.signal);
          },
        })
        .then(close)
        .catch((e) => {
          send({ type: "error", message: String(e?.message ?? e) });
          close();
        });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
