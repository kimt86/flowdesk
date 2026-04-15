"use client";

import { useState } from "react";
import { Lightbulb, Plus, Archive, Pencil, Trash2, RotateCcw, X, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Idea } from "@/lib/ideas";

type Tab = "board" | "archive";

export function IdeaBoard({ ideas: initial }: { ideas: Idea[] }) {
  const [ideas, setIdeas] = useState(initial);
  const [tab, setTab] = useState<Tab>("board");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // 폼 상태
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const filtered = ideas.filter((i) => i.status === tab);

  function resetForm() {
    setTitle(""); setContent(""); setTagsInput("");
    setShowAdd(false); setEditId(null);
  }

  function startEdit(idea: Idea) {
    setEditId(idea.id);
    setTitle(idea.title);
    setContent(idea.content);
    setTagsInput(idea.tags.join(", "));
    setShowAdd(false);
  }

  async function handleAdd() {
    if (!title.trim()) return;
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), content: content.trim(), tags }),
    });
    if (res.ok) {
      const { id } = await res.json();
      const today = new Date().toISOString().slice(0, 10);
      setIdeas((prev) => [{ id, title: title.trim(), content: content.trim(), tags, date: today, status: "board" }, ...prev]);
      resetForm();
    }
  }

  async function handleUpdate() {
    if (!editId || !title.trim()) return;
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const res = await fetch("/api/ideas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editId, title: title.trim(), content: content.trim(), tags }),
    });
    if (res.ok) {
      setIdeas((prev) => prev.map((i) => i.id === editId ? { ...i, title: title.trim(), content: content.trim(), tags } : i));
      resetForm();
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch("/api/ideas", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setIdeas((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleToggleArchive(id: string, currentStatus: string) {
    const newStatus = currentStatus === "board" ? "archive" : "board";
    const res = await fetch("/api/ideas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    if (res.ok) setIdeas((prev) => prev.map((i) => i.id === id ? { ...i, status: newStatus as "board" | "archive" } : i));
  }

  const isEditing = editId !== null;

  return (
    <div className="space-y-6">
      {/* 탭 + 추가 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setTab("board")}
            className={cn("text-sm px-3 py-1.5 rounded-md transition-colors",
              tab === "board" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Board ({ideas.filter((i) => i.status === "board").length})
          </button>
          <button
            onClick={() => setTab("archive")}
            className={cn("text-sm px-3 py-1.5 rounded-md transition-colors",
              tab === "archive" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Archive ({ideas.filter((i) => i.status === "archive").length})
          </button>
        </div>
        {tab === "board" && (
          <button
            onClick={() => { resetForm(); setShowAdd(true); }}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> 아이디어
          </button>
        )}
      </div>

      {/* 추가/편집 폼 */}
      {(showAdd || isEditing) && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <input
            type="text"
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm font-medium bg-transparent border-b border-border pb-2 focus:outline-none focus:border-primary transition-colors"
            autoFocus
          />
          <textarea
            placeholder="내용을 적어보세요..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="w-full text-sm bg-transparent resize-none focus:outline-none"
          />
          <input
            type="text"
            placeholder="태그 (쉼표로 구분)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full text-xs text-muted-foreground bg-transparent border-t border-border pt-2 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors">
              취소
            </button>
            <button
              onClick={isEditing ? handleUpdate : handleAdd}
              disabled={!title.trim()}
              className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isEditing ? "수정" : "추가"}
            </button>
          </div>
        </div>
      )}

      {/* 카드 그리드 */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">
            {tab === "board" ? "아이디어가 없습니다. 새로운 아이디어를 추가해보세요!" : "보관된 아이디어가 없습니다."}
          </p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3">
          {filtered.map((idea) => (
            <div
              key={idea.id}
              className="break-inside-avoid bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow group"
            >
              <h3 className="text-sm font-semibold mb-1">{idea.title}</h3>
              {idea.content && (
                <p className="text-xs text-muted-foreground line-clamp-4 mb-2">{idea.content}</p>
              )}
              {idea.tags.length > 0 && (
                <div className="flex items-center gap-1 mb-2 flex-wrap">
                  <Tag className="w-3 h-3 text-muted-foreground" />
                  {idea.tags.map((tag) => (
                    <span key={tag} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{idea.date}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(idea)} className="p-1 rounded hover:bg-muted transition-colors" title="편집">
                    <Pencil className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleToggleArchive(idea.id, idea.status)} className="p-1 rounded hover:bg-muted transition-colors" title={idea.status === "board" ? "보관" : "복원"}>
                    {idea.status === "board" ? <Archive className="w-3 h-3 text-muted-foreground" /> : <RotateCcw className="w-3 h-3 text-muted-foreground" />}
                  </button>
                  <button onClick={() => handleDelete(idea.id)} className="p-1 rounded hover:bg-red-50 transition-colors" title="삭제">
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
