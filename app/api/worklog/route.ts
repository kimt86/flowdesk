import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { WORKLOGS_DIR, WORKSPACE_ROOT } from "@/lib/paths";

export async function POST(req: Request) {
  try {
    const { content, weekNumber } = await req.json();

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const dirPath = path.join(WORKLOGS_DIR, String(year), month);
    const filePath = path.join(dirPath, `week-${weekNumber}.md`);

    fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(filePath, content, "utf-8");

    return NextResponse.json({ success: true, filePath: path.relative(WORKSPACE_ROOT, filePath) });
  } catch (err) {
    console.error("[POST /api/worklog]", err);
    return NextResponse.json({ error: "Failed to save worklog" }, { status: 500 });
  }
}
