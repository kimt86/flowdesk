import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { MEETING_MINUTES_DIR } from "@/lib/paths";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, date, attendees, content, tags } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "title은 필수입니다." },
        { status: 400 }
      );
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date는 YYYY-MM-DD 형식이어야 합니다." },
        { status: 400 }
      );
    }

    const year = date.slice(0, 4);
    const month = date.slice(5, 7);
    const safeTitle = title
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 50);
    const fileName = `meeting-${date.replace(/-/g, "")}-${safeTitle}.md`;
    const dirPath = path.join(MEETING_MINUTES_DIR, year, month);
    const filePath = path.join(dirPath, fileName);

    // 경로 안전 검증
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(MEETING_MINUTES_DIR)) {
      return NextResponse.json(
        { error: "잘못된 경로입니다." },
        { status: 400 }
      );
    }

    fs.mkdirSync(dirPath, { recursive: true });

    const attendeeList = Array.isArray(attendees) ? attendees : [];
    const tagList = Array.isArray(tags) ? tags : [];

    const escYaml = (s: string) => s.replace(/"/g, '\\"');
    const frontmatter = [
      "---",
      `title: "${escYaml(title)}"`,
      `date: ${date}`,
      `attendees: [${attendeeList.map((a: string) => `"${escYaml(a)}"`).join(", ")}]`,
      `status: draft`,
      `tags: [${tagList.map((t: string) => `"${escYaml(t)}"`).join(", ")}]`,
      "---",
      "",
    ].join("\n");

    const fileContent = frontmatter + (content || "");

    fs.writeFileSync(filePath, fileContent, "utf-8");

    const relPath = path.relative(MEETING_MINUTES_DIR, filePath);
    return NextResponse.json({ success: true, path: relPath });
  } catch {
    return NextResponse.json(
      { error: "회의록 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
