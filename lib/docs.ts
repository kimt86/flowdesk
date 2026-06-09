import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { DOCS_ROOT, WORKSPACE_ROOT } from "./paths";
import { getOrSet } from "./server-cache";

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

/**
 * scanDocs 결과를 캐시. file-watcher가 docs/ 변경 시 자동 무효화 (lib/cache-invalidator.ts).
 * 다른 호출 인자 조합이 생기면 키에 포함시키도록 확장.
 */
export function getCachedDocs(): DocMeta[] {
  return getOrSet("scanDocs:default", () =>
    scanDocs(DOCS_ROOT, WORKSPACE_ROOT),
  );
}

/** relPath를 DOCS_ROOT 내부 절대 경로로 안전하게 resolve. 외부 경로면 null 반환. */
function resolveDocPath(relPath: string): string | null {
  if (!relPath) return null;
  // relPath는 workspaceRoot 기준 상대 경로 (예: "docs\file.md")
  const resolved = path.resolve(WORKSPACE_ROOT, relPath);
  if (!resolved.startsWith(DOCS_ROOT + path.sep) && resolved !== DOCS_ROOT) return null;
  if (!resolved.endsWith(".md")) return null;
  return resolved;
}

/**
 * relPath를 기반으로 파일을 안전하게 읽습니다.
 * DOCS_ROOT 외부 경로(path traversal) 접근을 차단합니다.
 * docs는 팀 내부 신뢰 파일이지만 URL 파라미터 검증은 필요합니다.
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

const VALID_STATUSES = ["draft", "review", "final"] as const;

export interface DocMetaPatch {
  title?: string;
  status?: string;
  author?: string;
  tags?: string[];
}

/**
 * YAML이 Date 객체로 파싱한 필드를 YYYY-MM-DD 문자열로 되돌림.
 * stringify 시 ISO datetime(`2026-01-01T00:00:00.000Z`)으로 변환되는 회귀 방지.
 */
function normalizeDates(data: Record<string, unknown>): void {
  for (const key of Object.keys(data)) {
    const v = data[key];
    if (v instanceof Date) {
      data[key] = v.toISOString().split("T")[0];
    }
  }
}

/**
 * Frontmatter의 메타 필드를 부분 업데이트하고 updated 날짜를 자동 갱신.
 * 다른 frontmatter 필드(스키마 외 사용자 정의)는 그대로 보존.
 */
export function patchDocMeta(relPath: string, patch: DocMetaPatch): boolean {
  const raw = readDocSafe(relPath);
  if (raw === null) return false;
  const { data, content } = matter(raw);

  if (patch.title !== undefined) data.title = patch.title;
  if (patch.status !== undefined) {
    if (!VALID_STATUSES.includes(patch.status as (typeof VALID_STATUSES)[number])) {
      return false;
    }
    data.status = patch.status;
  }
  if (patch.author !== undefined) data.author = patch.author;
  if (patch.tags !== undefined) data.tags = patch.tags;

  data.updated = new Date().toISOString().split("T")[0];
  normalizeDates(data);

  const newRaw = matter.stringify(content, data);
  return writeDocSafe(relPath, newRaw);
}

/** body만 교체하고 frontmatter는 디스크 상태 유지 + updated 자동 갱신. */
export function patchDocBody(relPath: string, body: string): boolean {
  const raw = readDocSafe(relPath);
  if (raw === null) return false;
  const { data } = matter(raw);

  data.updated = new Date().toISOString().split("T")[0];
  normalizeDates(data);

  const newRaw = matter.stringify(body, data);
  return writeDocSafe(relPath, newRaw);
}

/**
 * 새 문서를 생성합니다. 이미 존재하면 false 반환. 중간 디렉토리 자동 생성.
 */
export function createDocSafe(relPath: string, content: string): boolean {
  const resolved = resolveDocPath(relPath);
  if (!resolved) return false;
  if (fs.existsSync(resolved)) return false;
  try {
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
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
