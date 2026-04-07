"use client";

import { useState } from "react";
import { Presentation, Tag, Search, ExternalLink } from "lucide-react";
import type { PresentationMeta } from "@/lib/presentations";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function PresentationList({ presentations }: { presentations: PresentationMeta[] }) {
  const [query, setQuery] = useState("");

  const filtered = query
    ? presentations.filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.date.includes(query)
      )
    : presentations;

  // 연도별 그룹핑
  const byYear = new Map<number, PresentationMeta[]>();
  for (const p of filtered) {
    if (!byYear.has(p.year)) byYear.set(p.year, []);
    byYear.get(p.year)!.push(p);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="제목 또는 날짜로 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Presentation className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">
            {query ? "검색 결과가 없습니다." : "저장된 발표자료가 없습니다."}
          </p>
          {!query && (
            <p className="text-xs mt-1 text-muted-foreground/60">
              presentations/ 디렉토리에 .html 파일을 추가하면 자동으로 표시됩니다.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {years.map((year) => (
            <section key={year}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
                {year}년 <span className="font-normal">· {byYear.get(year)!.length}건</span>
              </h2>
              <div className="space-y-2">
                {byYear.get(year)!.map((pres) => (
                  <a
                    key={pres.relPath}
                    href={`/api/presentations/serve?path=${encodeURIComponent(pres.relPath)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-card border border-border rounded-lg p-4 hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Presentation className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate">{pres.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{pres.date}</p>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          {pres.slideCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {pres.slideCount}장
                            </span>
                          )}
                          <span>{formatSize(pres.fileSize)}</span>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
