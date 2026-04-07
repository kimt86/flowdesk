import { NextResponse } from "next/server";
import fs from "fs";
import { resolvePresentationSafe } from "@/lib/presentations";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const relPath = searchParams.get("path");

  if (!relPath) {
    return new NextResponse("path parameter is required", { status: 400 });
  }

  const resolved = resolvePresentationSafe(relPath);

  if (!resolved) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const html = fs.readFileSync(resolved, "utf-8");
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
