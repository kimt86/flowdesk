import { createClient } from "@libsql/client";
import path from "path";

// 로컬 SQLite 파일 경로
const DB_PATH = path.resolve(process.cwd(), "flowdesk.db");

let _client: ReturnType<typeof createClient> | null = null;

export function getDb() {
  if (!_client) {
    _client = createClient({
      url: `file:${DB_PATH}`,
    });
  }
  return _client;
}

export async function initDb() {
  const db = getDb();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      category TEXT NOT NULL DEFAULT '@기타',
      due_date TEXT,
      done_date TEXT,
      doc_refs TEXT NOT NULL DEFAULT '[]',
      line_index INTEGER NOT NULL DEFAULT 0,
      raw_line TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 기존 DB에 doc_refs 컬럼이 없을 경우 마이그레이션
  try {
    await db.execute(`ALTER TABLE todos ADD COLUMN doc_refs TEXT NOT NULL DEFAULT '[]'`);
  } catch {
    // 이미 존재하면 무시
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

export async function upsertTodo(todo: {
  id: string;
  content: string;
  status: string;
  priority: string;
  category: string;
  due_date: string | null;
  done_date: string | null;
  doc_refs: string;
  line_index: number;
  raw_line: string;
}) {
  const db = getDb();
  await db.execute({
    sql: `
      INSERT INTO todos (id, content, status, priority, category, due_date, done_date, doc_refs, line_index, raw_line, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        content = excluded.content,
        status = excluded.status,
        priority = excluded.priority,
        category = excluded.category,
        due_date = excluded.due_date,
        done_date = excluded.done_date,
        doc_refs = excluded.doc_refs,
        line_index = excluded.line_index,
        raw_line = excluded.raw_line,
        updated_at = datetime('now')
    `,
    args: [
      todo.id,
      todo.content,
      todo.status,
      todo.priority,
      todo.category,
      todo.due_date,
      todo.done_date,
      todo.doc_refs,
      todo.line_index,
      todo.raw_line,
    ],
  });
}

export async function getAllTodosFromDb() {
  const db = getDb();
  const result = await db.execute("SELECT * FROM todos ORDER BY line_index ASC");
  return result.rows;
}

export async function clearTodos() {
  const db = getDb();
  await db.execute("DELETE FROM todos");
}

export async function getSyncMeta(key: string): Promise<string | null> {
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT value FROM sync_meta WHERE key = ?",
    args: [key],
  });
  return result.rows[0]?.value as string ?? null;
}

export async function setSyncMeta(key: string, value: string) {
  const db = getDb();
  await db.execute({
    sql: `
      INSERT INTO sync_meta (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    args: [key, value],
  });
}
