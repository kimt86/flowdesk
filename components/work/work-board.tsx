"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import path from "path";
import { Briefcase, FileText, Clock, Search, FolderOpen } from "lucide-react";
import type { WorkItem } from "@/lib/work";

export function WorkBoard({ items }: { items: WorkItem[] }) {
  const [query, setQuery] = useState("");

  const totalFiles = useMemo(
    () => items.reduce((sum, it) => sum + it.files.length, 0),
    [items]
  );

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items
        .map((it) => ({
          ...it,
          files: it.files.filter(
            (f) =>
              f.title.toLowerCase().includes(q) ||
              f.relPath.toLowerCase().includes(q)
          ),
        }))
        .filter((it) => it.slug.toLowerCase().includes(q) || it.files.length > 0)
    : items;

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <div className="mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          작업
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          work/ 하위 폴더 {items.length}개 · 파일 {totalFiles}개
        </p>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="폴더명, 파일 제목, 경로로 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
        />
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">work/ 디렉토리가 비어있거나 존재하지 않습니다.</p>
          <p className="text-xs mt-1">
            워크스페이스 루트의 work/ 폴더에 작업 폴더를 만들어 보세요.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((item) => (
          <WorkItemCard key={item.slug} item={item} />
        ))}
      </div>
    </div>
  );
}

function WorkItemCard({ item }: { item: WorkItem }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/40">
        <FolderOpen className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold flex-1 truncate">{item.title}</h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          {item.files.length}
        </span>
      </div>
      {item.files.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          마크다운 파일 없음
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {item.files.map((file) => {
            // workspaceRoot 기준 relPath (예: "work\slug\sub\file.md")에서
            // 작업 폴더 내부 sub-path만 잘라 표시
            const insidePath = file.relPath
              .split(/[\\/]/)
              .slice(2)
              .join(path.sep);
            return (
              <li key={file.relPath}>
                <Link
                  href={`/work/view?path=${encodeURIComponent(file.relPath)}`}
                  className="flex items-start gap-2 px-4 py-2.5 hover:bg-muted/60 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate font-mono">
                      {insidePath}
                    </p>
                  </div>
                  {file.updated && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {file.updated}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
