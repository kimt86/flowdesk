import { NextResponse } from "next/server";
import { patchDocMeta, type DocMetaPatch } from "@/lib/docs";

// PATCH /api/docs/meta?path=<relPath>
// body: { title?, status?, author?, tags? }
export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const relPath = searchParams.get("path");
    if (!relPath) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const patch: DocMetaPatch = {};

    if (typeof body.title === "string") patch.title = body.title.trim();
    if (typeof body.status === "string") patch.status = body.status;
    if (typeof body.author === "string") patch.author = body.author.trim();
    if (Array.isArray(body.tags)) {
      patch.tags = body.tags
        .map((t) => String(t).trim())
        .filter((t) => t.length > 0);
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "no fields to update" }, { status: 400 });
    }

    const ok = patchDocMeta(relPath, patch);
    if (!ok) {
      return NextResponse.json({ error: "failed to update meta" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/docs/meta]", err);
    return NextResponse.json({ error: "failed to update meta" }, { status: 500 });
  }
}
