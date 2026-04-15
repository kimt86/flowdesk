import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { readToday, toggleTodayTask, updateTodayTask, deleteTodayTask, addTodayTask } from "@/lib/today";

// GET /api/today — TODAY.md 파싱 후 반환
export async function GET() {
  try {
    const today = readToday();
    return NextResponse.json({ today });
  } catch (err) {
    console.error("[GET /api/today]", err);
    return NextResponse.json({ error: "Failed to read today" }, { status: 500 });
  }
}

// PATCH /api/today — 체크박스 토글
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { lineIndex } = body;

    if (lineIndex === undefined || typeof lineIndex !== "number") {
      return NextResponse.json({ error: "lineIndex is required" }, { status: 400 });
    }

    const success = toggleTodayTask(lineIndex);
    if (!success) {
      return NextResponse.json({ error: "Failed to toggle task" }, { status: 500 });
    }

    const today = readToday();
    revalidatePath("/", "layout");
    return NextResponse.json({ today });
  } catch (err) {
    console.error("[PATCH /api/today]", err);
    return NextResponse.json({ error: "Failed to toggle task" }, { status: 500 });
  }
}

// POST /api/today — 오늘 할 일 섹션에 작업 추가
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, priority, category, dueDate, tags, memo } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const success = addTodayTask({
      content,
      priority: priority ?? "medium",
      category: category ?? "@기타",
      dueDate: dueDate ?? null,
      tags: tags ?? [],
      memo: memo ?? null,
    });

    if (!success) {
      return NextResponse.json({ error: "Failed to add today task" }, { status: 500 });
    }

    const today = readToday();
    revalidatePath("/", "layout");
    return NextResponse.json({ today });
  } catch (err) {
    console.error("[POST /api/today]", err);
    return NextResponse.json({ error: "Failed to add today task" }, { status: 500 });
  }
}

// PUT /api/today — 작업 수정
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { lineIndex, ...fields } = body;

    if (lineIndex === undefined || typeof lineIndex !== "number") {
      return NextResponse.json({ error: "lineIndex is required" }, { status: 400 });
    }

    const success = updateTodayTask(lineIndex, fields);
    if (!success) {
      return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }

    const today = readToday();
    revalidatePath("/", "layout");
    return NextResponse.json({ today });
  } catch (err) {
    console.error("[PUT /api/today]", err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

// DELETE /api/today?lineIndex=N — 작업 삭제
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lineIndexParam = searchParams.get("lineIndex");
    const lineIndex = lineIndexParam !== null ? parseInt(lineIndexParam, 10) : NaN;

    if (isNaN(lineIndex)) {
      return NextResponse.json({ error: "lineIndex is required" }, { status: 400 });
    }

    const success = deleteTodayTask(lineIndex);
    if (!success) {
      return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
    }

    const today = readToday();
    revalidatePath("/", "layout");
    return NextResponse.json({ today });
  } catch (err) {
    console.error("[DELETE /api/today]", err);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
