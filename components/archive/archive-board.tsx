"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ArchivedTodo } from "@/lib/types";
import {
  Archive as ArchiveIcon,
  RefreshCw,
  Undo2,
  Trash2,
  FileText,
  Search,
  Tag,
  FolderOpen,
} from "lucide-react";

const PRIORITY_LEFT_BORDER: Record<string, string> = {
  high: "border-l-red-500",
  medium: "border-l-yellow-400",
  low: "border-l-gray-300",
};

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-gray-100 text-gray-500",
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "긴급",
  medium: "보통",
  low: "낮음",
};

export function ArchiveBoard({ initialItems }: { initialItems: ArchivedTodo[] }) {
  const router = useRouter();
  const [items, setItems] = useState<ArchivedTodo[]>(initialItems);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleRefresh() {
    setRefreshing(true);
    const res = await fetch("/api/archive");
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
    }
    setRefreshing(false);
  }

  async function handleRestore(item: ArchivedTodo) {
    setConfirmRestoreId(null);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const res = await fetch("/api/archive", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: item.archiveFile, lineIndex: item.lineIndex }),
    });
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      router.refresh();
    }
  }

  async function handleDelete(item: ArchivedTodo) {
    setConfirmDeleteId(null);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const res = await fetch(
      `/api/archive?file=${encodeURIComponent(item.archiveFile)}&lineIndex=${item.lineIndex}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      router.refresh();
    }
  }

  const tagCounts: Record<string, number> = {};
  for (const i of items) {
    for (const tag of i.tags) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
  }
  const allTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  const filtered = items.filter((i) => {
    if (selectedTags.length > 0 && !i.tags.some((t) => selectedTags.includes(t))) return false;
    if (query) {
      const q = query.toLowerCase();
      if (
        !i.content.toLowerCase().includes(q) &&
        !i.tags.some((t) => t.toLowerCase().includes(q)) &&
        !i.category.toLowerCase().includes(q) &&
        !(i.memo ?? "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  // 파일별 그룹 집계
  const fileCounts: Record<string, number> = {};
  for (const i of items) fileCounts[i.archiveFile] = (fileCounts[i.archiveFile] ?? 0) + 1;

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-2 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          <ArchiveIcon className="w-5 h-5 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">보관함</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              총 {items.length}개 &middot; {Object.keys(fileCounts).length}개 파일
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
          새로고침
        </button>
      </div>

      {/* 검색 */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="보관 항목 검색 (제목, 태그, 메모)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
        />
      </div>

      {/* 태그 필터 */}
      {allTags.length > 0 && (
        <div className="mb-4 flex items-start gap-2">
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
          {filtered.length}개 표시 중 (전체 {items.length}개)
        </p>
      )}

      {/* 리스트 */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-4">
        {filtered.length === 0 && (
          <div className="border-2 border-dashed border-border rounded-lg py-12 flex flex-col items-center justify-center gap-2">
            <ArchiveIcon className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {items.length === 0 ? "보관된 항목이 없습니다" : "조건에 맞는 항목이 없습니다"}
            </p>
          </div>
        )}

        {filtered.map((item) => (
          <ArchiveCard
            key={item.id}
            item={item}
            isConfirmingRestore={confirmRestoreId === item.id}
            isConfirmingDelete={confirmDeleteId === item.id}
            onRestoreStart={() => setConfirmRestoreId(item.id)}
            onRestoreCancel={() => setConfirmRestoreId(null)}
            onRestoreConfirm={() => handleRestore(item)}
            onDeleteStart={() => setConfirmDeleteId(item.id)}
            onDeleteCancel={() => setConfirmDeleteId(null)}
            onDeleteConfirm={() => handleDelete(item)}
          />
        ))}
      </div>
    </div>
  );
}

function ArchiveCard({
  item,
  isConfirmingRestore,
  isConfirmingDelete,
  onRestoreStart,
  onRestoreCancel,
  onRestoreConfirm,
  onDeleteStart,
  onDeleteCancel,
  onDeleteConfirm,
}: {
  item: ArchivedTodo;
  isConfirmingRestore: boolean;
  isConfirmingDelete: boolean;
  onRestoreStart: () => void;
  onRestoreCancel: () => void;
  onRestoreConfirm: () => void;
  onDeleteStart: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
}) {
  if (isConfirmingRestore) {
    return (
      <div className={cn("bg-card border border-blue-300 rounded-lg p-4 shadow-sm border-l-4", PRIORITY_LEFT_BORDER[item.priority])}>
        <p className="text-sm font-medium leading-snug mb-1 truncate">{item.content}</p>
        <p className="text-xs text-muted-foreground mb-3">이 항목을 TODO.md 완료 섹션으로 복원할까요?</p>
        <div className="flex gap-1.5 justify-end">
          <button onClick={onRestoreCancel}
            className="text-xs px-3 py-1 border border-border rounded-md hover:bg-muted transition-colors">
            취소
          </button>
          <button onClick={onRestoreConfirm}
            className="text-xs px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium">
            복원
          </button>
        </div>
      </div>
    );
  }

  if (isConfirmingDelete) {
    return (
      <div className={cn("bg-card border border-red-300 rounded-lg p-4 shadow-sm border-l-4", PRIORITY_LEFT_BORDER[item.priority])}>
        <p className="text-sm font-medium leading-snug mb-1 truncate">{item.content}</p>
        <p className="text-xs text-muted-foreground mb-3">영구 삭제할까요? 되돌릴 수 없습니다.</p>
        <div className="flex gap-1.5 justify-end">
          <button onClick={onDeleteCancel}
            className="text-xs px-3 py-1 border border-border rounded-md hover:bg-muted transition-colors">
            취소
          </button>
          <button onClick={onDeleteConfirm}
            className="text-xs px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors font-medium">
            삭제
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "group bg-card border border-border rounded-lg p-3 shadow-sm border-l-4 transition-shadow hover:shadow-md",
      PRIORITY_LEFT_BORDER[item.priority]
    )}>
      <div className="flex items-start gap-1.5 mb-2">
        <p className="text-sm font-medium leading-snug flex-1 opacity-80">{item.content}</p>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onRestoreStart} title="복원"
            className="p-2 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors">
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDeleteStart} title="영구 삭제"
            className="p-2 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", PRIORITY_BADGE[item.priority])}>
          {PRIORITY_LABEL[item.priority]}
        </span>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {item.category}
        </span>
        {item.doneDate && (
          <span className="text-xs text-muted-foreground ml-auto">완료 {item.doneDate}</span>
        )}
        {item.tags.map((tag) => (
          <span key={tag} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
            #{tag}
          </span>
        ))}
      </div>

      {item.memo && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2.5 py-1.5 mb-2 border-l-2 border-muted-foreground/30 whitespace-pre-wrap">
          {item.memo}
        </div>
      )}

      {item.docRefs.length > 0 && (
        <div className="flex flex-col gap-1 mb-2">
          {item.docRefs.map((ref, idx) => (
            <Link key={idx} href={`/docs/view?path=${encodeURIComponent(ref.path)}`}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline truncate">
              <FileText className="w-3 h-3 flex-shrink-0" />
              {ref.issueId && (
                <span className="font-mono bg-primary/10 text-primary px-1 rounded flex-shrink-0">{ref.issueId}</span>
              )}
              <span className="truncate text-muted-foreground">{ref.path.split(/[\\/]/).pop()}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-1.5 border-t border-border/50">
        <FolderOpen className="w-3 h-3" />
        <span className="font-mono truncate">{item.archiveFile}</span>
      </div>
    </div>
  );
}
