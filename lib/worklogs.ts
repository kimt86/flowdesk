import fs from "fs";
import path from "path";
import { WORKLOGS_DIR } from "./paths";

export interface WorklogMeta {
  filePath: string;
  relPath: string;     // WORKLOGS_DIR 기준 상대 경로
  weekNumber: number;
  year: number;
  month: string;
  dateRange: string;
  author: string;
  summary: string;
  tags: string[];
}

/** 마크다운 테이블 행에서 값 추출: | **키** | 값 | */
function parseTableRow(content: string, key: string): string {
  const regex = new RegExp(`\\|\\s*\\*\\*${key}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`);
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

/** 주간 요약 blockquote 추출 */
function parseSummary(content: string): string {
  // "## 주간 요약" 섹션 이후 첫 번째 ">" 로 시작하는 줄
  const match = content.match(/##\s*주간\s*요약[\s\S]*?^>\s*(.+)/m);
  return match ? match[1].trim() : "";
}

/** `\`tag1\` \`tag2\`` 형태의 태그 파싱 */
function parseTags(raw: string): string[] {
  const matches = raw.match(/`([^`]+)`/g);
  if (!matches) return [];
  return matches.map((t) => t.replace(/`/g, "").trim());
}

export function scanWorklogs(): WorklogMeta[] {
  const results: WorklogMeta[] = [];

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
      } else if (/^week-\d+\.md$/.test(entry.name)) {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const relPath = path.relative(WORKLOGS_DIR, fullPath);

          // 경로에서 year, month 추출: 2026/03/week-14.md
          const parts = relPath.replace(/\\/g, "/").split("/");
          const year = parseInt(parts[0] ?? "0", 10);
          const month = parts[1] ?? "";

          // 주차 번호: "2026년 W14" → 14
          const weekRaw = parseTableRow(content, "주차");
          const weekMatch = weekRaw.match(/W(\d+)/);
          const weekNumber = weekMatch ? parseInt(weekMatch[1], 10) : 0;

          const dateRange = parseTableRow(content, "기간");
          const author = parseTableRow(content, "작성자");
          const tagsRaw = parseTableRow(content, "태그");
          const tags = parseTags(tagsRaw);
          const summary = parseSummary(content);

          results.push({
            filePath: fullPath,
            relPath,
            weekNumber,
            year,
            month,
            dateRange,
            author,
            summary,
            tags,
          });
        } catch {
          // 파싱 실패 시 skip
        }
      }
    }
  }

  try {
    walk(WORKLOGS_DIR);
  } catch {
    // WORKLOGS_DIR 없으면 빈 배열 반환
  }

  // 최신순 정렬 (year desc, weekNumber desc)
  results.sort((a, b) =>
    a.year !== b.year ? b.year - a.year : b.weekNumber - a.weekNumber
  );

  return results;
}

/**
 * relPath 기준으로 파일을 안전하게 읽습니다.
 * WORKLOGS_DIR 외부 경로(path traversal) 접근을 차단합니다.
 */
export function readWorklogSafe(relPath: string): string | null {
  if (!relPath) return null;
  const resolved = path.resolve(WORKLOGS_DIR, relPath);
  if (
    !resolved.startsWith(WORKLOGS_DIR + path.sep) &&
    resolved !== WORKLOGS_DIR
  ) {
    return null;
  }
  if (!resolved.endsWith(".md")) return null;
  try {
    return fs.readFileSync(resolved, "utf-8");
  } catch {
    return null;
  }
}
