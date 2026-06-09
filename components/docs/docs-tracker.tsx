"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DocMeta } from "@/lib/docs-shared";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/docs-shared";
import { FileText, Clock, Tag, Search, ChevronDown } from "lucide-react";
import { NewDocButton } from "@/components/docs/new-doc-button";

const STATUSES = ["draft", "review", "final"] as const;

export function DocsTracker({
  docs,
  allTags,
}: {
  docs: DocMeta[];
  allTags: string[];
}) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  // docs/ 기준 하위 폴더 추출 — 중간 경로까지 모두 (예: "docs/a/b/c.md" → "a", "a/b")
  const existingFolders = useMemo(() => {
    const set = new Set<string>();
    for (const d of docs) {
      // relPath는 OS 구분자 — 통일 후 docs/ 제거 + 파일명 제거
      const norm = d.relPath.replace(/\\/g, "/").replace(/^docs\/?/, "");
      const idx = norm.lastIndexOf("/");
      if (idx <= 0) continue;
      const folder = norm.slice(0, idx);
      const parts = folder.split("/");
      for (let i = 1; i <= parts.length; i++) {
        set.add(parts.slice(0, i).join("/"));
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [docs]);

  let filtered = docs;
  if (selectedTags.length > 0) {
    filtered = filtered.filter((d) => d.tags.some((t) => selectedTags.includes(t)));
  }
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  const grouped = {
    draft: filtered.filter((d) => d.status === "draft"),
    review: filtered.filter((d) => d.status === "review"),
    final: filtered.filter((d) => d.status === "final"),
  };

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  const tagCounts: Record<string, number> = {};
  for (const tag of allTags) {
    tagCounts[tag] = docs.filter((d) => d.tags.includes(tag)).length;
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">문서</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            docs/ 하위 문서 {docs.length}개 · frontmatter 기반
          </p>
        </div>
        <NewDocButton existingFolders={existingFolders} />
      </div>

      {/* 검색 */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="제목 또는 태그로 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
        />
      </div>

      {allTags.length > 0 && (
        <div className="mb-5 flex items-start gap-2">
          <Tag className="w-3.5 h-3.5 text-muted-foreground mt-1 flex-shrink-0" />
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedTags([])}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                selectedTags.length === 0
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40"
              )}
            >
              전체
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-colors",
                  selectedTags.includes(tag)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/40"
                )}
              >
                {tag}
                <span className="ml-1 opacity-60">{tagCounts[tag]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(selectedTags.length > 0 || query) && (
        <p className="text-xs text-muted-foreground mb-3">
          {filtered.length}개 문서 표시 중 (전체 {docs.length}개)
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATUSES.map((status) => (
          <div key={status} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-1">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[status]}`}>
                {STATUS_LABELS[status]}
              </span>
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {grouped[status].length}
              </span>
            </div>
            <div className="bg-secondary rounded-lg p-2 min-h-24 space-y-2">
              {grouped[status].length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">문서 없음</p>
              )}
              {grouped[status].map((doc) => (
                <DocCard key={doc.relPath} doc={doc} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {docs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">docs/ 디렉토리에서 문서를 찾을 수 없습니다.</p>
          <p className="text-xs mt-1">
            frontmatter(status, title)가 있는 마크다운 파일이 자동으로 표시됩니다.
          </p>
        </div>
      )}
    </div>
  );
}

function DocCard({ doc }: { doc: DocMeta }) {
  const [changing, setChanging] = useState(false);

  async function changeStatus(newStatus: string) {
    setChanging(true);
    try {
      const res = await fetch(`/api/docs/status?path=${encodeURIComponent(doc.relPath)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) window.location.reload();
    } finally {
      setChanging(false);
    }
  }

  return (
    <div className="bg-card border border-border rounded-md p-3 hover:border-primary/40 hover:shadow-sm transition-all">
      <div className="flex items-start gap-2">
        <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <Link
            href={`/docs/view?path=${encodeURIComponent(doc.relPath)}`}
            className="text-sm font-medium leading-snug truncate block hover:text-primary transition-colors"
          >
            {doc.title}
          </Link>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{doc.relPath}</p>
          {doc.updated && (
            <div className="flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{doc.updated}</span>
            </div>
          )}
          {doc.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {doc.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
              {doc.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{doc.tags.length - 3}</span>
              )}
            </div>
          )}
          <div className="mt-2">
            <StatusDropdown current={doc.status} changing={changing} onSelect={changeStatus} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusDropdown({ current, changing, onSelect }: {
  current: string; changing: boolean; onSelect: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const others = STATUSES.filter((s) => s !== current);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        disabled={changing}
        className={cn(
          "text-[10px] px-2 py-0.5 rounded flex items-center gap-1 transition-colors",
          STATUS_COLORS[current] ?? "bg-muted text-muted-foreground",
          changing && "opacity-50"
        )}
      >
        {changing ? "변경중..." : STATUS_LABELS[current] ?? current}
        <ChevronDown className="w-2.5 h-2.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 bg-card border border-border rounded-md shadow-lg z-50 py-1 min-w-20">
            {others.map((s) => (
              <button
                key={s}
                onClick={() => { setOpen(false); onSelect(s); }}
                className="block w-full text-left text-[10px] px-3 py-1.5 hover:bg-muted transition-colors"
              >
                <span className={`px-1.5 py-0.5 rounded ${STATUS_COLORS[s]}`}>{STATUS_LABELS[s]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
