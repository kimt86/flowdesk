import fs from "fs";
import { TodayTask, TodayFile, DocRef } from "@/lib/types";
import { TODAY_FILE_PATH } from "@/lib/paths";
import { safeWriteFile } from "@/lib/safe-write";

export { TODAY_FILE_PATH };

const PRIORITY_EMOJI: Record<string, string> = {
  high: "🔴",
  medium: "🟡",
  low: "🟢",
};

function parsePriority(content: string): "high" | "medium" | "low" {
  if (content.includes("🔴")) return "high";
  if (content.includes("🟡")) return "medium";
  return "low";
}

function parseDocRefs(raw: string): DocRef[] {
  const refs: DocRef[] = [];
  const segments = raw.split("|").map((s) => s.trim());

  for (const seg of segments) {
    const arrowMatch = seg.match(/^→\s*`?([^`]+?)`?\s*$/);
    if (arrowMatch) {
      refs.push({ path: arrowMatch[1].trim() });
      continue;
    }
    const issuePathMatch = seg.match(/^(ISS-\d+)\s*@\s*(.+?)\s*$/);
    if (issuePathMatch) {
      refs.push({ issueId: issuePathMatch[1], path: issuePathMatch[2].trim() });
    }
  }

  return refs;
}

type ParsedTaskRaw = {
  priority: "high" | "medium" | "low";
  content: string;
  category: string;
  dueDate: string | null;
  tags: string[];
  docRefs: DocRef[];
};

function parseTaskRaw(rawContent: string): ParsedTaskRaw {
  const priority = parsePriority(rawContent);

  // 분리: 본문 — 메타
  let contentPart = rawContent;
  let metaPart = "";
  const dashIdx = rawContent.indexOf("—");
  if (dashIdx >= 0) {
    contentPart = rawContent.slice(0, dashIdx);
    metaPart = rawContent.slice(dashIdx + 1);
  }

  const content = contentPart.replace(/🔴|🟡|🟢/g, "").trim();

  let category = "@기타";
  let dueDate: string | null = null;
  const tags: string[] = [];
  const docRefs: DocRef[] = [];

  if (metaPart) {
    const segments = metaPart.split("|").map((s) => s.trim()).filter(Boolean);
    for (const seg of segments) {
      const catMatch = seg.match(/^@([\w가-힣]+)$/);
      if (catMatch) {
        category = `@${catMatch[1]}`;
        continue;
      }
      const dueMatch = seg.match(/^마감:\s*(.+)$/);
      if (dueMatch) {
        dueDate = dueMatch[1].trim();
        continue;
      }
      const arrowMatch = seg.match(/^→\s*`?([^`]+?)`?$/);
      if (arrowMatch) {
        docRefs.push({ path: arrowMatch[1].trim() });
        continue;
      }
      const issueMatch = seg.match(/^(ISS-\d+)\s*@\s*(.+)$/);
      if (issueMatch) {
        docRefs.push({ issueId: issueMatch[1], path: issueMatch[2].trim() });
        continue;
      }
      const tagMatches = seg.match(/#[\w가-힣]+/g);
      if (tagMatches) {
        tags.push(...tagMatches.map((t) => t.slice(1)));
      }
    }
  }

  return { priority, content, category, dueDate, tags, docRefs };
}

const WEEKDAY_KR = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

export function parseTodayFile(content: string): TodayFile {
  const lines = content.split("\n");

  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dayLabel = WEEKDAY_KR[now.getDay()];

  const weekInfo = "";

  const tasks: TodayTask[] = [];
  const skipLines = new Set<number>();
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    if (skipLines.has(i)) continue;
    if (lines[i].trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = lines[i].match(/^- \[([x~! ])\] (.+)$/);
    if (!match) continue;

    const done = match[1] === "x";
    const parsed = parseTaskRaw(match[2]);

    const memoLines: string[] = [];
    let j = i + 1;
    while (j < lines.length) {
      const memoMatch = lines[j].match(/^\s{2}>\s?(.*)$/);
      if (!memoMatch) break;
      const memoRaw = memoMatch[1].trim();

      const memoDocRefs = parseDocRefs(memoRaw);
      parsed.docRefs.push(...memoDocRefs);

      const memoClean = memoRaw
        .split("|")
        .map((s) => s.trim())
        .filter(
          (s) =>
            !s.match(/^→\s*`?[^`]+`?\s*$/) &&
            !s.match(/^(ISS-\d+)\s*@\s*.+$/)
        )
        .join(" | ")
        .trim();

      if (memoClean) memoLines.push(memoClean);
      skipLines.add(j);
      j++;
    }

    if (!parsed.tags.includes("today")) continue;

    const memo = memoLines.length > 0 ? memoLines.join("\n") : null;

    tasks.push({
      lineIndex: i,
      done,
      priority: parsed.priority,
      content: parsed.content,
      category: parsed.category,
      dueDate: parsed.dueDate,
      tags: parsed.tags,
      memo,
      docRefs: parsed.docRefs,
    });
  }

  return { date, dayLabel, weekInfo, tasks, raw: content };
}

export function readToday(): TodayFile | null {
  try {
    const content = fs.readFileSync(TODAY_FILE_PATH, "utf-8");
    return parseTodayFile(content);
  } catch {
    return null;
  }
}

export type TodayTaskFields = {
  done?: boolean;
  priority?: "high" | "medium" | "low";
  content?: string;
  category?: string;
  dueDate?: string | null;
  tags?: string[];
  memo?: string | null;
};

function buildTaskLine(fields: {
  done: boolean;
  priority: "high" | "medium" | "low";
  content: string;
  category: string;
  dueDate: string | null;
  tags: string[];
}): string {
  const checkbox = fields.done ? "x" : " ";
  const emoji = PRIORITY_EMOJI[fields.priority] ?? "";
  const category = fields.category && !fields.category.startsWith("@")
    ? `@${fields.category}`
    : fields.category;

  const segments: string[] = [];
  if (category) segments.push(category);
  if (fields.dueDate) segments.push(`마감: ${fields.dueDate}`);
  if (fields.tags.length > 0) segments.push(fields.tags.map((t) => `#${t}`).join(" "));

  const meta = segments.length > 0 ? ` — ${segments.join(" | ")}` : "";
  return `- [${checkbox}] ${emoji} ${fields.content}${meta}`;
}

function findMemoRange(lines: string[], taskLineIndex: number): { start: number; end: number } {
  const start = taskLineIndex + 1;
  let end = start;
  while (end < lines.length && /^\s{2}>\s?/.test(lines[end])) end++;
  return { start, end };
}

export function updateTodayTask(lineIndex: number, fields: TodayTaskFields): boolean {
  try {
    const content = fs.readFileSync(TODAY_FILE_PATH, "utf-8");
    const lines = content.split("\n");

    if (lineIndex < 0 || lineIndex >= lines.length) return false;
    const line = lines[lineIndex];
    // 파서(parseTodayFile)와 동일하게 4가지 체크박스 상태 모두 인식: x 완료 / 공백 미완료 / ~ 진행중 / ! 보류
    const match = line.match(/^- \[([x~! ])\] (.+)$/);
    if (!match) return false;

    const file = parseTodayFile(content);
    const existing = file.tasks.find((t) => t.lineIndex === lineIndex);
    if (!existing) return false;

    const merged = {
      done: fields.done ?? existing.done,
      priority: fields.priority ?? existing.priority,
      content: fields.content ?? existing.content,
      category: fields.category ?? existing.category,
      dueDate: fields.dueDate !== undefined ? fields.dueDate : existing.dueDate,
      tags: fields.tags ?? existing.tags,
    };

    const newLine = buildTaskLine(merged);
    const { end } = findMemoRange(lines, lineIndex);

    const newMemo = fields.memo !== undefined ? fields.memo : existing.memo;
    const memoLines = newMemo
      ? newMemo.split("\n").map((m) => `  > ${m}`)
      : [];

    const next = [...lines.slice(0, lineIndex), newLine, ...memoLines, ...lines.slice(end)];
    safeWriteFile(TODAY_FILE_PATH, next.join("\n"), "utf-8");
    return true;
  } catch {
    return false;
  }
}

export function addTodayTask(fields: {
  content: string;
  priority: "high" | "medium" | "low";
  category: string;
  dueDate?: string | null;
  tags?: string[];
  memo?: string | null;
}): boolean {
  try {
    const content = fs.readFileSync(TODAY_FILE_PATH, "utf-8");
    const lines = content.split("\n");

    // 중복 방지: 이미 같은 내용의 오늘(#today) 항목이 있으면 추가 생략(성공 처리).
    // 파서(parseTodayFile) 기준으로 판정 → 읽기/쓰기 일관.
    const trimmedContent = fields.content.trim();
    const parsed = parseTodayFile(content);
    if (parsed.tasks.some((t) => t.content.trim() === trimmedContent)) return true;

    const newLine = buildTaskLine({
      done: false,
      priority: fields.priority,
      content: fields.content,
      category: fields.category,
      dueDate: fields.dueDate ?? null,
      tags: fields.tags ?? [],
    });
    const memoLines = fields.memo
      ? fields.memo.split("\n").map((m) => `  > ${m}`)
      : [];

    // 1) "오늘 할 일" 헤더(h1~h6, 이모지/날짜 접두 허용)를 찾으면 그 섹션 안에 삽입.
    const sectionStart = lines.findIndex((l) =>
      /^#{1,6}\s+.*오늘\s*할\s*일/.test(l),
    );
    if (sectionStart !== -1) {
      let sectionEnd = lines.length;
      for (let i = sectionStart + 1; i < lines.length; i++) {
        if (/^#{1,6}\s+/.test(lines[i]) || /^---\s*$/.test(lines[i])) {
          sectionEnd = i;
          break;
        }
      }
      // "### 메모" 등 하위 섹션 앞, 아니면 섹션 끝에 삽입
      let insertAt = sectionEnd;
      for (let i = sectionStart + 1; i < sectionEnd; i++) {
        if (/^###\s+/.test(lines[i])) {
          insertAt = i;
          break;
        }
      }
      while (insertAt > sectionStart + 1 && lines[insertAt - 1].trim() === "") insertAt--;
      lines.splice(insertAt, 0, newLine, ...memoLines);
      safeWriteFile(TODAY_FILE_PATH, lines.join("\n"), "utf-8");
      return true;
    }

    // 2) 헤더 형식이 달라도, 기존 #today 항목 마지막 블록(메모 포함) 뒤에 삽입 — 읽기와 동일 기준.
    if (parsed.tasks.length > 0) {
      const last = parsed.tasks[parsed.tasks.length - 1];
      let insertAt = last.lineIndex + 1;
      while (insertAt < lines.length && /^\s{2}>\s?/.test(lines[insertAt])) insertAt++;
      lines.splice(insertAt, 0, newLine, ...memoLines);
      safeWriteFile(TODAY_FILE_PATH, lines.join("\n"), "utf-8");
      return true;
    }

    // 3) 항목도 헤더도 없으면 파일 끝에 "## 오늘 할 일" 섹션을 만들어 추가.
    const gap = lines.length > 0 && lines[lines.length - 1].trim() !== "" ? [""] : [];
    lines.push(...gap, "## 오늘 할 일", newLine, ...memoLines, "");
    safeWriteFile(TODAY_FILE_PATH, lines.join("\n"), "utf-8");
    return true;
  } catch {
    return false;
  }
}

export function deleteTodayTask(lineIndex: number): boolean {
  try {
    const content = fs.readFileSync(TODAY_FILE_PATH, "utf-8");
    const lines = content.split("\n");

    if (lineIndex < 0 || lineIndex >= lines.length) return false;
    if (!/^- \[[x~! ]\] /.test(lines[lineIndex])) return false;

    const { end } = findMemoRange(lines, lineIndex);
    const next = [...lines.slice(0, lineIndex), ...lines.slice(end)];
    safeWriteFile(TODAY_FILE_PATH, next.join("\n"), "utf-8");
    return true;
  } catch {
    return false;
  }
}

export function toggleTodayTask(lineIndex: number): boolean {
  try {
    const content = fs.readFileSync(TODAY_FILE_PATH, "utf-8");
    const lines = content.split("\n");

    if (lineIndex < 0 || lineIndex >= lines.length) return false;

    const line = lines[lineIndex];
    // 4가지 체크박스 상태 모두 인식. x면 미완료(공백)로, 그 외(공백/~/!)는 완료(x)로 토글.
    const match = line.match(/^- \[([x~! ])\]/);
    if (!match) return false;

    if (match[1] === "x") {
      lines[lineIndex] = line.replace(/^(- \[)x(\])/, "$1 $2");
    } else {
      lines[lineIndex] = line.replace(/^(- \[)[ ~!](\])/, "$1x$2");
    }

    safeWriteFile(TODAY_FILE_PATH, lines.join("\n"), "utf-8");
    return true;
  } catch {
    return false;
  }
}
