import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { MEETING_MINUTES_DIR } from "./paths";
import { getOrSet } from "./server-cache";

export interface MeetingMeta {
  filePath: string;
  relPath: string;
  title: string;
  date: string;
  attendees: string[];
  status: "draft" | "finalized";
  tags: string[];
  year: number;
  month: string;
}

/** 마크다운 테이블 행에서 값 추출: | **키** | 값 | */
function parseTableRow(content: string, key: string): string {
  const regex = new RegExp(`\\|\\s*\\*\\*${key}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`);
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

/** `tag1` `tag2` 형태의 태그 파싱 */
function parseTags(raw: string): string[] {
  const matches = raw.match(/`([^`]+)`/g);
  if (!matches) return [];
  return matches.map((t) => t.replace(/`/g, "").trim());
}

/** # 회의록 — 제목 형태에서 제목 추출 */
function parseTitleFromHeading(content: string, fileName: string): string {
  const match = content.match(/^#\s+회의록\s*[—\-]\s*(.+)/m);
  if (match) return match[1].trim();
  const h1Match = content.match(/^#\s+(.+)/m);
  if (h1Match) return h1Match[1].trim();
  return fileName.replace(/\.md$/, "");
}

/** 파일에 프론트매터(---)가 있는지 확인 */
function hasFrontmatter(content: string): boolean {
  return content.trimStart().startsWith("---");
}

function parseMeetingFile(
  raw: string,
  fullPath: string,
  relPath: string,
  fileName: string
): MeetingMeta {
  const parts = relPath.replace(/\\/g, "/").split("/");
  const year = parseInt(parts[0] ?? "0", 10);
  const month = parts[1] ?? "";

  if (hasFrontmatter(raw)) {
    // 프론트매터 형식
    const { data } = matter(raw);
    const dateStr = data.date
      ? (data.date instanceof Date
          ? data.date.toISOString().slice(0, 10)
          : String(data.date))
      : "";
    return {
      filePath: fullPath,
      relPath,
      title: String(data.title ?? fileName.replace(/\.md$/, "")),
      date: dateStr,
      attendees: Array.isArray(data.attendees) ? data.attendees.map(String) : [],
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      status: data.status === "finalized" ? "finalized" : "draft",
      year: year || (dateStr ? parseInt(dateStr.slice(0, 4), 10) : 0),
      month: month || (dateStr ? dateStr.slice(5, 7) : ""),
    };
  }

  // 마크다운 테이블 형식 (worklogs 패턴)
  const dateRaw = parseTableRow(raw, "일시");
  const attendeesRaw = parseTableRow(raw, "참석자");
  const tagsRaw = parseTableRow(raw, "태그");
  const title = parseTitleFromHeading(raw, fileName);

  // 날짜에서 YYYY-MM-DD 추출 (미정인 경우 xx 포함 가능)
  const dateMatch = dateRaw.match(/(\d{4}-\d{2}-\d{2})/);
  const dateStr = dateMatch ? dateMatch[1] : "";

  return {
    filePath: fullPath,
    relPath,
    title,
    date: dateStr,
    attendees: attendeesRaw ? attendeesRaw.split(/[,、]/).map((s) => s.trim()).filter(Boolean) : [],
    tags: parseTags(tagsRaw),
    status: "draft",
    year: year || (dateStr ? parseInt(dateStr.slice(0, 4), 10) : 0),
    month: month || (dateStr ? dateStr.slice(5, 7) : ""),
  };
}

export function getCachedMeetings(): MeetingMeta[] {
  return getOrSet("scanMeetings:default", () => scanMeetings());
}

export function scanMeetings(): MeetingMeta[] {
  const results: MeetingMeta[] = [];

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
      } else if (entry.name.endsWith(".md")) {
        try {
          const raw = fs.readFileSync(fullPath, "utf-8");
          const relPath = path.relative(MEETING_MINUTES_DIR, fullPath);
          results.push(parseMeetingFile(raw, fullPath, relPath, entry.name));
        } catch {
          // 파싱 실패 시 skip
        }
      }
    }
  }

  try {
    walk(MEETING_MINUTES_DIR);
  } catch {
    // 디렉토리 없으면 빈 배열
  }

  // 최신순 정렬: 날짜가 있는 것 먼저, 그 다음 파일명순
  results.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return b.relPath.localeCompare(a.relPath);
  });

  return results;
}

export function readMeetingSafe(relPath: string): string | null {
  if (!relPath) return null;
  const resolved = path.resolve(MEETING_MINUTES_DIR, relPath);
  if (
    !resolved.startsWith(MEETING_MINUTES_DIR + path.sep) &&
    resolved !== MEETING_MINUTES_DIR
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
