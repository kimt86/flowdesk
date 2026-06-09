"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import {
  DocMetadataEditor,
  type DocMetadataInitial,
} from "@/components/docs/doc-metadata-editor";
import {
  MilkdownDocEditor,
  type MilkdownEditorHandle,
} from "@/components/docs/milkdown-doc-editor";

interface Props {
  relPath: string;
  initialBody: string;
  initialMeta: DocMetadataInitial;
}

export function DocEditorMilkdown({ relPath, initialBody, initialMeta }: Props) {
  const router = useRouter();
  const editorRef = useRef<MilkdownEditorHandle>(null);
  const currentMarkdownRef = useRef(initialBody);

  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewHref = `/docs/view?path=${encodeURIComponent(relPath)}`;

  const handleChange = useCallback(
    (md: string) => {
      currentMarkdownRef.current = md;
      // Milkdown은 마운트 시 초기 직렬화 호출이 한 번 일어날 수 있어 첫 호출은 dirty 처리에서 제외
      if (md.trim() !== initialBody.trim()) {
        setIsDirty(true);
      } else {
        setIsDirty(false);
      }
    },
    [initialBody],
  );

  const handleSave = useCallback(async () => {
    if (saving) return;
    const md =
      editorRef.current?.getMarkdown() ?? currentMarkdownRef.current;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/docs?path=${encodeURIComponent(relPath)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: md }),
        },
      );
      if (res.ok) {
        router.push(viewHref);
      } else {
        setError("저장에 실패했습니다.");
        setSaving(false);
      }
    } catch {
      setError("저장 중 오류가 발생했습니다.");
      setSaving(false);
    }
  }, [relPath, router, viewHref, saving]);

  // Ctrl+S / Cmd+S 단축키 (윈도우 단위 — Milkdown 내부 키맵 충돌 방지)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  // 미저장 상태에서 페이지 이탈 경고
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  return (
    <div className="flex flex-col h-full p-4 max-w-4xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-2 mb-3 shrink-0 flex-wrap">
        <button
          type="button"
          onClick={() => router.push(viewHref)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          보기로 돌아가기
        </button>
        <div className="flex items-center gap-2 ml-auto">
          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
          {isDirty && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--warn)] inline-block" />
              미저장
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm px-4 py-1.5 bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors font-medium disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      {/* 메타데이터 */}
      <DocMetadataEditor relPath={relPath} initial={initialMeta} />

      {/* Milkdown 에디터 */}
      <div className="flex-1 min-h-0 overflow-auto border border-border rounded-lg bg-background p-4">
        <MilkdownDocEditor
          ref={editorRef}
          initialMarkdown={initialBody}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
