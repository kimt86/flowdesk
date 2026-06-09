"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, FolderPlus, Plus, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

interface Props {
  /** 기존 폴더 목록 (docs/ 기준 상대, 중간 경로 모두 포함) */
  existingFolders: string[];
}

const ROOT_LABEL = "(루트 — docs/)";

export function NewDocButton({ existingFolders }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [folder, setFolder] = useState(""); // 자유 입력 + 자동완성 — "" = 루트
  const [filename, setFilename] = useState("");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFolder("");
    setFilename("");
    setTitle("");
    setError(null);
  }

  // 미리보기 경로
  const previewPath = useMemo(() => {
    const fn = filename.trim().replace(/\.md$/i, "");
    if (!fn) return "";
    const cleanFolder = folder
      .trim()
      .replace(/\\/g, "/")
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean)
      .join("/");
    const parts = ["docs"];
    if (cleanFolder) parts.push(cleanFolder);
    parts.push(`${fn}.md`);
    return parts.join("/");
  }, [folder, filename]);

  // 입력한 폴더가 신규(기존에 없음)인지
  const isNewFolder = useMemo(() => {
    const cleaned = folder
      .trim()
      .replace(/\\/g, "/")
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean)
      .join("/");
    if (!cleaned) return false;
    return !existingFolders.includes(cleaned);
  }, [folder, existingFolders]);

  async function handleCreate() {
    const fn = filename.trim().replace(/\.md$/i, "");
    if (!fn) {
      setError("파일명을 입력하세요");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const cleanFolder = folder.trim().replace(/^\/+|\/+$/g, "");
      const combined = cleanFolder ? `${cleanFolder}/${fn}` : fn;
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relPath: combined, title: title.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "생성 실패");
        setCreating(false);
        return;
      }
      const { relPath: created } = (await res.json()) as { relPath: string };
      setOpen(false);
      reset();
      router.push(`/docs/edit?path=${encodeURIComponent(created)}`);
    } catch (err) {
      console.error("[new-doc] failed", err);
      setError("생성 중 오류가 발생했습니다");
      setCreating(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          새 문서
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-foreground/30 backdrop-blur-[2px] z-50 animate-in fade-in duration-micro" />
        <Dialog.Content
          className="fixed top-[18vh] left-1/2 -translate-x-1/2 w-[min(520px,calc(100vw-32px))] bg-surface border border-border-strong rounded-sm z-50 shadow-[0_8px_24px_rgba(20,18,16,0.10)]"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const root = e.currentTarget as HTMLElement;
            root.querySelector<HTMLInputElement>("input[name=folder]")?.focus();
          }}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <Dialog.Title className="text-sm font-semibold">새 문서</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="닫기"
                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
              <div>
                <span className="block text-xs font-medium text-muted-foreground mb-1.5">
                  폴더{" "}
                  <span className="opacity-60">
                    (입력 또는 선택 · 비우면 루트)
                  </span>
                </span>
                <FolderCombobox
                  value={folder}
                  options={existingFolders}
                  onChange={setFolder}
                  isNew={isNewFolder}
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-muted-foreground mb-1.5">
                  파일명
                </span>
                <input
                  name="filename"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreate();
                    }
                  }}
                  placeholder="예: new-spec"
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:border-accent font-mono"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground font-mono break-all min-h-[1.2em]">
              {previewPath ? (
                <>
                  저장 위치:{" "}
                  <span className="text-foreground">{previewPath}</span>
                  {isNewFolder && (
                    <span className="ml-2 text-[var(--accent)]">
                      · 새 폴더 자동 생성
                    </span>
                  )}
                </>
              ) : (
                <span className="opacity-60">
                  파일명을 입력하면 저장 경로가 표시됩니다
                </span>
              )}
            </div>

            <label className="block">
              <span className="block text-xs font-medium text-muted-foreground mb-1.5">
                제목 <span className="opacity-60">(선택 — 비우면 파일명 사용)</span>
              </span>
              <input
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                placeholder="문서 제목"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:border-accent"
              />
            </label>

            {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
            <Dialog.Close asChild>
              <button
                type="button"
                className="text-sm px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                취소
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !filename.trim()}
              className="text-sm px-4 py-1.5 bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors font-medium disabled:opacity-50"
            >
              {creating ? "만드는 중…" : "만들고 편집"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface FolderComboboxProps {
  value: string;
  options: string[];
  onChange: (next: string) => void;
  isNew: boolean;
}

function FolderCombobox({ value, options, onChange, isNew }: FolderComboboxProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [value, options]);

  // 활성 인덱스 동기화
  useEffect(() => {
    if (!open) {
      setActiveIdx(-1);
      return;
    }
    if (activeIdx >= filtered.length) setActiveIdx(filtered.length - 1);
  }, [open, filtered, activeIdx]);

  function selectAndClose(next: string) {
    onChange(next);
    setOpen(false);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && open && activeIdx >= 0) {
      e.preventDefault();
      selectAndClose(filtered[activeIdx]);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          name="folder"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={ROOT_LABEL}
          autoComplete="off"
          spellCheck={false}
          className="w-full px-3 py-2 pr-8 text-sm bg-background border border-border rounded-md focus:outline-none focus:border-accent font-mono"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          aria-label="폴더 목록"
          className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full mt-1 z-[60] bg-card border border-border rounded-md py-1 max-h-64 overflow-auto"
        >
          {/* 루트 옵션 */}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              selectAndClose("");
            }}
            className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-muted ${value === "" ? "bg-muted/50" : ""}`}
          >
            <span className="text-muted-foreground">{ROOT_LABEL}</span>
          </button>

          {filtered.length === 0 ? (
            isNew && value.trim() ? (
              <div className="px-3 py-1.5 text-xs text-muted-foreground italic">
                일치하는 폴더 없음 — Enter로 새 폴더 생성
              </div>
            ) : (
              <div className="px-3 py-1.5 text-xs text-muted-foreground italic">
                폴더 없음
              </div>
            )
          ) : (
            filtered.map((opt, i) => (
              <button
                key={opt}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectAndClose(opt);
                }}
                onMouseEnter={() => setActiveIdx(i)}
                className={`w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-muted ${
                  i === activeIdx ? "bg-muted" : ""
                } ${value === opt ? "text-foreground" : "text-muted-foreground"}`}
              >
                {opt}
              </button>
            ))
          )}

          {isNew && value.trim() && filtered.length > 0 && (
            <>
              <div className="h-px bg-border my-1" />
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--accent)]">
                <FolderPlus className="w-3 h-3" />새 폴더로 사용:{" "}
                <span className="font-mono">{value.trim()}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
