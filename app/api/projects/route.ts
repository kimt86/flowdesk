import { NextResponse } from "next/server";
import { addProject, updateProject, deleteProject } from "@/lib/projects";

export async function POST(req: Request) {
  try {
    const { title, code, client, goal, owner } = await req.json();
    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const id = addProject(
      title,
      typeof code === "string" ? code : "",
      typeof client === "string" ? client : "",
      typeof goal === "string" ? goal : "",
      typeof owner === "string" ? owner : ""
    );
    return NextResponse.json({ success: true, id });
  } catch {
    return NextResponse.json({ error: "failed to add project" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, rawContent, archived } = await req.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const updates: { rawContent?: string; archived?: boolean } = {};
    if (typeof rawContent === "string") updates.rawContent = rawContent;
    if (typeof archived === "boolean") updates.archived = archived;

    const success = updateProject(id, updates);
    if (!success) {
      return NextResponse.json({ error: "project not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "failed to update project" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const success = deleteProject(id);
    if (!success) {
      return NextResponse.json({ error: "project not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "failed to delete project" }, { status: 500 });
  }
}
