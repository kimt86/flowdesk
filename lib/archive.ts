import fs from "fs";
import path from "path";
import { ArchivedTodo, MonthSummary, Todo } from "@/lib/types";
import { ARCHIVE_DIR, ARCHIVE_FILE_PATH, TODAY_FILE_PATH } from "@/lib/paths";
import { parseTodos } from "@/lib/parsers/todo-parser";

function walkMarkdown(dir: string): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkMarkdown(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      results.push(full);
    }
  }
  return results;
}

function toRelative(absPath: string): string {
  return path.relative(ARCHIVE_DIR, absPath).split(path.sep).join("/");
}

function toAbsolute(relPath: string): string {
  const abs = path.resolve(ARCHIVE_DIR, relPath);
  // archive 디렉토리 바깥으로 탈출 방지
  if (!abs.startsWith(ARCHIVE_DIR)) {
    throw new Error("Invalid archive path");
  }
  return abs;
}

export function listArchivedTodos(): ArchivedTodo[] {
  const files = walkMarkdown(ARCHIVE_DIR);
  const all: ArchivedTodo[] = [];

  for (const absPath of files) {
    try {
      const markdown = fs.readFileSync(absPath, "utf-8");
      const todos = parseTodos(markdown);
      const rel = toRelative(absPath);
      for (const t of todos) {
        all.push({ ...t, id: `arch-${rel}-${t.lineIndex}`, archiveFile: rel });
      }
    } catch {
      // 읽기 실패는 무시
    }
  }

  // 완료일 내림차순 (없으면 뒤로)
  all.sort((a, b) => {
    if (!a.doneDate && !b.doneDate) return 0;
    if (!a.doneDate) return 1;
    if (!b.doneDate) return -1;
    return b.doneDate.localeCompare(a.doneDate);
  });

  return all;
}

/** 파일 상대경로에서 "YYYY-MM" 키를 추출. 경로가 YYYY/MM/... 형태가 아니면 null */
function extractMonthKey(relPath: string): string | null {
  const parts = relPath.split("/");
  if (parts.length >= 2 && /^\d{4}$/.test(parts[0]) && /^\d{2}$/.test(parts[1])) {
    return `${parts[0]}-${parts[1]}`;
  }
  return null;
}

function monthKeyToLabel(key: string): string {
  const [year, month] = key.split("-");
  return `${year}년 ${parseInt(month, 10)}월`;
}

/** 월별 요약 (태스크 라인만 카운트, full parse 안 함) */
export function listArchiveMonthSummaries(): MonthSummary[] {
  const files = walkMarkdown(ARCHIVE_DIR);
  const counts: Record<string, number> = {};

  for (const absPath of files) {
    const rel = toRelative(absPath);
    const key = extractMonthKey(rel) ?? "undated";
    try {
      const content = fs.readFileSync(absPath, "utf-8");
      const taskLines = content.split("\n").filter((l) => /^- \[[x~! ]\] /.test(l));
      counts[key] = (counts[key] ?? 0) + taskLines.length;
    } catch {
      // 읽기 실패 무시
    }
  }

  return Object.entries(counts)
    .map(([key, count]) => ({
      key,
      label: key === "undated" ? "날짜 미지정" : monthKeyToLabel(key),
      count,
    }))
    .sort((a, b) => b.key.localeCompare(a.key)); // 최신순
}

/** 특정 월의 보관 항목만 반환 */
export function listArchivedTodosByMonth(year: string, month: string): ArchivedTodo[] {
  const monthDir = path.join(ARCHIVE_DIR, year, month);
  let files: string[];
  try {
    files = walkMarkdown(monthDir);
  } catch {
    return [];
  }
  if (files.length === 0) return [];

  const all: ArchivedTodo[] = [];
  for (const absPath of files) {
    try {
      const markdown = fs.readFileSync(absPath, "utf-8");
      const todos = parseTodos(markdown);
      const rel = toRelative(absPath);
      for (const t of todos) {
        all.push({ ...t, id: `arch-${rel}-${t.lineIndex}`, archiveFile: rel });
      }
    } catch {
      // 읽기 실패 무시
    }
  }

  all.sort((a, b) => {
    if (!a.doneDate && !b.doneDate) return 0;
    if (!a.doneDate) return 1;
    if (!b.doneDate) return -1;
    return b.doneDate.localeCompare(a.doneDate);
  });

  return all;
}

function extractTaskBlock(lines: string[], lineIndex: number): { block: string[]; end: number } | null {
  if (lineIndex < 0 || lineIndex >= lines.length) return null;
  if (!/^- \[[x~! ]\] /.test(lines[lineIndex])) return null;

  const block = [lines[lineIndex]];
  let j = lineIndex + 1;
  while (j < lines.length && /^\s{2}>\s?/.test(lines[j])) {
    block.push(lines[j]);
    j++;
  }
  return { block, end: j };
}

function ensureArchiveFile(): void {
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }
  if (!fs.existsSync(ARCHIVE_FILE_PATH)) {
    const header = [
      "# 보관함",
      "",
      "> FlowDesk에서 보관된 항목",
      "",
      "---",
      "",
      "",
    ].join("\n");
    fs.writeFileSync(ARCHIVE_FILE_PATH, header, "utf-8");
  }
}

export function archiveTodoFromTodo(lineIndex: number): boolean {
  try {
    const todoContent = fs.readFileSync(TODAY_FILE_PATH, "utf-8");
    const lines = todoContent.split("\n");

    const extracted = extractTaskBlock(lines, lineIndex);
    if (!extracted) return false;

    // TODO.md에서 제거
    const next = [...lines.slice(0, lineIndex), ...lines.slice(extracted.end)];
    fs.writeFileSync(TODAY_FILE_PATH, next.join("\n"), "utf-8");

    // archive.md 상단(헤더 다음)에 prepend
    ensureArchiveFile();
    const archiveContent = fs.readFileSync(ARCHIVE_FILE_PATH, "utf-8");
    const archiveLines = archiveContent.split("\n");

    // `---` 구분자 다음 빈 줄 뒤에 삽입
    let insertAt = archiveLines.length;
    const sepIdx = archiveLines.findIndex((l) => /^---\s*$/.test(l));
    if (sepIdx !== -1) {
      insertAt = sepIdx + 1;
      while (insertAt < archiveLines.length && archiveLines[insertAt].trim() === "") insertAt++;
    }

    archiveLines.splice(insertAt, 0, ...extracted.block);
    fs.writeFileSync(ARCHIVE_FILE_PATH, archiveLines.join("\n"), "utf-8");
    return true;
  } catch {
    return false;
  }
}

export function restoreArchivedTodo(archiveFile: string, lineIndex: number): boolean {
  try {
    const absPath = toAbsolute(archiveFile);
    const content = fs.readFileSync(absPath, "utf-8");
    const lines = content.split("\n");

    const extracted = extractTaskBlock(lines, lineIndex);
    if (!extracted) return false;

    // archive 파일에서 제거
    const next = [...lines.slice(0, lineIndex), ...lines.slice(extracted.end)];
    fs.writeFileSync(absPath, next.join("\n"), "utf-8");

    // TODO.md의 `## 완료` 섹션 상단에 삽입
    const todoContent = fs.readFileSync(TODAY_FILE_PATH, "utf-8");
    const todoLines = todoContent.split("\n");

    let completeIdx = todoLines.findIndex((l) => /^##\s+완료\s*$/.test(l));
    if (completeIdx === -1) {
      // 완료 섹션이 없으면 파일 끝에 추가
      todoLines.push("", "## 완료", "", ...extracted.block, "");
    } else {
      // 헤더 다음 빈 줄 건너뛰고 삽입
      let insertAt = completeIdx + 1;
      while (insertAt < todoLines.length && todoLines[insertAt].trim() === "") insertAt++;
      todoLines.splice(insertAt, 0, ...extracted.block);
    }

    fs.writeFileSync(TODAY_FILE_PATH, todoLines.join("\n"), "utf-8");
    return true;
  } catch {
    return false;
  }
}

export function deleteArchivedTodo(archiveFile: string, lineIndex: number): boolean {
  try {
    const absPath = toAbsolute(archiveFile);
    const content = fs.readFileSync(absPath, "utf-8");
    const lines = content.split("\n");

    const extracted = extractTaskBlock(lines, lineIndex);
    if (!extracted) return false;

    const next = [...lines.slice(0, lineIndex), ...lines.slice(extracted.end)];
    fs.writeFileSync(absPath, next.join("\n"), "utf-8");
    return true;
  } catch {
    return false;
  }
}

export type { Todo };
