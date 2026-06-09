"use client";

import { useEffect, useState } from "react";
import { ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";

export interface TreeNode {
  name: string;
  kind: "file" | "directory";
  /** 루트 기준 상대 경로 — 선택 식별자로 사용 */
  path: string;
  handle: FileSystemFileHandle | FileSystemDirectoryHandle;
  /** directory: undefined = 미로드 / [] = 빈 폴더 / 배열 = 로드됨 */
  children?: TreeNode[];
}

const SKIP_NAMES = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".next",
  ".vercel",
  ".idea",
  ".vscode",
  ".DS_Store",
  "Thumbs.db",
]);

function shouldSkip(name: string): boolean {
  if (SKIP_NAMES.has(name)) return true;
  // 점으로 시작하는 숨김 파일/폴더는 기본 스킵 (.gitignore 등)
  if (name.startsWith(".")) return true;
  return false;
}

export async function listDirChildren(
  dir: FileSystemDirectoryHandle,
  parentPath: string,
): Promise<TreeNode[]> {
  const result: TreeNode[] = [];
  for await (const entry of dir.values()) {
    if (shouldSkip(entry.name)) continue;
    result.push({
      name: entry.name,
      kind: entry.kind,
      path: parentPath ? `${parentPath}/${entry.name}` : entry.name,
      handle: entry,
    });
  }
  // 폴더 먼저, 그 다음 파일 — 각각 알파벳순
  result.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name, "ko");
  });
  return result;
}

interface FileTreeProps {
  root: TreeNode;
  selectedPath: string | null;
  onFileSelect: (node: TreeNode) => void;
}

export function FileTree({ root, selectedPath, onFileSelect }: FileTreeProps) {
  return (
    <ul className="text-sm">
      <FolderRow
        node={root}
        level={0}
        selectedPath={selectedPath}
        onFileSelect={onFileSelect}
        defaultExpanded
      />
    </ul>
  );
}

interface RowProps {
  node: TreeNode;
  level: number;
  selectedPath: string | null;
  onFileSelect: (node: TreeNode) => void;
  defaultExpanded?: boolean;
}

function FolderRow({
  node,
  level,
  selectedPath,
  onFileSelect,
  defaultExpanded = false,
}: RowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [children, setChildren] = useState<TreeNode[] | undefined>(
    node.children,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // defaultExpanded인데 아직 자식 없으면 즉시 로드
  useEffect(() => {
    if (defaultExpanded && children === undefined) {
      void loadChildren();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadChildren() {
    if (children !== undefined || loading) return;
    setLoading(true);
    setError(null);
    try {
      const kids = await listDirChildren(
        node.handle as FileSystemDirectoryHandle,
        node.path,
      );
      setChildren(kids);
      node.children = kids; // 캐시
    } catch (err) {
      console.error("[file-tree] list failed", node.path, err);
      setError("폴더를 읽을 수 없습니다");
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    if (!expanded) await loadChildren();
    setExpanded((e) => !e);
  }

  const indent = level * 12;

  return (
    <li>
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-1 px-2 py-1 hover:bg-muted text-left text-foreground"
        style={{ paddingLeft: 8 + indent }}
      >
        <ChevronRight
          className={`w-3 h-3 shrink-0 transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
        />
        {expanded ? (
          <FolderOpen className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <Folder className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate">{node.name}</span>
        {loading && (
          <span className="text-[10px] text-muted-foreground ml-auto">…</span>
        )}
      </button>

      {expanded && (
        <ul>
          {error && (
            <li
              className="text-[11px] text-[var(--danger)] px-2 py-0.5"
              style={{ paddingLeft: 8 + indent + 16 }}
            >
              {error}
            </li>
          )}
          {children &&
            children.length === 0 &&
            !loading && (
              <li
                className="text-[11px] text-muted-foreground italic px-2 py-0.5"
                style={{ paddingLeft: 8 + indent + 16 }}
              >
                비어 있음
              </li>
            )}
          {children?.map((child) =>
            child.kind === "directory" ? (
              <FolderRow
                key={child.path}
                node={child}
                level={level + 1}
                selectedPath={selectedPath}
                onFileSelect={onFileSelect}
              />
            ) : (
              <FileRow
                key={child.path}
                node={child}
                level={level + 1}
                isSelected={selectedPath === child.path}
                onFileSelect={onFileSelect}
              />
            ),
          )}
        </ul>
      )}
    </li>
  );
}

interface FileRowProps {
  node: TreeNode;
  level: number;
  isSelected: boolean;
  onFileSelect: (node: TreeNode) => void;
}

function FileRow({ node, level, isSelected, onFileSelect }: FileRowProps) {
  const indent = level * 12;
  const isMarkdown = /\.(md|markdown)$/i.test(node.name);
  return (
    <li>
      <button
        type="button"
        onClick={() => onFileSelect(node)}
        className={`w-full flex items-center gap-1 px-2 py-1 hover:bg-muted text-left ${
          isSelected
            ? "bg-muted text-foreground font-medium"
            : isMarkdown
              ? "text-foreground"
              : "text-muted-foreground"
        }`}
        style={{ paddingLeft: 8 + indent + 12 }}
      >
        <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{node.name}</span>
      </button>
    </li>
  );
}
