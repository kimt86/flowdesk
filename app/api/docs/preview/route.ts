import { NextResponse } from "next/server";
import { renderMarkdown } from "@/lib/markdown";

// POST /api/docs/preview — 마크다운 → HTML 미리보기
export async function POST(req: Request) {
  try {
    const { content, relPath = "" } = await req.json();
    if (typeof content !== "string") {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }
    const html = await renderMarkdown(content, relPath);
    return NextResponse.json({ html });
  } catch (err) {
    console.error("[POST /api/docs/preview]", err);
    return NextResponse.json({ error: "Failed to render preview" }, { status: 500 });
  }
}
