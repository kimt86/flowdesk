export type TodoStatus = "todo" | "in-progress" | "blocked" | "done";
export type TodoPriority = "high" | "medium" | "low";

/** 할 일 아이템에 연결된 문서 참조 */
export interface DocRef {
  issueId?: string; // 예: "ISS-01"
  path: string;     // 예: "dev-docs/wp-ai-service-2/README.md"
}

export interface Todo {
  id: string;
  content: string;
  status: TodoStatus;
  priority: TodoPriority;
  category: string;
  dueDate: string | null;
  doneDate: string | null;
  docRefs: DocRef[];
  rawLine: string;
  lineIndex: number;
}

export interface WorklogTask {
  title: string;
  priority: "high" | "medium" | "low";
  status: "completed" | "in-progress" | "pending";
  note?: string;
}

export interface WorklogEntry {
  weekKey: string;
  filePath: string;
  summary: string;
  tasks: WorklogTask[];
  completedTasks: string[];
  blockers: string[];
  nextWeekPlan: string[];
}

export interface StatusStats {
  total: number;
  todo: number;
  inProgress: number;
  blocked: number;
  done: number;
  doneThisWeek: number;
  highPriority: number;
  dueSoon: number;
}
