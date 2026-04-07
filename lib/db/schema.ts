// libsql (Turso) 기반 로컬 SQLite 스키마
// drizzle-orm과 @libsql/client 사용

export interface TodoRow {
  id: string;
  content: string;
  status: string;
  priority: string;
  category: string;
  due_date: string | null;
  done_date: string | null;
  doc_refs: string; // JSON 직렬화된 DocRef[]
  line_index: number;
  raw_line: string;
  created_at: string;
  updated_at: string;
}
