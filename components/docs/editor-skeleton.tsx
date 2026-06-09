"use client";

import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";

/** Milkdown 에디터 lazy-load 동안 보여줄 placeholder. layout shift 최소화. */
export function EditorSkeleton() {
  return (
    <div className="flex flex-col h-full p-4 max-w-4xl">
      <div className="flex items-center justify-between gap-2 mb-3 shrink-0 flex-wrap">
        <Link
          href="/docs"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          문서
        </Link>
        <button
          type="button"
          disabled
          className="flex items-center gap-1.5 text-sm px-4 py-1.5 bg-foreground/40 text-background rounded-md opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          에디터 로딩 중…
        </button>
      </div>

      {/* 메타 자리 */}
      <div className="mb-6 pb-4 border-b border-border space-y-3">
        <div className="h-6 w-2/3 bg-muted rounded animate-pulse" />
        <div className="flex gap-3">
          <div className="h-3 w-16 bg-muted rounded animate-pulse" />
          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          <div className="h-3 w-32 bg-muted rounded animate-pulse" />
        </div>
      </div>

      {/* 본문 자리 */}
      <div className="flex-1 min-h-0 border border-border rounded-lg bg-background p-4 space-y-3">
        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}
