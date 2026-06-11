import path from "path";

// 환경변수 → 워크스페이스 루트 (미설정 시 기존 동작 유지: process.cwd()의 상위)
export const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT
  ? path.resolve(process.env.WORKSPACE_ROOT)
  : path.resolve(process.cwd(), "..");

export const DOCS_ROOT = path.join(WORKSPACE_ROOT, "docs");
export const TODO_DIR = path.join(WORKSPACE_ROOT, "todo");
export const TODO_FILE_PATH = path.join(WORKSPACE_ROOT, "todo", "TODO.md");
export const WORKLOGS_DIR = path.join(WORKSPACE_ROOT, "work-logs");
export const WORK_DIR = path.join(WORKSPACE_ROOT, "work");
export const TEMPLATE_DIR = path.join(WORKLOGS_DIR, "templates");
export const MEETING_MINUTES_DIR = path.join(WORKSPACE_ROOT, "meetings");
export const PRESENTATIONS_DIR = path.join(WORKSPACE_ROOT, "presentations");
export const IDEAS_FILE_PATH = path.join(WORKSPACE_ROOT, "IDEAS.md");
export const PROJECTS_FILE_PATH = path.join(WORKSPACE_ROOT, "PROJECTS.md");
export const TODAY_FILE_PATH = path.join(WORKSPACE_ROOT, "todo", "TODO.md");
export const ARCHIVE_DIR = path.join(WORKSPACE_ROOT, "todo", "archive");
export const ARCHIVE_FILE_PATH = path.join(ARCHIVE_DIR, "archive.md");

export function plansDir(projectId: string) {
  return path.join(DOCS_ROOT, projectId, "plans");
}
