import { NextResponse } from "next/server";
import { writeDocSafe, deleteDocSafe } from "@/lib/docs";

// PATCH /api/docs?path=<relPath> — 문서 전체 내용 저장
export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const relPath = searchParams.get("path");

    if (!relPath) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const { content } = await req.json();
    if (typeof content !== "string") {
      return NextResponse.json({ error: "content must be a string" }, { status: 400 });
    }

    const success = writeDocSafe(relPath, content);
    if (!success) {
      return NextResponse.json({ error: "Failed to write document" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/docs]", err);
    return NextResponse.json({ error: "Failed to write document" }, { status: 500 });
  }
}

// DELETE /api/docs?path=<relPath> — 문서 삭제
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const relPath = searchParams.get("path");

    if (!relPath) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const success = deleteDocSafe(relPath);
    if (!success) {
      return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/docs]", err);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
