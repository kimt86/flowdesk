import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  listArchivedTodos,
  listArchiveMonthSummaries,
  listArchivedTodosByMonth,
  archiveTodoFromTodo,
  restoreArchivedTodo,
  deleteArchivedTodo,
} from "@/lib/archive";

// GET /api/archive — 보관함 조회
//   ?summary=true        → 월별 요약만
//   ?year=2026&month=04  → 해당 월 항목만
//   (없음)               → 전체 목록
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.get("summary") === "true") {
      const months = listArchiveMonthSummaries();
      return NextResponse.json({ months });
    }

    const year = searchParams.get("year");
    const month = searchParams.get("month");
    if (year && month) {
      const items = listArchivedTodosByMonth(year, month);
      return NextResponse.json({ items });
    }

    const items = listArchivedTodos();
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[GET /api/archive]", err);
    return NextResponse.json({ error: "Failed to read archive" }, { status: 500 });
  }
}

// POST /api/archive — TODO.md의 항목을 보관함으로 이동
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lineIndex } = body;
    if (typeof lineIndex !== "number") {
      return NextResponse.json({ error: "lineIndex is required" }, { status: 400 });
    }

    const success = archiveTodoFromTodo(lineIndex);
    if (!success) {
      return NextResponse.json({ error: "Failed to archive todo" }, { status: 500 });
    }

    const items = listArchivedTodos();
    revalidatePath("/", "layout");
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[POST /api/archive]", err);
    return NextResponse.json({ error: "Failed to archive todo" }, { status: 500 });
  }
}

// PUT /api/archive — 보관 항목을 TODO.md 완료 섹션으로 복원
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { file, lineIndex } = body;
    if (typeof file !== "string" || typeof lineIndex !== "number") {
      return NextResponse.json({ error: "file and lineIndex are required" }, { status: 400 });
    }

    const success = restoreArchivedTodo(file, lineIndex);
    if (!success) {
      return NextResponse.json({ error: "Failed to restore" }, { status: 500 });
    }

    const items = listArchivedTodos();
    revalidatePath("/", "layout");
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[PUT /api/archive]", err);
    return NextResponse.json({ error: "Failed to restore" }, { status: 500 });
  }
}

// DELETE /api/archive?file=...&lineIndex=... — 보관 항목 영구 삭제
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const file = searchParams.get("file");
    const lineIndexParam = searchParams.get("lineIndex");
    const lineIndex = lineIndexParam !== null ? parseInt(lineIndexParam, 10) : NaN;

    if (!file || isNaN(lineIndex)) {
      return NextResponse.json({ error: "file and lineIndex are required" }, { status: 400 });
    }

    const success = deleteArchivedTodo(file, lineIndex);
    if (!success) {
      return NextResponse.json({ error: "Failed to delete archived todo" }, { status: 500 });
    }

    const items = listArchivedTodos();
    revalidatePath("/", "layout");
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[DELETE /api/archive]", err);
    return NextResponse.json({ error: "Failed to delete archived todo" }, { status: 500 });
  }
}
