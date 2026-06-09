import fs from "fs";
import path from "path";
import { PRESENTATIONS_DIR } from "./paths";
import { getOrSet } from "./server-cache";

export interface PresentationMeta {
  filePath: string;
  relPath: string;
  title: string;
  date: string;
  slideCount: number;
  fileSize: number;
  year: number;
  month: string;
}

/** HTML <title> 태그에서 제목 추출 */
function extractTitle(html: string, fileName: string): string {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  if (match && match[1].trim()) return match[1].trim();
  // fallback: 파일명에서 날짜 제거
  return fileName
    .replace(/\.html$/, "")
    .replace(/^\d{4}-\d{2}-\d{2}-?/, "")
    .replace(/-/g, " ")
    .trim() || fileName;
}

/** .slide 클래스 개수로 슬라이드 수 추출 */
function countSlides(html: string): number {
  const matches = html.match(/class="[^"]*slide[^"]*"/g);
  return matches ? matches.length : 0;
}

/** 파일명에서 YYYY-MM-DD 날짜 추출 */
function extractDate(fileName: string): string {
  const match = fileName.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

export function getCachedPresentations(): PresentationMeta[] {
  return getOrSet("scanPresentations:default", () => scanPresentations());
}

export function scanPresentations(): PresentationMeta[] {
  const results: PresentationMeta[] = [];

  function walk(dir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".html")) {
        try {
          const html = fs.readFileSync(fullPath, "utf-8");
          const stat = fs.statSync(fullPath);
          const relPath = path.relative(PRESENTATIONS_DIR, fullPath);
          const parts = relPath.replace(/\\/g, "/").split("/");
          const year = parseInt(parts[0] ?? "0", 10);
          const month = parts[1] ?? "";
          const dateStr = extractDate(entry.name);

          results.push({
            filePath: fullPath,
            relPath,
            title: extractTitle(html, entry.name),
            date: dateStr,
            slideCount: countSlides(html),
            fileSize: stat.size,
            year: year || (dateStr ? parseInt(dateStr.slice(0, 4), 10) : 0),
            month: month || (dateStr ? dateStr.slice(5, 7) : ""),
          });
        } catch {
          // 파싱 실패 시 skip
        }
      }
    }
  }

  try {
    walk(PRESENTATIONS_DIR);
  } catch {
    // 디렉토리 없으면 빈 배열
  }

  results.sort((a, b) => b.date.localeCompare(a.date));
  return results;
}

/** 안전한 파일 경로 검증 후 절대 경로 반환 */
export function resolvePresentationSafe(relPath: string): string | null {
  if (!relPath) return null;
  const resolved = path.resolve(PRESENTATIONS_DIR, relPath);
  if (
    !resolved.startsWith(PRESENTATIONS_DIR + path.sep) &&
    resolved !== PRESENTATIONS_DIR
  ) {
    return null;
  }
  if (!resolved.endsWith(".html")) return null;
  try {
    fs.accessSync(resolved, fs.constants.R_OK);
    return resolved;
  } catch {
    return null;
  }
}
