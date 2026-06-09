import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { addTodo, readTodos } from "@/lib/parsers/todo-parser";
import type { TodoPriority } from "@/lib/types";

// GET /api/todos — todo.md 파싱 후 전체 Todo 반환
export async function GET() {
  try {
    const todos = readTodos();
    return NextResponse.json({ todos });
  } catch (err) {
    console.error("[GET /api/todos]", err);
    return NextResponse.json({ error: "Failed to read todos" }, { status: 500 });
  }
}

// POST /api/todos — 새 Todo 추가
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, priority = "medium", category = "@개발", dueDate, tags, memo } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const success = addTodo(content.trim(), priority as TodoPriority, category, dueDate, tags, memo);
    if (!success) {
      return NextResponse.json({ error: "Failed to add todo" }, { status: 500 });
    }

    const todos = readTodos();
    revalidatePath("/", "layout");
    return NextResponse.json({ todos }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/todos]", err);
    return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
  }
}
