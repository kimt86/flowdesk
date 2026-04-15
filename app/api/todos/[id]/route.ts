import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncTodosFromFile } from "@/lib/sync";
import { updateTodoStatus, updateTodo, deleteTodo, readTodos } from "@/lib/parsers/todo-parser";
import type { TodoStatus, TodoPriority } from "@/lib/types";

function extractLineIndex(id: string): number {
  const parts = id.split("-");
  return parseInt(parts[1], 10);
}

// PATCH /api/todos/[id] — 상태 변경 또는 전체 필드 수정
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const lineIndex = extractLineIndex(params.id);

    if (isNaN(lineIndex)) {
      return NextResponse.json({ error: "Invalid todo id" }, { status: 400 });
    }

    const { status, content, priority, category, dueDate, tags, memo } = body;

    // status만 있으면 기존 단순 상태 업데이트
    const hasOtherFields = content !== undefined || priority !== undefined || category !== undefined || dueDate !== undefined || tags !== undefined || memo !== undefined;

    let success: boolean;
    if (status && !hasOtherFields) {
      success = updateTodoStatus(lineIndex, status as TodoStatus);
    } else {
      const fields: Parameters<typeof updateTodo>[1] = {};
      if (status !== undefined) fields.status = status as TodoStatus;
      if (content !== undefined) fields.content = content as string;
      if (priority !== undefined) fields.priority = priority as TodoPriority;
      if (category !== undefined) fields.category = category as string;
      if (dueDate !== undefined) fields.dueDate = dueDate as string | null;
      if (tags !== undefined) fields.tags = tags as string[];
      if (memo !== undefined) fields.memo = memo as string | null;
      success = updateTodo(lineIndex, fields);
    }

    if (!success) {
      return NextResponse.json({ error: "Failed to update todo" }, { status: 500 });
    }

    const todos = await syncTodosFromFile();
    revalidatePath("/", "layout");
    return NextResponse.json({ todos });
  } catch (err) {
    console.error("[PATCH /api/todos/:id]", err);
    return NextResponse.json({ error: "Failed to update todo" }, { status: 500 });
  }
}

// DELETE /api/todos/[id] — Todo 삭제
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const lineIndex = extractLineIndex(params.id);

    if (isNaN(lineIndex)) {
      return NextResponse.json({ error: "Invalid todo id" }, { status: 400 });
    }

    const success = deleteTodo(lineIndex);
    if (!success) {
      return NextResponse.json({ error: "Failed to delete todo" }, { status: 500 });
    }

    const todos = await syncTodosFromFile();
    revalidatePath("/", "layout");
    return NextResponse.json({ todos });
  } catch (err) {
    console.error("[DELETE /api/todos/:id]", err);
    return NextResponse.json({ error: "Failed to delete todo" }, { status: 500 });
  }
}

// GET /api/todos/[id] — 특정 Todo 조회
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const todos = readTodos();
  const todo = todos.find((t) => t.id === params.id);
  if (!todo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ todo });
}
