import { NextResponse } from "next/server";
import path from "path";
import matter from "gray-matter";
import {
  writeDocSafe,
  deleteDocSafe,
  patchDocBody,
  createDocSafe,
} from "@/lib/docs";

// POST /api/docs — 새 문서 생성
// body: { relPath: string (docs/ 기준 또는 절대상대), title?: string }
// 응답: { relPath } (실제 저장된 정규화 경로)
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const rawPath = String(body.relPath ?? "").trim();
    const title = String(body.title ?? "").trim();

    if (!rawPath) {
      return NextResponse.json({ error: "relPath required" }, { status: 400 });
    }

    // 정규화: 슬래시 통일, 앞뒤 슬래시 제거, .md 자동 추가, docs/ prefix 보장
    let parts = rawPath
      .replace(/\\/g, "/")
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts[0] !== "docs") parts = ["docs", ...parts];

    let relPath = path.join(...parts);
    if (!relPath.endsWith(".md")) relPath += ".md";

    const today = new Date().toISOString().split("T")[0];
    const fileTitle = title || path.basename(relPath, ".md");

    const content = matter.stringify("\n", {
      title: fileTitle,
      status: "draft",
      author: "",
      tags: [],
      created: today,
      updated: today,
    });

    const ok = createDocSafe(relPath, content);
    if (!ok) {
      return NextResponse.json(
        { error: "이미 존재하거나 잘못된 경로입니다" },
        { status: 409 },
      );
    }

    return NextResponse.json({ relPath });
  } catch (err) {
    console.error("[POST /api/docs]", err);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}

// PATCH /api/docs?path=<relPath>
// body 형태:
//   { content: string }  — 파일 전체 덮어쓰기 (frontmatter 포함, 호환 유지)
//   { body: string }     — frontmatter는 디스크 상태 유지, 본문만 교체 (에디터용)
export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const relPath = searchParams.get("path");

    if (!relPath) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    const payload = (await req.json()) as Record<string, unknown>;

    if (typeof payload.body === "string") {
      const ok = patchDocBody(relPath, payload.body);
      if (!ok) {
        return NextResponse.json({ error: "Failed to write body" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (typeof payload.content === "string") {
      const ok = writeDocSafe(relPath, payload.content);
      if (!ok) {
        return NextResponse.json({ error: "Failed to write document" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "must provide 'body' or 'content' string" },
      { status: 400 },
    );
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
