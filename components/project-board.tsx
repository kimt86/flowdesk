"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FolderKanban, Plus, Archive, Pencil, Trash2, RotateCcw, Users, Target, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/projects";
import { MarkdownMermaidView } from "@/components/markdown-mermaid-view";

type Tab = "board" | "archive";

export function ProjectBoard({ projects: initial }: { projects: Project[] }) {
  const [projects, setProjects] = useState(initial);
  const [tab, setTab] = useState<Tab>("board");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [planCounts, setPlanCounts] = useState<Record<string, { count: number; files: { filename: string; title: string }[] }>>({});

  // 플랜 데이터 로드
  useEffect(() => {
    const active = projects.filter((p) => !p.archived);
    if (active.length === 0) return;
    Promise.all(
      active.map((p) =>
        fetch(`/api/plans?project=${encodeURIComponent(p.id)}`)
          .then((res) => res.json())
          .then((data) => {
            const plans: { filename: string; title: string }[] = (data.plans ?? []).map((pl: { filename: string; title: string }) => ({ filename: pl.filename, title: pl.title }));
            return { id: p.id, count: plans.length, files: plans };
          })
          .catch(() => ({ id: p.id, count: 0, files: [] as { filename: string; title: string }[] }))
      )
    ).then((results) => {
      const map: Record<string, { count: number; files: { filename: string; title: string }[] }> = {};
      for (const r of results) {
        if (r.count > 0) map[r.id] = { count: r.count, files: r.files };
      }
      setPlanCounts(map);
    });
  }, [projects]);

  // 폼 상태
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [client, setClient] = useState("");
  const [goal, setGoal] = useState("");
  const [owner, setOwner] = useState("");
  const [editContent, setEditContent] = useState("");

  const filtered = projects.filter((p) => tab === "board" ? !p.archived : p.archived);

  function resetForm() {
    setTitle(""); setCode(""); setClient(""); setGoal(""); setOwner(""); setEditContent("");
    setShowAdd(false); setEditId(null);
  }

  function startEdit(project: Project) {
    setEditId(project.id);
    setEditContent(project.rawContent);
    setShowAdd(false);
  }

  async function handleAdd() {
    if (!title.trim()) return;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), code: code.trim(), client: client.trim(), goal: goal.trim(), owner: owner.trim() }),
    });
    if (res.ok) {
      window.location.reload();
    }
  }

  async function handleUpdate() {
    if (!editId) return;
    const res = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editId, rawContent: editContent }),
    });
    if (res.ok) {
      window.location.reload();
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch("/api/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleToggleArchive(id: string, currentArchived: boolean) {
    const res = await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, archived: !currentArchived }),
    });
    if (res.ok) setProjects((prev) => prev.map((p) => p.id === id ? { ...p, archived: !currentArchived } : p));
  }

  return (
    <div className="space-y-6">
      {/* 탭 + 추가 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          <button onClick={() => setTab("board")} className={cn("text-sm px-3 py-1.5 rounded-md transition-colors", tab === "board" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground")}>
            Board ({projects.filter((p) => !p.archived).length})
          </button>
          <button onClick={() => setTab("archive")} className={cn("text-sm px-3 py-1.5 rounded-md transition-colors", tab === "archive" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground")}>
            Archive ({projects.filter((p) => p.archived).length})
          </button>
        </div>
        {tab === "board" && (
          <button onClick={() => { resetForm(); setShowAdd(true); }} className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> 프로젝트
          </button>
        )}
      </div>

      {/* 추가 폼 */}
      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <input type="text" placeholder="프로젝트 제목" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full text-sm font-medium bg-transparent border-b border-border pb-2 focus:outline-none focus:border-primary" autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="프로젝트 코드" value={code} onChange={(e) => setCode(e.target.value)} className="text-xs bg-transparent border-b border-border pb-1 focus:outline-none" />
            <input type="text" placeholder="고객사" value={client} onChange={(e) => setClient(e.target.value)} className="text-xs bg-transparent border-b border-border pb-1 focus:outline-none" />
          </div>
          <input type="text" placeholder="목표" value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full text-xs bg-transparent border-b border-border pb-1 focus:outline-none" />
          <input type="text" placeholder="담당" value={owner} onChange={(e) => setOwner(e.target.value)} className="w-full text-xs bg-transparent border-b border-border pb-1 focus:outline-none" />
          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground">취소</button>
            <button onClick={handleAdd} disabled={!title.trim()} className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50">추가</button>
          </div>
        </div>
      )}

      {/* 편집 폼 (마크다운 직접 편집) */}
      {editId && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-xs text-muted-foreground">마크다운 직접 편집</p>
          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={15} className="w-full text-xs font-mono bg-muted/50 rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <div className="flex justify-end gap-2">
            <button onClick={resetForm} className="text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground">취소</button>
            <button onClick={handleUpdate} className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">저장</button>
          </div>
        </div>
      )}

      {/* 카드 목록 */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderKanban className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{tab === "board" ? "프로젝트가 없습니다." : "보관된 프로젝트가 없습니다."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((project) => (
            <div key={project.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold">{project.title}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {project.status && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700">{project.status}</span>
                    )}
                    {project.client && (
                      <span className="text-[10px] text-muted-foreground">{project.client}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => startEdit(project)} className="p-1.5 rounded hover:bg-muted" title="편집"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => handleToggleArchive(project.id, project.archived)} className="p-1.5 rounded hover:bg-muted" title={project.archived ? "복원" : "보관"}>
                    {project.archived ? <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" /> : <Archive className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  <button onClick={() => handleDelete(project.id)} className="p-1.5 rounded hover:bg-red-50" title="삭제"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                </div>
              </div>

              {project.goal && (
                <div className="flex items-start gap-1.5 mt-2">
                  <Target className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground line-clamp-2">{project.goal}</p>
                </div>
              )}
              {project.owner && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Users className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{project.owner}</p>
                </div>
              )}

              {/* 플랜 링크 */}
              {planCounts[project.id] && (
                <div className="flex items-start gap-1.5 mt-2">
                  <FileText className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                  {planCounts[project.id].count === 1 ? (
                    <Link
                      href={`/projects/plan?project=${encodeURIComponent(project.id)}&file=${encodeURIComponent(planCounts[project.id].files[0].filename)}`}
                      className="text-xs text-primary hover:underline"
                    >
                      플랜: {planCounts[project.id].files[0].title}
                    </Link>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs text-muted-foreground">플랜 ({planCounts[project.id].count})</span>
                      {planCounts[project.id].files.map((f) => (
                        <Link
                          key={f.filename}
                          href={`/projects/plan?project=${encodeURIComponent(project.id)}&file=${encodeURIComponent(f.filename)}`}
                          className="text-xs text-primary hover:underline ml-1"
                        >
                          {f.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 펼치기/접기 — 항상 표시 */}
              <button
                onClick={() => setExpandedId(expandedId === project.id ? null : project.id)}
                className="flex items-center gap-1 mt-3 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {expandedId === project.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expandedId === project.id ? "접기" : "상세 보기"}
              </button>
              {expandedId === project.id && (
                <ProjectDetail content={project.rawContent.replace(/^## .+\n?/, "")} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectDetail({ content }: { content: string }) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/docs/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
      .then((res) => res.json())
      .then((data) => setHtml(data.html))
      .catch(() => setHtml(null));
  }, [content]);

  if (html === null) {
    return (
      <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
        불러오는 중...
      </div>
    );
  }

  return (
    <MarkdownMermaidView
      html={html}
      className="mt-3 pt-3 border-t border-border prose prose-sm max-w-none"
    />
  );
}
