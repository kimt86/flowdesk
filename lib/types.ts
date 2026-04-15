export type TodoStatus = "todo" | "in-progress" | "blocked" | "done";
export type TodoPriority = "high" | "medium" | "low";

/** 할 일 아이템에 연결된 문서 참조 */
export interface DocRef {
  issueId?: string; // 예: "ISS-01"
  path: string;     // 예: "docs/wp-ai-service-2/README.md"
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
  tags: string[];
  memo: string | null;
  rawLine: string;
  lineIndex: number;
}

export interface ArchivedTodo extends Todo {
  archiveFile: string; // archive 루트 기준 상대 경로 (예: "archive.md", "2026/04/week-15.md")
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

export interface TodayTask {
  lineIndex: number;
  done: boolean;
  priority: "high" | "medium" | "low";
  content: string;
  category: string;
  dueDate: string | null;
  tags: string[];
  memo: string | null;
  docRefs: DocRef[];
}

export interface TodayFile {
  date: string;        // "2026-04-09"
  dayLabel: string;    // "수요일"
  weekInfo: string;    // "W15 Day 3 | 회의 있는 날"
  tasks: TodayTask[];
  raw: string;
}
