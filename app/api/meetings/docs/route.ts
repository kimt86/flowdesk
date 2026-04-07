import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { MEETING_MINUTES_DIR } from "@/lib/paths";

function resolveSafe(relPath: string): string | null {
  if (!relPath) return null;
  const resolved = path.resolve(MEETING_MINUTES_DIR, relPath);
  if (
    !resolved.startsWith(MEETING_MINUTES_DIR + path.sep) &&
    resolved !== MEETING_MINUTES_DIR
  ) {
    return null;
  }
  if (!resolved.endsWith(".md")) return null;
  return resolved;
}

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const relPath = searchParams.get("path");
    if (!relPath) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }
    const resolved = resolveSafe(relPath);
    if (!resolved) {
      return NextResponse.json({ error: "invalid path" }, { status: 400 });
    }
    const { content } = await req.json();
    if (typeof content !== "string") {
      return NextResponse.json({ error: "content must be a string" }, { status: 400 });
    }
    fs.writeFileSync(resolved, content, "utf-8");
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const relPath = searchParams.get("path");
    if (!relPath) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }
    const resolved = resolveSafe(relPath);
    if (!resolved) {
      return NextResponse.json({ error: "invalid path" }, { status: 400 });
    }
    fs.unlinkSync(resolved);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
