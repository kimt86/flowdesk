"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditorToolbar, type ViewMode } from "@/components/docs/editor-toolbar";
import { EditorPreview } from "@/components/docs/editor-preview";
import {
  DocMetadataEditor,
  type DocMetadataInitial,
} from "@/components/docs/doc-metadata-editor";
import { useMarkdownEditor } from "@/lib/hooks/use-markdown-editor";

interface Props {
  relPath: string;
  /** 분리 모드: 본문(body)만 받고 메타 에디터를 렌더 + 저장 시 { body } 전송 */
  initialBody?: string;
  initialMeta?: DocMetadataInitial;
  /** 레거시 모드: frontmatter 포함 raw 전체. 메타 에디터 없음, { content } 전송 */
  initialContent?: string;
  /** 저장 API URL (기본: /api/docs) */
  saveApiBase?: string;
  /** 뷰어 경로 (기본: /docs/view) */
  viewBase?: string;
}

export function DocEditor({
  relPath,
  initialBody,
  initialMeta,
  initialContent,
  saveApiBase = "/api/docs",
  viewBase = "/docs/view",
}: Props) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 분리 모드 vs 레거시 모드 판별
  const splitMode = initialBody !== undefined && initialMeta !== undefined;
  const baseline = splitMode ? (initialBody ?? "") : (initialContent ?? "");

  const [content, setContent] = useState(baseline);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) return "edit";
    return "split";
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = content !== baseline;
  const viewHref = `${viewBase}?path=${encodeURIComponent(relPath)}`;

  const editor = useMarkdownEditor(textareaRef, setContent);

  // 미저장 상태에서 페이지 이탈 경고
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = splitMode ? { body: content } : { content };
      const res = await fetch(`${saveApiBase}?path=${encodeURIComponent(relPath)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.push(viewHref);
      } else {
        setError("저장에 실패했습니다.");
      }
    } catch {
      setError("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }, [content, relPath, router, viewHref, saveApiBase, splitMode]);

  // 키보드 단축키
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    function handleKeyDown(e: KeyboardEvent) {
      // 한국어 IME 입력 중 단축키 차단
      if (e.isComposing) return;

      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault();
          editor.bold();
          break;
        case "i":
          e.preventDefault();
          editor.italic();
          break;
        case "k":
          e.preventDefault();
          editor.insertLink();
          break;
        case "s":
          e.preventDefault();
          handleSave();
          break;
      }

      // Ctrl+Shift+V: 미리보기 토글
      if (e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        setViewMode((prev) =>
          prev === "preview" ? "split" : "preview"
        );
      }
    }

    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [editor, handleSave]);

  // Tab / Shift+Tab: 들여쓰기
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    function handleTab(e: KeyboardEvent) {
      if (e.isComposing) return;
      if (e.key !== "Tab") return;
      e.preventDefault();
      if (e.shiftKey) {
        editor.dedentSelection();
      } else {
        editor.indentSelection();
      }
    }

    el.addEventListener("keydown", handleTab);
    return () => el.removeEventListener("keydown", handleTab);
  }, [editor]);

  const showEditor = viewMode === "edit" || viewMode === "split";
  const showPreview = viewMode === "preview" || viewMode === "split";

  return (
    <div className="flex flex-col h-full p-4 gap-0">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-2 mb-3 shrink-0 flex-wrap">
        <button
          onClick={() => router.push(viewHref)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          보기로 돌아가기
        </button>
        <div className="flex items-center gap-2 ml-auto">
          {error && <p className="text-xs text-red-500">{error}</p>}
          {isDirty && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
              미저장
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm px-4 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      {/* 메타데이터 인라인 편집 — splitMode에서만 (docs 전용) */}
      {splitMode && initialMeta ? (
        <DocMetadataEditor relPath={relPath} initial={initialMeta} />
      ) : (
        <p className="text-xs font-mono text-muted-foreground/60 mb-2 shrink-0">
          {relPath}
        </p>
      )}

      {/* 툴바 */}
      <EditorToolbar
        actions={editor}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* 편집 + 미리보기 패널 */}
      <div className={cn(
        "flex flex-1 min-h-0 overflow-hidden border border-t-0 border-border rounded-b-lg",
        showEditor && showPreview ? "flex-col md:flex-row" : "flex-row"
      )}>
        {showEditor && (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={cn(
              "px-4 py-3 text-sm font-mono bg-background resize-none focus:outline-none",
              showPreview
                ? "w-full md:w-1/2 h-1/2 md:h-full border-b border-border md:border-b-0 md:border-r"
                : "flex-1 w-full rounded-b-lg"
            )}
            spellCheck={false}
          />
        )}
        {showPreview && (
          <div className={cn(
            "flex flex-col overflow-hidden",
            showEditor ? "w-full md:w-1/2 h-1/2 md:h-full" : "flex-1 w-full"
          )}>
            <EditorPreview content={content} relPath={relPath} />
          </div>
        )}
      </div>
    </div>
  );
}
