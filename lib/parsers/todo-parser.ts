import fs from "fs";
import { Todo, TodoStatus, TodoPriority, DocRef } from "@/lib/types";
import { TODO_FILE_PATH } from "@/lib/paths";

export { TODO_FILE_PATH };

function parseStatus(checkbox: string): TodoStatus {
  switch (checkbox) {
    case "x": return "done";
    case "~": return "in-progress";
    case "!": return "blocked";
    default: return "todo";
  }
}

function parsePriority(content: string): TodoPriority {
  if (content.includes("🔴")) return "high";
  if (content.includes("🟡")) return "medium";
  return "low";
}

function parseCategory(content: string): string {
  const match = content.match(/@([\w가-힣]+)/);
  return match ? `@${match[1]}` : "@기타";
}

function parseDueDate(content: string): string | null {
  const dueMatch = content.match(/마감:\s*(\d{4}-\d{2}-\d{2})/);
  if (dueMatch) return dueMatch[1];
  return null;
}

function parseDoneDate(content: string): string | null {
  const doneMatch = content.match(/완료:\s*(\d{4}-\d{2}-\d{2})/);
  if (doneMatch) return doneMatch[1];
  return null;
}

function parseTags(raw: string): string[] {
  const matches = raw.match(/#[\w가-힣]+/g);
  if (!matches) return [];
  return matches.map((t) => t.slice(1)); // strip '#' prefix
}

function cleanContent(raw: string): string {
  return raw
    .replace(/🔴|🟡|🟢/g, "")
    .replace(/@[\w가-힣]+/, "")
    .replace(/#[\w가-힣]+/g, "")
    .replace(/\|.*$/, "")
    .replace(/—\s*$/, "")
    .trim();
}

/**
 * `| → 경로` 또는 `| ISS-XX @ 경로` 형식의 문서 참조를 추출합니다.
 * - `→ \`path\`` / `→ path` : 경로만
 * - `ISS-XX @ path` : 이슈 ID + 경로
 */
function parseDocRefs(raw: string): DocRef[] {
  const refs: DocRef[] = [];
  const segments = raw.split("|").map((s) => s.trim());

  for (const seg of segments) {
    // 형식 1: → `docs/...` 또는 → docs/...
    const arrowMatch = seg.match(/^→\s*`?([^`]+?)`?\s*$/);
    if (arrowMatch) {
      refs.push({ path: arrowMatch[1].trim() });
      continue;
    }
    // 형식 2: ISS-XX @ docs/...
    const issuePathMatch = seg.match(/^(ISS-\d+)\s*@\s*(.+?)\s*$/);
    if (issuePathMatch) {
      refs.push({ issueId: issuePathMatch[1], path: issuePathMatch[2].trim() });
    }
  }

  return refs;
}

export function parseTodos(markdown: string): Todo[] {
  const lines = markdown.split("\n");
  const todos: Todo[] = [];
  let idCounter = 0;
  let inCodeBlock = false;
  const skipLines = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (skipLines.has(i)) continue;

    // 코드블록(```) 진입/탈출 추적 — 내부 예시 라인은 파싱 대상에서 제외
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^- \[([x~! ])\] (.+)$/);
    if (!match) continue;

    const [, checkbox, rawContent] = match;
    const status = parseStatus(checkbox);
    const priority = parsePriority(rawContent);
    const category = parseCategory(rawContent);
    const dueDate = parseDueDate(rawContent);
    const doneDate = parseDoneDate(rawContent);
    const content = cleanContent(rawContent);
    const docRefs = parseDocRefs(rawContent);
    const tags = parseTags(rawContent);

    // Peek at next line for memo (and extract doc refs from memo line)
    let memo: string | null = null;
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const memoMatch = nextLine.match(/^\s{2}>\s?(.*)$/);
      if (memoMatch) {
        const memoRaw = memoMatch[1].trim();
        // Extract doc refs from memo line and merge with todo's docRefs
        const memoDocRefs = parseDocRefs(memoRaw);
        docRefs.push(...memoDocRefs);
        // Clean doc ref patterns from memo text
        const memoClean = memoRaw
          .split("|")
          .map((s) => s.trim())
          .filter((s) => !s.match(/^→\s*`?[^`]+`?\s*$/) && !s.match(/^(ISS-\d+)\s*@\s*.+$/))
          .join(" | ")
          .trim();
        memo = memoClean || null;
        skipLines.add(i + 1);
      }
    }

    todos.push({
      id: `todo-${i}-${idCounter++}`,
      content,
      status,
      priority,
      category,
      dueDate,
      doneDate,
      docRefs,
      tags,
      memo,
      rawLine: line,
      lineIndex: i,
    });
  }

  return todos;
}

export function readTodos(): Todo[] {
  try {
    const markdown = fs.readFileSync(TODO_FILE_PATH, "utf-8");
    return parseTodos(markdown);
  } catch {
    return [];
  }
}

export function updateTodoStatus(
  lineIndex: number,
  newStatus: TodoStatus
): boolean {
  try {
    const content = fs.readFileSync(TODO_FILE_PATH, "utf-8");
    const lines = content.split("\n");

    if (lineIndex < 0 || lineIndex >= lines.length) return false;

    const line = lines[lineIndex];
    const statusChar = { todo: " ", "in-progress": "~", blocked: "!", done: "x" }[newStatus];

    lines[lineIndex] = line.replace(/^(- \[)[x~! ](\])/, `$1${statusChar}$2`);

    // done 시 완료 날짜 추가 (없으면)
    if (newStatus === "done" && !lines[lineIndex].includes("완료:")) {
      const today = new Date().toISOString().split("T")[0];
      lines[lineIndex] = lines[lineIndex].replace(/ — @/, ` | 완료: ${today} — @`);
    }

    fs.writeFileSync(TODO_FILE_PATH, lines.join("\n"), "utf-8");
    return true;
  } catch {
    return false;
  }
}

/** Todo 객체를 마크다운 라인(들)으로 재조립. 메모/docRef가 있으면 두 번째 줄 포함 */
function buildTodoLine(todo: Todo): string {
  const statusChar = { todo: " ", "in-progress": "~", blocked: "!", done: "x" }[todo.status];
  const priorityEmoji = { high: "🔴", medium: "🟡", low: "🟢" }[todo.priority];
  const cat = todo.category.startsWith("@") ? todo.category : `@${todo.category}`;
  let line = `- [${statusChar}] ${priorityEmoji} ${todo.content} — ${cat}`;
  if (todo.dueDate) line += ` | 마감: ${todo.dueDate}`;
  if (todo.doneDate) line += ` | 완료: ${todo.doneDate}`;
  if (todo.tags && todo.tags.length > 0) {
    line += ` | ${todo.tags.map((t) => `#${t}`).join(" ")}`;
  }
  // docRefs와 memo는 메모 줄(  > ...)에 함께 기록
  const memoParts: string[] = [];
  if (todo.memo) memoParts.push(todo.memo);
  for (const ref of todo.docRefs ?? []) {
    memoParts.push(ref.issueId ? `${ref.issueId} @ ${ref.path}` : `→ \`${ref.path}\``);
  }
  if (memoParts.length > 0) {
    line += `\n  > ${memoParts.join(" | ")}`;
  }
  return line;
}

export function updateTodo(
  lineIndex: number,
  fields: Partial<Pick<Todo, "content" | "priority" | "category" | "dueDate" | "status" | "tags" | "memo">>
): boolean {
  try {
    const markdown = fs.readFileSync(TODO_FILE_PATH, "utf-8");
    const lines = markdown.split("\n");
    if (lineIndex < 0 || lineIndex >= lines.length) return false;

    // 기존 행 파싱
    const existing = parseTodos(markdown).find((t) => t.lineIndex === lineIndex);
    if (!existing) return false;

    const merged: Todo = { ...existing, ...fields };

    // done 전환 시 완료 날짜 자동 추가
    if (fields.status === "done" && !merged.doneDate) {
      merged.doneDate = new Date().toISOString().split("T")[0];
    }
    // done 해제 시 완료 날짜 제거
    if (fields.status && fields.status !== "done") {
      merged.doneDate = null;
    }

    // Check if existing todo had a memo line following it
    const hadMemoLine =
      lineIndex + 1 < lines.length &&
      /^\s{2}>\s?(.*)$/.test(lines[lineIndex + 1]);

    // Build new content (may include memo as second line via \n)
    const built = buildTodoLine(merged);
    const builtLines = built.split("\n");

    if (hadMemoLine) {
      // Replace the todo line + old memo line
      lines.splice(lineIndex, 2, ...builtLines);
    } else {
      // Replace only the todo line, insert memo line if needed
      lines.splice(lineIndex, 1, ...builtLines);
    }

    fs.writeFileSync(TODO_FILE_PATH, lines.join("\n"), "utf-8");
    return true;
  } catch {
    return false;
  }
}

export function deleteTodo(lineIndex: number): boolean {
  try {
    const markdown = fs.readFileSync(TODO_FILE_PATH, "utf-8");
    const lines = markdown.split("\n");
    if (lineIndex < 0 || lineIndex >= lines.length) return false;

    // Check if the next line is a memo line — delete it too
    const hasMemoLine =
      lineIndex + 1 < lines.length &&
      /^\s{2}>\s?(.*)$/.test(lines[lineIndex + 1]);

    lines.splice(lineIndex, hasMemoLine ? 2 : 1);
    fs.writeFileSync(TODO_FILE_PATH, lines.join("\n"), "utf-8");
    return true;
  } catch {
    return false;
  }
}

export function addTodo(
  content: string,
  priority: TodoPriority,
  category: string,
  dueDate?: string,
  tags?: string[],
  memo?: string
): boolean {
  try {
    const fileContent = fs.readFileSync(TODO_FILE_PATH, "utf-8");
    const lines = fileContent.split("\n");

    const priorityEmoji = { high: "🔴", medium: "🟡", low: "🟢" }[priority];
    const cat = category.startsWith("@") ? category : `@${category}`;
    const duePart = dueDate ? ` | 마감: ${dueDate}` : "";
    const tagsPart = tags && tags.length > 0 ? ` | ${tags.map((t) => `#${t}`).join(" ")}` : "";
    const newLine = `- [ ] ${priorityEmoji} ${content} — ${cat}${duePart}${tagsPart}`;
    const newLines = memo ? [newLine, `  > ${memo}`] : [newLine];

    // "## 할 일" 섹션 상단에 삽입 (없으면 파일 끝에 추가)
    const todoSectionIdx = lines.findIndex((l) => l.trim() === "## 할 일");
    if (todoSectionIdx !== -1) {
      let insertAt = todoSectionIdx + 1;
      while (insertAt < lines.length && lines[insertAt].trim() === "") insertAt++;
      lines.splice(insertAt, 0, ...newLines);
    } else {
      lines.push(...newLines);
    }

    // 마지막 업데이트 날짜 갱신
    const today = new Date().toISOString().split("T")[0];
    const updateIdx = lines.findIndex((l) => l.startsWith("> 마지막 업데이트:"));
    if (updateIdx !== -1) {
      lines[updateIdx] = `> 마지막 업데이트: ${today}`;
    }

    fs.writeFileSync(TODO_FILE_PATH, lines.join("\n"), "utf-8");
    return true;
  } catch {
    return false;
  }
}
