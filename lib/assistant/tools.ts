// FlowDesk AI 비서 — tool 레지스트리(프로바이더 중립, zod 단일원본).
// 각 tool은 lib/* 함수를 직접 호출한다. 프로바이더(Copilot 등)가 이 스펙을 자기 형식으로 변환.
// 분류: read=자동승인 / write=승인게이트(자동실행 토글) / destructive=항상 승인.
import { z } from "zod";
import type { AssistantTool, ToolCategory, ToolResult } from "./types";

import * as today from "@/lib/today";
import * as docs from "@/lib/docs";
import * as meetings from "@/lib/meetings";
import * as work from "@/lib/work";
import * as worklogs from "@/lib/worklogs";
import * as ideas from "@/lib/ideas";
import * as projects from "@/lib/projects";
import * as plans from "@/lib/plans";
import * as archive from "@/lib/archive";
import * as presentations from "@/lib/presentations";

function ok(message: string, data?: unknown): ToolResult {
  return { ok: true, message, data };
}
function fail(message: string): ToolResult {
  return { ok: false, message };
}
function boolResult(b: boolean, okMsg: string, failMsg: string): ToolResult {
  return b ? ok(okMsg) : fail(failMsg);
}

// 핸들러 인자 타입을 zod 스키마에서 추론하는 헬퍼.
function tool<S extends z.ZodType>(
  name: string,
  category: ToolCategory,
  description: string,
  parameters: S,
  handler: (args: z.infer<S>) => Promise<ToolResult> | ToolResult,
): AssistantTool {
  return { name, description, category, parameters, handler: handler as AssistantTool["handler"] };
}

const empty = z.object({});

// ───────────────────────── today (TODO.md) ─────────────────────────
const todayTools: AssistantTool[] = [
  tool(
    "read_today",
    "read",
    "오늘 할 일(TODO.md)을 읽어 각 task의 lineIndex와 내용을 반환한다. " +
      "할 일을 수정/완료/삭제/아카이브하기 직전에 반드시 먼저 호출해 최신 lineIndex를 확인하라 " +
      "(파일이 바뀌면 lineIndex가 재배열되므로 이전 결과를 재사용하면 안 됨).",
    empty,
    () => {
      const f = today.readToday();
      if (!f) return fail("오늘 파일(TODO.md)을 읽을 수 없습니다.");
      const tasks = f.tasks.map((t) => ({
        lineIndex: t.lineIndex,
        done: t.done,
        priority: t.priority,
        content: t.content,
        category: t.category,
        dueDate: t.dueDate,
        tags: t.tags,
        memo: t.memo,
      }));
      return ok(`오늘 할 일 ${tasks.length}건`, { date: f.date, tasks });
    },
  ),
  tool(
    "add_today_task",
    "write",
    "오늘 할 일에 새 항목을 추가한다('today' 태그가 자동 포함되어 목록에 표시됨).",
    z.object({
      content: z.string().min(1).describe("할 일 내용"),
      priority: z.enum(["high", "medium", "low"]).optional().describe("우선순위(기본 medium)"),
      category: z.string().optional().describe("분류, @로 시작(예: @회의, @개발; 기본 @기타)"),
      dueDate: z.string().optional().describe("마감일(예: 2026-06-15)"),
      memo: z.string().optional().describe("메모"),
    }),
    (a) =>
      boolResult(
        today.addTodayTask({
          content: a.content,
          priority: a.priority ?? "medium",
          category: a.category ?? "@기타",
          dueDate: a.dueDate ?? null,
          tags: ["today"],
          memo: a.memo ?? null,
        }),
        `"${a.content}" 추가됨`,
        "추가 실패(중복이거나 '오늘 할 일' 섹션을 찾지 못함)",
      ),
  ),
  tool(
    "update_today_task",
    "write",
    "기존 오늘 할 일을 수정한다. lineIndex는 read_today로 먼저 확인할 것. 지정한 필드만 변경된다.",
    z.object({
      lineIndex: z.number().int().describe("read_today로 얻은 대상 task의 lineIndex"),
      content: z.string().optional(),
      priority: z.enum(["high", "medium", "low"]).optional(),
      category: z.string().optional(),
      dueDate: z.string().nullable().optional(),
      done: z.boolean().optional(),
      memo: z.string().nullable().optional(),
    }),
    (a) => {
      const { lineIndex, ...fields } = a;
      return boolResult(
        today.updateTodayTask(lineIndex, fields),
        `lineIndex ${lineIndex} 수정됨`,
        `수정 실패(lineIndex ${lineIndex}가 task가 아니거나 범위를 벗어남)`,
      );
    },
  ),
  tool(
    "toggle_today_task",
    "write",
    "오늘 할 일의 완료 체크박스를 토글한다. lineIndex는 read_today로 먼저 확인할 것.",
    z.object({ lineIndex: z.number().int().describe("대상 task의 lineIndex") }),
    (a) =>
      boolResult(
        today.toggleTodayTask(a.lineIndex),
        `lineIndex ${a.lineIndex} 완료상태 토글됨`,
        `토글 실패(lineIndex ${a.lineIndex})`,
      ),
  ),
  tool(
    "delete_today_task",
    "destructive",
    "오늘 할 일 항목을 삭제한다(메모 줄 포함). 되돌릴 수 없음. lineIndex는 read_today로 먼저 확인할 것.",
    z.object({ lineIndex: z.number().int().describe("대상 task의 lineIndex") }),
    (a) =>
      boolResult(
        today.deleteTodayTask(a.lineIndex),
        `lineIndex ${a.lineIndex} 삭제됨`,
        `삭제 실패(lineIndex ${a.lineIndex})`,
      ),
  ),
  tool(
    "archive_today_task",
    "write",
    "오늘 할 일 항목을 보관함(archive)으로 이동한다. lineIndex는 read_today로 먼저 확인할 것.",
    z.object({ lineIndex: z.number().int().describe("대상 task의 lineIndex") }),
    (a) =>
      boolResult(
        archive.archiveTodoFromTodo(a.lineIndex),
        `lineIndex ${a.lineIndex} 보관됨`,
        `보관 실패(lineIndex ${a.lineIndex})`,
      ),
  ),
];

// ───────────────────────── docs ─────────────────────────
const docsTools: AssistantTool[] = [
  tool(
    "list_docs",
    "read",
    "워크스페이스 문서(docs/) 목록을 메타데이터(relPath, title, status, tags 등)와 함께 반환한다.",
    empty,
    () => {
      const list = docs.getCachedDocs();
      return ok(`문서 ${list.length}건`, list);
    },
  ),
  tool(
    "read_doc",
    "read",
    "문서 전체 내용을 읽는다. relPath는 list_docs에서 얻은 값만 사용(예: docs/foo.md).",
    z.object({ relPath: z.string().min(1).describe("WORKSPACE_ROOT 기준 상대경로, docs/ 내부") }),
    (a) => {
      const c = docs.readDocSafe(a.relPath);
      return c === null ? fail(`문서를 읽을 수 없음: ${a.relPath}`) : ok(`${a.relPath} 읽음`, c);
    },
  ),
  tool(
    "create_doc",
    "write",
    "새 문서를 생성한다(이미 존재하면 실패). content에 frontmatter(---title/status/...---)를 포함하라.",
    z.object({
      relPath: z.string().min(1).describe("docs/ 내부 .md 경로(중간 디렉토리 자동 생성)"),
      content: z.string().describe("frontmatter 포함 전체 내용"),
    }),
    (a) => boolResult(docs.createDocSafe(a.relPath, a.content), `${a.relPath} 생성됨`, `생성 실패(이미 존재하거나 경로 무효): ${a.relPath}`),
  ),
  tool(
    "update_doc_meta",
    "write",
    "문서 frontmatter 메타(title/status/author/tags)를 부분 수정한다. 본문·기타 필드는 보존, updated 자동 갱신.",
    z.object({
      relPath: z.string().min(1),
      title: z.string().optional(),
      status: z.enum(["draft", "review", "final"]).optional(),
      author: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
    (a) => {
      const { relPath, ...patch } = a;
      return boolResult(docs.patchDocMeta(relPath, patch), `${relPath} 메타 수정됨`, `메타 수정 실패: ${relPath}`);
    },
  ),
  tool(
    "update_doc_body",
    "write",
    "문서 본문(frontmatter 제외)을 교체한다. frontmatter는 디스크 상태 보존, updated 자동 갱신. 부분 수정엔 read_doc로 현재 본문을 받아 편집 후 전달.",
    z.object({ relPath: z.string().min(1), body: z.string().describe("새 본문(frontmatter 제외)") }),
    (a) => boolResult(docs.patchDocBody(a.relPath, a.body), `${a.relPath} 본문 갱신됨`, `본문 갱신 실패: ${a.relPath}`),
  ),
  tool(
    "overwrite_doc",
    "destructive",
    "문서 전체(frontmatter 포함)를 통째로 덮어쓴다. 기존 내용 손실. 가능하면 update_doc_meta/update_doc_body를 우선 사용.",
    z.object({ relPath: z.string().min(1), content: z.string() }),
    (a) => boolResult(docs.writeDocSafe(a.relPath, a.content), `${a.relPath} 전체 교체됨`, `덮어쓰기 실패: ${a.relPath}`),
  ),
  tool(
    "delete_doc",
    "destructive",
    "문서를 삭제한다. 되돌릴 수 없음.",
    z.object({ relPath: z.string().min(1) }),
    (a) => boolResult(docs.deleteDocSafe(a.relPath), `${a.relPath} 삭제됨`, `삭제 실패: ${a.relPath}`),
  ),
];

// ───────────────────────── meetings ─────────────────────────
const meetingTools: AssistantTool[] = [
  tool(
    "list_meetings",
    "read",
    "회의록(meetings/) 목록을 메타(relPath, title, date, attendees, status 등)와 함께 반환한다.",
    empty,
    () => {
      const list = meetings.getCachedMeetings();
      return ok(`회의록 ${list.length}건`, list);
    },
  ),
  tool(
    "read_meeting",
    "read",
    "회의록 전체 내용을 읽는다. relPath는 list_meetings에서 얻은 값만 사용(예: 2026/06/standup.md).",
    z.object({ relPath: z.string().min(1).describe("MEETING_MINUTES_DIR 기준 상대경로") }),
    (a) => {
      const c = meetings.readMeetingSafe(a.relPath);
      return c === null ? fail(`회의록을 읽을 수 없음: ${a.relPath}`) : ok(`${a.relPath} 읽음`, c);
    },
  ),
  tool(
    "create_meeting",
    "write",
    "새 회의록을 작성/생성한다(이미 존재하면 실패). 관례 경로: <year>/<month>/<제목>.md. content에 frontmatter(title/date/attendees/status) 또는 표 형식 포함.",
    z.object({
      relPath: z.string().min(1).describe("meetings/ 내부 .md 경로(중간 디렉토리 자동 생성)"),
      content: z.string().describe("회의록 전체 마크다운"),
    }),
    (a) => boolResult(meetings.createMeetingSafe(a.relPath, a.content), `회의록 생성됨: ${a.relPath}`, `생성 실패(이미 존재하거나 경로 무효): ${a.relPath}`),
  ),
  tool(
    "overwrite_meeting",
    "destructive",
    "기존 회의록 전체를 덮어쓴다. 기존 내용 손실.",
    z.object({ relPath: z.string().min(1), content: z.string() }),
    (a) => boolResult(meetings.writeMeetingSafe(a.relPath, a.content), `회의록 전체 교체됨: ${a.relPath}`, `덮어쓰기 실패: ${a.relPath}`),
  ),
  tool(
    "delete_meeting",
    "destructive",
    "회의록을 삭제한다. 되돌릴 수 없음.",
    z.object({ relPath: z.string().min(1) }),
    (a) => boolResult(meetings.deleteMeetingSafe(a.relPath), `회의록 삭제됨: ${a.relPath}`, `삭제 실패: ${a.relPath}`),
  ),
];

// ───────────────────────── work ─────────────────────────
const workTools: AssistantTool[] = [
  tool(
    "list_work",
    "read",
    "업무(work/) 항목을 폴더(slug) 단위로, 각 폴더의 .md 파일 목록과 함께 반환한다.",
    empty,
    () => {
      const list = work.getCachedWork();
      return ok(`업무 ${list.length}건`, list);
    },
  ),
  tool(
    "read_work",
    "read",
    "업무 문서 내용을 읽는다. relPath는 list_work의 files[].relPath 값만 사용.",
    z.object({ relPath: z.string().min(1).describe("WORKSPACE_ROOT 기준 상대경로, work/ 내부") }),
    (a) => {
      const c = work.readWorkSafe(a.relPath);
      return c === null ? fail(`업무 문서를 읽을 수 없음: ${a.relPath}`) : ok(`${a.relPath} 읽음`, c);
    },
  ),
  tool(
    "create_work",
    "write",
    "새 업무 문서를 생성한다(이미 존재하면 실패).",
    z.object({ relPath: z.string().min(1).describe("work/ 내부 .md 경로"), content: z.string() }),
    (a) => {
      if (work.readWorkSafe(a.relPath) !== null) return fail(`이미 존재함: ${a.relPath}`);
      return boolResult(work.writeWorkSafe(a.relPath, a.content), `업무 문서 생성됨: ${a.relPath}`, `생성 실패(경로 무효): ${a.relPath}`);
    },
  ),
  tool(
    "overwrite_work",
    "destructive",
    "기존 업무 문서 전체를 덮어쓴다. 기존 내용 손실.",
    z.object({ relPath: z.string().min(1), content: z.string() }),
    (a) => boolResult(work.writeWorkSafe(a.relPath, a.content), `업무 문서 교체됨: ${a.relPath}`, `덮어쓰기 실패: ${a.relPath}`),
  ),
  tool(
    "delete_work",
    "destructive",
    "업무 문서를 삭제한다. 되돌릴 수 없음.",
    z.object({ relPath: z.string().min(1) }),
    (a) => boolResult(work.deleteWorkSafe(a.relPath), `업무 문서 삭제됨: ${a.relPath}`, `삭제 실패: ${a.relPath}`),
  ),
];

// ───────────────────────── worklogs ─────────────────────────
const worklogTools: AssistantTool[] = [
  tool(
    "list_worklogs",
    "read",
    "주간 업무로그(work-logs/) 목록을 메타(주차/기간/요약/태그)와 함께 반환한다.",
    empty,
    () => {
      const list = worklogs.getCachedWorklogs();
      return ok(`업무로그 ${list.length}건`, list);
    },
  ),
  tool(
    "read_worklog",
    "read",
    "업무로그 내용을 읽는다. relPath는 list_worklogs에서 얻은 값만 사용.",
    z.object({ relPath: z.string().min(1).describe("WORKLOGS_DIR 기준 상대경로") }),
    (a) => {
      const c = worklogs.readWorklogSafe(a.relPath);
      return c === null ? fail(`업무로그를 읽을 수 없음: ${a.relPath}`) : ok(`${a.relPath} 읽음`, c);
    },
  ),
  tool(
    "create_worklog",
    "write",
    "한 일을 정리한 새 주간 업무로그를 생성한다(이미 존재하면 실패). 파일명은 반드시 " +
      "week-<주차번호>.md 형식이어야 한다(목록 표시 규칙). 관례 경로: <year>/<month>/week-<n>.md " +
      "(예: 2026/06/week-24.md). 표(주차/기간/작성자/태그) + '## 주간 요약' 구조 권장.",
    z.object({
      relPath: z.string().min(1).describe("work-logs/ 내부 .md 경로, 파일명은 week-<숫자>.md"),
      content: z.string(),
    }),
    (a) =>
      boolResult(
        worklogs.createWorklogSafe(a.relPath, a.content),
        `업무로그 생성됨: ${a.relPath}`,
        `생성 실패(파일명이 week-<숫자>.md 형식이 아니거나, 이미 존재하거나 경로 무효): ${a.relPath}`,
      ),
  ),
  tool(
    "overwrite_worklog",
    "destructive",
    "기존 업무로그 전체를 덮어쓴다. 기존 내용 손실.",
    z.object({ relPath: z.string().min(1), content: z.string() }),
    (a) => boolResult(worklogs.writeWorklogSafe(a.relPath, a.content), `업무로그 교체됨: ${a.relPath}`, `덮어쓰기 실패: ${a.relPath}`),
  ),
  tool(
    "delete_worklog",
    "destructive",
    "업무로그를 삭제한다. 되돌릴 수 없음.",
    z.object({ relPath: z.string().min(1) }),
    (a) => boolResult(worklogs.deleteWorklogSafe(a.relPath), `업무로그 삭제됨: ${a.relPath}`, `삭제 실패: ${a.relPath}`),
  ),
];

// ───────────────────────── ideas (IDEAS.md) ─────────────────────────
const ideaTools: AssistantTool[] = [
  tool("list_ideas", "read", "아이디어 보드(IDEAS.md) 목록을 id와 함께 반환한다. 수정/삭제 전 id 확인용.", empty, () => {
    const list = ideas.parseIdeas();
    return ok(`아이디어 ${list.length}건`, list);
  }),
  tool(
    "add_idea",
    "write",
    "새 아이디어를 추가한다.",
    z.object({
      title: z.string().min(1),
      content: z.string().default(""),
      tags: z.array(z.string()).default([]),
    }),
    (a) => {
      const id = ideas.addIdea(a.title, a.content, a.tags);
      return ok(`아이디어 추가됨(id: ${id})`, { id });
    },
  ),
  tool(
    "update_idea",
    "write",
    "아이디어를 수정한다. id는 list_ideas로 먼저 확인할 것.",
    z.object({
      id: z.string().min(1),
      title: z.string().optional(),
      content: z.string().optional(),
      tags: z.array(z.string()).optional(),
      status: z.enum(["board", "archive"]).optional(),
    }),
    (a) => {
      const { id, ...updates } = a;
      return boolResult(ideas.updateIdea(id, updates), `아이디어 ${id} 수정됨`, `수정 실패(id 없음): ${id}`);
    },
  ),
  tool(
    "delete_idea",
    "destructive",
    "아이디어를 삭제한다. 되돌릴 수 없음. id는 list_ideas로 먼저 확인할 것.",
    z.object({ id: z.string().min(1) }),
    (a) => boolResult(ideas.deleteIdea(a.id), `아이디어 ${a.id} 삭제됨`, `삭제 실패(id 없음): ${a.id}`),
  ),
];

// ───────────────────────── projects (PROJECTS.md) ─────────────────────────
const projectTools: AssistantTool[] = [
  tool("list_projects", "read", "프로젝트 현황(PROJECTS.md) 목록을 id/rawContent와 함께 반환한다. 수정/삭제 전 id 확인용.", empty, () => {
    const list = projects.parseProjects();
    return ok(`프로젝트 ${list.length}건`, list);
  }),
  tool(
    "add_project",
    "write",
    "새 프로젝트를 추가한다(기본 템플릿으로 생성).",
    z.object({
      title: z.string().min(1),
      code: z.string().default(""),
      client: z.string().default(""),
      goal: z.string().default(""),
      owner: z.string().default(""),
    }),
    (a) => {
      const id = projects.addProject(a.title, a.code, a.client, a.goal, a.owner);
      return ok(`프로젝트 추가됨(id: ${id})`, { id });
    },
  ),
  tool(
    "update_project",
    "write",
    "프로젝트를 수정한다. rawContent(해당 프로젝트의 마크다운 섹션 전체)를 교체하거나 archived 토글. id는 list_projects로 먼저 확인. rawContent 수정 시 list_projects로 현재 값을 받아 편집 후 전달.",
    z.object({
      id: z.string().min(1),
      rawContent: z.string().optional(),
      archived: z.boolean().optional(),
    }),
    (a) => {
      const { id, ...updates } = a;
      return boolResult(projects.updateProject(id, updates), `프로젝트 ${id} 수정됨`, `수정 실패(id 없음): ${id}`);
    },
  ),
  tool(
    "delete_project",
    "destructive",
    "프로젝트를 삭제한다. 되돌릴 수 없음. id는 list_projects로 먼저 확인할 것.",
    z.object({ id: z.string().min(1) }),
    (a) => boolResult(projects.deleteProject(a.id), `프로젝트 ${a.id} 삭제됨`, `삭제 실패(id 없음): ${a.id}`),
  ),
];

// ───────────────────────── plans (docs/<projectId>/plans) ─────────────────────────
const planTools: AssistantTool[] = [
  tool(
    "list_plans",
    "read",
    "특정 프로젝트의 기획 문서(plans) 목록을 반환한다. projectId는 list_projects의 id 사용.",
    z.object({ projectId: z.string().min(1) }),
    (a) => {
      const list = plans.getCachedPlans(a.projectId);
      return ok(`'${a.projectId}' 기획 ${list.length}건`, list);
    },
  ),
  tool(
    "read_plan",
    "read",
    "기획 문서 상세(본문 + phase 목록)를 읽는다. filename은 list_plans에서 얻은 값 사용.",
    z.object({ projectId: z.string().min(1), filename: z.string().min(1) }),
    async (a) => {
      const detail = await plans.readPlanDetail(a.projectId, a.filename);
      return detail === null ? fail(`기획을 읽을 수 없음: ${a.projectId}/${a.filename}`) : ok(`${a.filename} 읽음`, detail);
    },
  ),
];

// ───────────────────────── archive (보관함) ─────────────────────────
const archiveTools: AssistantTool[] = [
  tool("list_archived_todos", "read", "보관된 모든 할 일을 (archiveFile, lineIndex)와 함께 반환한다. 복원/삭제 전 식별자 확인용.", empty, () => {
    const list = archive.listArchivedTodos();
    return ok(`보관 항목 ${list.length}건`, list);
  }),
  tool("list_archive_months", "read", "보관함의 월별 요약(키/라벨/개수)을 반환한다.", empty, () => {
    const list = archive.listArchiveMonthSummaries();
    return ok(`보관 월 ${list.length}개`, list);
  }),
  tool(
    "list_archived_todos_by_month",
    "read",
    "특정 월의 보관 항목만 반환한다.",
    z.object({ year: z.string().describe("4자리 연도(예: 2026)"), month: z.string().describe("2자리 월(예: 06)") }),
    (a) => {
      const list = archive.listArchivedTodosByMonth(a.year, a.month);
      return ok(`${a.year}-${a.month} 보관 ${list.length}건`, list);
    },
  ),
  tool(
    "restore_archived_todo",
    "write",
    "보관 항목을 오늘 할 일의 '완료' 섹션으로 복원한다. (archiveFile, lineIndex)는 list_archived_todos(_by_month)로 먼저 확인.",
    z.object({ archiveFile: z.string().min(1).describe("ARCHIVE_DIR 기준 상대경로"), lineIndex: z.number().int() }),
    (a) => boolResult(archive.restoreArchivedTodo(a.archiveFile, a.lineIndex), `복원됨: ${a.archiveFile}#${a.lineIndex}`, `복원 실패: ${a.archiveFile}#${a.lineIndex}`),
  ),
  tool(
    "delete_archived_todo",
    "destructive",
    "보관 항목을 영구 삭제한다. 되돌릴 수 없음. (archiveFile, lineIndex)는 list_archived_todos(_by_month)로 먼저 확인.",
    z.object({ archiveFile: z.string().min(1), lineIndex: z.number().int() }),
    (a) => boolResult(archive.deleteArchivedTodo(a.archiveFile, a.lineIndex), `삭제됨: ${a.archiveFile}#${a.lineIndex}`, `삭제 실패: ${a.archiveFile}#${a.lineIndex}`),
  ),
];

// ───────────────────────── presentations (read-only) ─────────────────────────
const presentationTools: AssistantTool[] = [
  tool("list_presentations", "read", "발표 자료(presentations/, HTML) 목록을 메타와 함께 반환한다.", empty, () => {
    const list = presentations.getCachedPresentations();
    return ok(`발표 ${list.length}건`, list);
  }),
  tool(
    "resolve_presentation",
    "read",
    "발표 파일의 검증된 절대경로를 반환한다(존재/접근 확인). relPath는 list_presentations에서 얻은 값 사용.",
    z.object({ relPath: z.string().min(1).describe("PRESENTATIONS_DIR 기준 상대경로(.html)") }),
    (a) => {
      const p = presentations.resolvePresentationSafe(a.relPath);
      return p === null ? fail(`발표를 찾을 수 없음: ${a.relPath}`) : ok(`확인됨: ${a.relPath}`, { absolutePath: p });
    },
  ),
];

export const ALL_TOOLS: AssistantTool[] = [
  ...todayTools,
  ...docsTools,
  ...meetingTools,
  ...workTools,
  ...worklogTools,
  ...ideaTools,
  ...projectTools,
  ...planTools,
  ...archiveTools,
  ...presentationTools,
];

export const TOOLS_BY_NAME: Map<string, AssistantTool> = new Map(
  ALL_TOOLS.map((t) => [t.name, t]),
);
