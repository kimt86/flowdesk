// FlowDesk AI 비서 — 모델 목록 + 인증 상태. 비서 패널이 처음 열릴 때 1회 호출한다.
import { CopilotProvider } from "@/lib/assistant/providers/copilot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const provider = new CopilotProvider();
    const status = await provider.status();
    return Response.json({ ok: true, ...status });
  } catch (e) {
    return Response.json(
      { ok: false, error: (e as Error)?.message ?? String(e), models: [], authenticated: false },
      { status: 500 },
    );
  }
}
