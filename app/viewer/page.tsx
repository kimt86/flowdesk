"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Eye,
  FileText,
  Folder,
  FolderOpen,
  RotateCcw,
} from "lucide-react";
import { MarkdownMermaidView } from "@/components/markdown-mermaid-view";
import { MarkdownCopyButton } from "@/components/markdown-copy-button";
import {
  FileTree,
  listDirChildren,
  type TreeNode,
} from "@/components/viewer/file-tree";

interface OpenFile {
  /** 트리에서 식별용 path (단일 파일 모드는 파일명) */
  path: string;
  name: string;
  text: string;
}

interface FsaSupport {
  /** showOpenFilePicker 사용 가능 */
  file: boolean;
  /** showDirectoryPicker 사용 가능 */
  folder: boolean;
  /** 비활성화 이유 (지원되는 경우 null) */
  reason: string | null;
}

function detectFsaSupport(): FsaSupport {
  if (typeof window === "undefined") {
    return { file: false, folder: false, reason: null };
  }
  if (!window.isSecureContext) {
    return {
      file: false,
      folder: false,
      reason:
        "보안 컨텍스트가 아닙니다 — localhost 또는 https://로 접속해야 동작합니다.",
    };
  }
  const fileOk = typeof window.showOpenFilePicker === "function";
  const folderOk = typeof window.showDirectoryPicker === "function";
  if (!fileOk && !folderOk) {
    return {
      file: false,
      folder: false,
      reason:
        "이 브라우저는 File System Access API를 지원하지 않습니다 (Chrome / Edge 권장).",
    };
  }
  return {
    file: fileOk,
    folder: folderOk,
    reason: !folderOk
      ? "이 브라우저는 폴더 열기를 지원하지 않습니다. 파일 열기는 가능합니다."
      : null,
  };
}

export default function ViewerPage() {
  const [root, setRoot] = useState<TreeNode | null>(null);
  const [openFile, setOpenFile] = useState<OpenFile | null>(null);
  const [html, setHtml] = useState("");
  const [renderLoading, setRenderLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // FSA 지원 여부는 마운트 후에만 확정 — SSR/hydration 일치 + 정확한 secure context 체크
  const [fsa, setFsa] = useState<FsaSupport>({
    file: false,
    folder: false,
    reason: null,
  });
  useEffect(() => {
    setFsa(detectFsaSupport());
  }, []);
  const renderAbortRef = useRef<AbortController | null>(null);
  const fallbackFileInputRef = useRef<HTMLInputElement>(null);

  // openFile.text 변경 시 → 서버 렌더 (한지·먹 미감 + mermaid)
  useEffect(() => {
    if (!openFile) {
      setHtml("");
      return;
    }
    renderAbortRef.current?.abort();
    const controller = new AbortController();
    renderAbortRef.current = controller;

    setRenderLoading(true);
    setError(null);
    fetch("/api/docs/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: openFile.text, relPath: "" }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.html === "string") setHtml(data.html);
        else setError("렌더링 실패");
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("[viewer]", err);
          setError("렌더링 중 오류");
        }
      })
      .finally(() => setRenderLoading(false));

    return () => controller.abort();
  }, [openFile]);

  async function pickFolder() {
    if (!fsa.folder) {
      setError(fsa.reason ?? "폴더 열기를 사용할 수 없습니다");
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: "read" });
      const rootNode: TreeNode = {
        name: handle.name,
        kind: "directory",
        path: handle.name,
        handle,
      };
      // 첫 레벨 미리 로드 (트리에서 lazy-expand)
      rootNode.children = await listDirChildren(handle, handle.name);
      setRoot(rootNode);
      setOpenFile(null);
      setError(null);
    } catch (err) {
      // AbortError = 사용자가 취소한 경우
      if ((err as Error).name !== "AbortError") {
        console.error("[viewer] folder open failed", err);
        setError("폴더를 열 수 없습니다");
      }
    }
  }

  async function pickFile() {
    if (fsa.file) {
      try {
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          types: [
            {
              description: "Markdown / 텍스트 문서",
              accept: {
                "text/markdown": [".md", ".markdown"],
                "text/plain": [".txt"],
              },
            },
          ],
          excludeAcceptAllOption: false,
        });
        const file = await handle.getFile();
        const text = await file.text();
        setRoot(null);
        setOpenFile({ path: file.name, name: file.name, text });
        setError(null);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("[viewer] file open failed", err);
          setError("파일을 열 수 없습니다");
        }
      }
    } else {
      // 폴백: <input type=file>
      fallbackFileInputRef.current?.click();
    }
  }

  async function handleFallbackFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      setRoot(null);
      setOpenFile({ path: f.name, name: f.name, text });
      setError(null);
    } catch (err) {
      console.error("[viewer] fallback read failed", err);
      setError("파일을 읽을 수 없습니다");
    }
    if (fallbackFileInputRef.current) fallbackFileInputRef.current.value = "";
  }

  const handleTreeFileSelect = useCallback(async (node: TreeNode) => {
    if (node.kind !== "file") return;
    try {
      const file = await (node.handle as FileSystemFileHandle).getFile();
      const text = await file.text();
      setOpenFile({ path: node.path, name: node.name, text });
      setError(null);
    } catch (err) {
      console.error("[viewer] file read failed", node.path, err);
      setError("파일을 읽을 수 없습니다");
    }
  }, []);

  function reset() {
    setRoot(null);
    setOpenFile(null);
    setHtml("");
    setError(null);
  }

  /* -------------------- 렌더 분기 -------------------- */
  // 빈 상태
  if (!root && !openFile) {
    return (
      <div className="p-4 md:p-6 max-w-3xl">
        <Header />
        <EmptyState
          fsa={fsa}
          onPickFolder={pickFolder}
          onPickFile={pickFile}
          error={error}
        />
        <input
          ref={fallbackFileInputRef}
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          onChange={handleFallbackFileChange}
          className="hidden"
        />
      </div>
    );
  }

  // 단일 파일 모드 (트리 없음)
  if (openFile && !root) {
    return (
      <div className="p-4 md:p-6 max-w-3xl">
        <Header />
        <ReaderToolbar
          name={openFile.name}
          markdown={openFile.text}
          loading={renderLoading}
          onReset={reset}
        />
        {error ? (
          <ErrorRow error={error} />
        ) : (
          <MarkdownMermaidView html={html} />
        )}
      </div>
    );
  }

  // 폴더 모드 — split 레이아웃
  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-screen overflow-hidden">
      {/* 트리 사이드 */}
      <aside className="w-72 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <FolderOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-mono truncate text-foreground">
              {root!.name}
            </span>
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-[10px] text-muted-foreground hover:text-foreground"
            title="다른 폴더/파일 열기"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          <FileTree
            root={root!}
            selectedPath={openFile?.path ?? null}
            onFileSelect={handleTreeFileSelect}
          />
        </div>
      </aside>

      {/* 본문 */}
      <main className="flex-1 overflow-y-auto">
        {openFile ? (
          <div className="p-4 md:p-6 max-w-3xl">
            <ReaderToolbar
              name={openFile.path}
              markdown={openFile.text}
              loading={renderLoading}
              onReset={null}
            />
            {error ? (
              <ErrorRow error={error} />
            ) : (
              <MarkdownMermaidView html={html} />
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            왼쪽 트리에서 파일을 선택하세요
          </div>
        )}
      </main>
    </div>
  );
}

/* -------------------- 서브 컴포넌트 -------------------- */

function Header() {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Eye className="w-5 h-5 text-ink-soft" />
        뷰어
      </h1>
      <p className="text-sm text-muted-foreground mt-0.5">
        외부 마크다운 파일이나 폴더를 열어 한지·먹 미감으로 볼 수 있습니다.
      </p>
    </div>
  );
}

interface EmptyStateProps {
  fsa: FsaSupport;
  onPickFolder: () => void;
  onPickFile: () => void;
  error: string | null;
}

function EmptyState({ fsa, onPickFolder, onPickFile, error }: EmptyStateProps) {
  return (
    <div className="border-2 border-dashed border-border rounded-lg p-10 text-center">
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onPickFolder}
          disabled={!fsa.folder}
          className="inline-flex items-center gap-1.5 text-sm px-4 py-2 bg-foreground text-background rounded-md hover:bg-foreground/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            fsa.folder
              ? "워크스페이스 폴더를 선택해서 트리로 탐색"
              : (fsa.reason ?? "폴더 열기 미지원")
          }
        >
          <Folder className="w-3.5 h-3.5" />
          폴더 열기
        </button>
        <button
          type="button"
          onClick={onPickFile}
          className="inline-flex items-center gap-1.5 text-sm px-4 py-2 border border-border rounded-md text-foreground hover:bg-muted transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          파일 열기
        </button>
      </div>
      {fsa.reason && (
        <p className="mt-4 text-[11px] text-muted-foreground max-w-md mx-auto">
          {fsa.reason}
          {!fsa.file &&
            " 파일 열기는 일반 파일 다이얼로그로 동작합니다."}
        </p>
      )}
      {error && (
        <p className="mt-4 text-xs text-[var(--danger)] flex items-center gap-1.5 justify-center">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

interface ReaderToolbarProps {
  name: string;
  markdown: string;
  loading: boolean;
  onReset: (() => void) | null;
}

function ReaderToolbar({
  name,
  markdown,
  loading,
  onReset,
}: ReaderToolbarProps) {
  return (
    <div className="mb-4 pb-3 border-b border-border flex items-center justify-between gap-3">
      <div className="text-xs text-muted-foreground flex items-center gap-2 min-w-0">
        <FileText className="w-3 h-3 shrink-0" />
        <span className="font-mono truncate">{name}</span>
        {loading && (
          <span className="opacity-60 animate-pulse shrink-0">
            · 렌더링 중
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <MarkdownCopyButton markdown={markdown} />
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            다른 문서
          </button>
        )}
      </div>
    </div>
  );
}

function ErrorRow({ error }: { error: string }) {
  return (
    <p className="text-sm text-[var(--danger)] flex items-center gap-1.5">
      <AlertCircle className="w-4 h-4" />
      {error}
    </p>
  );
}
