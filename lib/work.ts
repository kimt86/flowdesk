import fs from "fs";
import path from "path";
import { WORK_DIR, WORKSPACE_ROOT } from "./paths";
import { scanDocs } from "./docs";
import type { DocMeta } from "./docs-shared";
import { getOrSet } from "./server-cache";

export type WorkFile = DocMeta;

export interface WorkItem {
  /** 최상위 폴더명 (예: "ax-trl7-proposal") */
  slug: string;
  /** 표시 이름 — 현재는 slug 그대로 */
  title: string;
  /** 폴더 절대 경로 */
  dir: string;
  /** 폴더 내부 .md 파일 목록 (재귀) */
  files: WorkFile[];
}

export function getCachedWork(): WorkItem[] {
  return getOrSet("scanWork:default", () => scanWork());
}

/** WORK_DIR 1단계 서브폴더를 work item 단위로 묶어 반환. */
export function scanWork(): WorkItem[] {
  const items: WorkItem[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(WORK_DIR, { withFileTypes: true });
  } catch {
    return items;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(WORK_DIR, entry.name);
    const files = scanDocs(dir, WORKSPACE_ROOT);
    items.push({
      slug: entry.name,
      title: entry.name,
      dir,
      files,
    });
  }

  items.sort((a, b) => a.slug.localeCompare(b.slug));
  return items;
}

/** relPath를 WORK_DIR 내부 절대 경로로 안전하게 resolve. 외부 경로면 null. */
function resolveWorkPath(relPath: string): string | null {
  if (!relPath) return null;
  const resolved = path.resolve(WORKSPACE_ROOT, relPath);
  if (!resolved.startsWith(WORK_DIR + path.sep) && resolved !== WORK_DIR) return null;
  if (!resolved.endsWith(".md")) return null;
  return resolved;
}

export function readWorkSafe(relPath: string): string | null {
  const resolved = resolveWorkPath(relPath);
  if (!resolved) return null;
  try {
    return fs.readFileSync(resolved, "utf-8");
  } catch {
    return null;
  }
}

export function writeWorkSafe(relPath: string, content: string): boolean {
  const resolved = resolveWorkPath(relPath);
  if (!resolved) return false;
  try {
    fs.writeFileSync(resolved, content, "utf-8");
    return true;
  } catch {
    return false;
  }
}

export function deleteWorkSafe(relPath: string): boolean {
  const resolved = resolveWorkPath(relPath);
  if (!resolved) return false;
  try {
    fs.unlinkSync(resolved);
    return true;
  } catch {
    return false;
  }
}
