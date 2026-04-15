import { NextResponse } from "next/server";
import { addIdea, updateIdea, deleteIdea } from "@/lib/ideas";

export async function POST(req: Request) {
  try {
    const { title, content, tags } = await req.json();
    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const id = addIdea(
      title,
      typeof content === "string" ? content : "",
      Array.isArray(tags) ? tags.map(String) : []
    );
    return NextResponse.json({ success: true, id });
  } catch {
    return NextResponse.json({ error: "failed to add idea" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, title, content, tags, status } = await req.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const updates: Record<string, unknown> = {};
    if (typeof title === "string") updates.title = title;
    if (typeof content === "string") updates.content = content;
    if (Array.isArray(tags)) updates.tags = tags.map(String);
    if (status === "board" || status === "archive") updates.status = status;

    const success = updateIdea(id, updates);
    if (!success) {
      return NextResponse.json({ error: "idea not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "failed to update idea" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const success = deleteIdea(id);
    if (!success) {
      return NextResponse.json({ error: "idea not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "failed to delete idea" }, { status: 500 });
  }
}
