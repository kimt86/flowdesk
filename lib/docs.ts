import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { DOCS_ROOT, WORKSPACE_ROOT } from "./paths";

// 공유 상수/타입은 docs-shared.ts에서 re-export (클라이언트 호환)
export { STATUS_LABELS, STATUS_COLORS } from "./docs-shared";
export type { DocMeta } from "./docs-shared";
export { DOCS_ROOT };
import type { DocMeta } from "./docs-shared";

export function scanDocs(dir: string, base: string): DocMeta[] {
  const results: DocMeta[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...scanDocs(fullPath, base));
      } else if (entry.name.endsWith(".md") && entry.name !== "README.md") {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const { data } = matter(content);
          const toStr = (v: unknown) =>
            v instanceof Date ? v.toISOString().split("T")[0] : String(v ?? "");
          results.push({
            filePath: fullPath,
            relPath: path.relative(base, fullPath),
            title: typeof data.title === "string" ? data.title : entry.name.replace(".md", ""),
            status: typeof data.status === "string" ? data.status : "draft",
            created: toStr(data.created),
            updated: toStr(data.updated),
            author: typeof data.author === "string" ? data.author : "",
            tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
          });
        } catch {
          // 파싱 실패 시 skip
        }
      }
    }
  } catch {
    // 디렉토리 없으면 skip
  }
  return results;
}

/** relPath를 DOCS_ROOT 내부 절대 경로로 안전하게 resolve. 외부 경로면 null 반환. */
function resolveDocPath(relPath: string): string | null {
  if (!relPath) return null;
  // relPath는 workspaceRoot 기준 상대 경로 (예: "dev-docs\file.md")
  const resolved = path.resolve(WORKSPACE_ROOT, relPath);
  if (!resolved.startsWith(DOCS_ROOT + path.sep) && resolved !== DOCS_ROOT) return null;
  if (!resolved.endsWith(".md")) return null;
  return resolved;
}

/**
 * relPath를 기반으로 파일을 안전하게 읽습니다.
 * DOCS_ROOT 외부 경로(path traversal) 접근을 차단합니다.
 * dev-docs는 팀 내부 신뢰 파일이지만 URL 파라미터 검증은 필요합니다.
 */
export function readDocSafe(relPath: string): string | null {
  const resolved = resolveDocPath(relPath);
  if (!resolved) return null;
  try {
    return fs.readFileSync(resolved, "utf-8");
  } catch {
    return null;
  }
}

/** relPath 문서의 전체 내용을 덮어씁니다. */
export function writeDocSafe(relPath: string, content: string): boolean {
  const resolved = resolveDocPath(relPath);
  if (!resolved) return false;
  try {
    fs.writeFileSync(resolved, content, "utf-8");
    return true;
  } catch {
    return false;
  }
}

/** relPath 문서를 삭제합니다. */
export function deleteDocSafe(relPath: string): boolean {
  const resolved = resolveDocPath(relPath);
  if (!resolved) return false;
  try {
    fs.unlinkSync(resolved);
    return true;
  } catch {
    return false;
  }
}
