import { NextResponse } from "next/server";
import { readDocSafe, writeDocSafe } from "@/lib/docs";

const VALID_STATUSES = ["draft", "review", "final"];

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const relPath = searchParams.get("path");

    if (!relPath) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const { status } = await req.json();
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }

    const raw = readDocSafe(relPath);
    if (!raw) {
      return NextResponse.json({ error: "document not found" }, { status: 404 });
    }

    const updated = raw.replace(/^(status:\s*).+$/m, `$1${status}`);
    const success = writeDocSafe(relPath, updated);
    if (!success) {
      return NextResponse.json({ error: "failed to save" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "failed to update status" }, { status: 500 });
  }
}
