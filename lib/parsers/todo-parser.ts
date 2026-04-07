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

function cleanContent(raw: string): string {
  return raw
    .replace(/🔴|🟡|🟢/g, "")
    .replace(/@[\w가-힣]+/, "")
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
    // 형식 1: → `dev-docs/...` 또는 → dev-docs/...
    const arrowMatch = seg.match(/^→\s*`?([^`]+?)`?\s*$/);
    if (arrowMatch) {
      refs.push({ path: arrowMatch[1].trim() });
      continue;
    }
    // 형식 2: ISS-XX @ dev-docs/...
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

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

    todos.push({
      id: `todo-${i}-${idCounter++}`,
      content,
      status,
      priority,
      category,
      dueDate,
      doneDate,
      docRefs,
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

/** Todo 객체를 마크다운 한 줄로 재조립 */
function buildTodoLine(todo: Todo): string {
  const statusChar = { todo: " ", "in-progress": "~", blocked: "!", done: "x" }[todo.status];
  const priorityEmoji = { high: "🔴", medium: "🟡", low: "🟢" }[todo.priority];
  const cat = todo.category.startsWith("@") ? todo.category : `@${todo.category}`;
  let line = `- [${statusChar}] ${priorityEmoji} ${todo.content} — ${cat}`;
  if (todo.dueDate) line += ` | 마감: ${todo.dueDate}`;
  if (todo.doneDate) line += ` | 완료: ${todo.doneDate}`;
  for (const ref of todo.docRefs ?? []) {
    line += ref.issueId ? ` | ${ref.issueId} @ ${ref.path}` : ` | → ${ref.path}`;
  }
  return line;
}

export function updateTodo(
  lineIndex: number,
  fields: Partial<Pick<Todo, "content" | "priority" | "category" | "dueDate" | "status">>
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

    lines[lineIndex] = buildTodoLine(merged);
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
    lines.splice(lineIndex, 1);
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
  dueDate?: string
): boolean {
  try {
    const fileContent = fs.readFileSync(TODO_FILE_PATH, "utf-8");
    const lines = fileContent.split("\n");

    const priorityEmoji = { high: "🔴", medium: "🟡", low: "🟢" }[priority];
    const cat = category.startsWith("@") ? category : `@${category}`;
    const duePart = dueDate ? ` | 마감: ${dueDate}` : "";
    const newLine = `- [ ] ${priorityEmoji} ${content} — ${cat}${duePart}`;

    // 우선순위에 해당하는 섹션 아래에 삽입
    const prioritySectionMap = { high: "🔴 긴급", medium: "🟡 보통", low: "🟢 낮음" };
    const sectionHeader = `### ${prioritySectionMap[priority]}`;
    const sectionIdx = lines.findIndex((l) => l.includes(sectionHeader));

    if (sectionIdx !== -1) {
      // 섹션 찾은 경우 — 섹션 다음 줄에 삽입 (빈 줄 건너뜀)
      let insertAt = sectionIdx + 1;
      while (insertAt < lines.length && lines[insertAt].trim() === "") insertAt++;

      // "_긴급 항목이 없습니다._" 같은 빈 메시지 제거
      if (lines[insertAt]?.startsWith("_") && lines[insertAt]?.endsWith("_")) {
        lines.splice(insertAt, 1);
      }
      lines.splice(insertAt, 0, newLine);
    } else {
      // 섹션 없으면 ## 할 일 섹션 바로 아래에
      const todoSectionIdx = lines.findIndex((l) => l.trim() === "## 할 일");
      if (todoSectionIdx !== -1) {
        lines.splice(todoSectionIdx + 2, 0, newLine);
      } else {
        lines.push(newLine);
      }
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
