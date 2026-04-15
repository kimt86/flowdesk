import { NextResponse } from "next/server";
import { writeWorkSafe, deleteWorkSafe } from "@/lib/work";

// PATCH /api/work?path=<relPath> — 파일 전체 내용 저장
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

    const success = writeWorkSafe(relPath, content);
    if (!success) {
      return NextResponse.json({ error: "Failed to write file" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/work]", err);
    return NextResponse.json({ error: "Failed to write file" }, { status: 500 });
  }
}

// DELETE /api/work?path=<relPath> — 파일 삭제
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const relPath = searchParams.get("path");

    if (!relPath) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const success = deleteWorkSafe(relPath);
    if (!success) {
      return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/work]", err);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
