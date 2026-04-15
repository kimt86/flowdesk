import fs from "fs";
import { TodayTask, TodayFile, DocRef } from "@/lib/types";
import { TODAY_FILE_PATH } from "@/lib/paths";

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
    const match = line.match(/^- \[([x ])\] (.+)$/);
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
    fs.writeFileSync(TODAY_FILE_PATH, next.join("\n"), "utf-8");
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

    let sectionStart = -1;
    let sectionEnd = lines.length;
    for (let i = 0; i < lines.length; i++) {
      if (/^##\s+오늘 할 일/.test(lines[i])) {
        sectionStart = i;
        break;
      }
    }
    if (sectionStart === -1) return false;

    for (let i = sectionStart + 1; i < lines.length; i++) {
      if (/^##\s+/.test(lines[i]) || /^---\s*$/.test(lines[i])) {
        sectionEnd = i;
        break;
      }
    }

    // Insert before "### 메모" subsection if present, else at section end
    let insertAt = sectionEnd;
    for (let i = sectionStart + 1; i < sectionEnd; i++) {
      if (/^###\s+/.test(lines[i])) {
        insertAt = i;
        break;
      }
    }
    while (insertAt > sectionStart + 1 && lines[insertAt - 1].trim() === "") insertAt--;

    // Skip if duplicate (same content already in today section)
    const trimmedContent = fields.content.trim();
    for (let i = sectionStart + 1; i < sectionEnd; i++) {
      const m = lines[i].match(/^- \[[x ]\] (.+)$/);
      if (m) {
        const existing = parseTaskRaw(m[1]).content.trim();
        if (existing === trimmedContent) return true;
      }
    }

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

    lines.splice(insertAt, 0, newLine, ...memoLines);
    fs.writeFileSync(TODAY_FILE_PATH, lines.join("\n"), "utf-8");
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
    if (!/^- \[[x ]\] /.test(lines[lineIndex])) return false;

    const { end } = findMemoRange(lines, lineIndex);
    const next = [...lines.slice(0, lineIndex), ...lines.slice(end)];
    fs.writeFileSync(TODAY_FILE_PATH, next.join("\n"), "utf-8");
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
    const match = line.match(/^- \[([x ])\]/);
    if (!match) return false;

    if (match[1] === "x") {
      lines[lineIndex] = line.replace(/^(- \[)x(\])/, "$1 $2");
    } else {
      lines[lineIndex] = line.replace(/^(- \[) (\])/, "$1x$2");
    }

    fs.writeFileSync(TODAY_FILE_PATH, lines.join("\n"), "utf-8");
    return true;
  } catch {
    return false;
  }
}
