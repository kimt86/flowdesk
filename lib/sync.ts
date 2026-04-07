import { readTodos, TODO_FILE_PATH } from "@/lib/parsers/todo-parser";
import { upsertTodo, clearTodos, initDb } from "@/lib/db/client";

export async function syncTodosFromFile() {
  await initDb();
  const todos = readTodos();

  await clearTodos();
  for (const todo of todos) {
    await upsertTodo({
      id: todo.id,
      content: todo.content,
      status: todo.status,
      priority: todo.priority,
      category: todo.category,
      due_date: todo.dueDate,
      done_date: todo.doneDate,
      doc_refs: JSON.stringify(todo.docRefs),
      line_index: todo.lineIndex,
      raw_line: todo.rawLine,
    });
  }

  return todos;
}

// 서버 사이드에서만 실행되는 watcher — Next.js 개발 서버에서 한 번만 초기화
let watcherStarted = false;

export async function startFileWatcher() {
  if (watcherStarted) return;
  watcherStarted = true;

  try {
    const chokidar = await import("chokidar");
    const watcher = chokidar.watch(TODO_FILE_PATH, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
    });

    watcher.on("change", async () => {
      console.log("[FlowDesk] todo.md 변경 감지 → DB 동기화 중...");
      await syncTodosFromFile();
      console.log("[FlowDesk] 동기화 완료");
    });

    console.log("[FlowDesk] 파일 감시 시작:", TODO_FILE_PATH);
  } catch (err) {
    console.error("[FlowDesk] 파일 감시 시작 실패:", err);
  }
}
