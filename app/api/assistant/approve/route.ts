// FlowDesk AI 비서 — 승인 회신 라우트.
// 비서 패널의 승인 모달이 사용자의 결정을 여기로 POST하면, 대기 중인 tool 호출이 해소된다.
import { NextRequest } from "next/server";
import { resolveApproval } from "@/lib/assistant/approvals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { requestId?: string; approved?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  if (typeof body.requestId !== "string") {
    return Response.json({ error: "requestId가 필요합니다." }, { status: 400 });
  }
  const resolved = resolveApproval(body.requestId, !!body.approved);
  return Response.json({ ok: resolved });
}
