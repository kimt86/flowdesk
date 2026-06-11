// ideas.ts / projects.ts 수정 검증 — 실제 lib 함수로 round-trip / 손상 방지 테스트(tsx 실행).
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const ws = path.join(os.tmpdir(), "flowdesk-rt-ws");
fs.rmSync(ws, { recursive: true, force: true });
fs.mkdirSync(ws, { recursive: true });
process.env.WORKSPACE_ROOT = ws;
fs.writeFileSync(path.join(ws, "IDEAS.md"), "# Idea Board\n", "utf-8");
fs.writeFileSync(path.join(ws, "PROJECTS.md"), "# 프로젝트 현황\n", "utf-8");

const ideas = await import(pathToFileURL(path.join(repoRoot, "lib", "ideas.ts")).href);
const projects = await import(pathToFileURL(path.join(repoRoot, "lib", "projects.ts")).href);

const checks = {};

// ── ideas: 멀티라인 + '---' + 콤마 태그 round-trip ──
const ml = "첫째 줄\n둘째 줄\n---\n넷째 줄 (구분자 포함)";
const id1 = ideas.addIdea("멀티라인 테스트", ml, ["tag,with,comma", "정상태그"]);
ideas.addIdea("둘째 아이디어", "단순 내용", ["x"]); // 인접 항목 손상 여부 확인용
const parsed = ideas.parseIdeas();
const got = parsed.find((i) => i.id === id1);
checks["ideas: 멀티라인 content 보존"] = got?.content === ml;
checks["ideas: 콤마 포함 태그 보존"] = got?.tags?.[0] === "tag,with,comma" && got?.tags?.[1] === "정상태그";
checks["ideas: 인접 아이디어 무손상"] = parsed.length === 2 && parsed.some((i) => i.title === "둘째 아이디어" && i.content === "단순 내용");

// 레거시 plain 파일 하위호환
fs.writeFileSync(
  path.join(ws, "IDEAS.md"),
  "# Idea Board\n\n---\nid: legacy-1\ntitle: 레거시 제목\ncontent: 레거시 내용\ntags: [a, b]\ndate: 2026-06-01\nstatus: board\n---\n",
  "utf-8",
);
const legacy = ideas.parseIdeas();
checks["ideas: 레거시 plain 파일 호환"] =
  legacy.length === 1 && legacy[0].title === "레거시 제목" && legacy[0].content === "레거시 내용" && legacy[0].tags.join(",") === "a,b";

// ── projects: 위험 입력 거부 / archive 오인 방지 ──
fs.writeFileSync(path.join(ws, "PROJECTS.md"), "# 프로젝트 현황\n", "utf-8");
const pid = projects.addProject("정상 프로젝트", "PRJ-1", "고객", "목표", "담당");
// 1) '## ' 없는 rawContent → 거부(프로젝트 소실 방지)
const r1 = projects.updateProject(pid, { rawContent: "헤딩 없는 본문" });
const after1 = projects.parseProjects();
checks["projects: ## 없는 rawContent 거부"] = r1 === false && after1.some((p) => p.id === pid);
// 2) '## ' 2개 rawContent → 거부(분열 방지)
const r2 = projects.updateProject(pid, { rawContent: "## A\n내용\n## B\n내용" });
const after2 = projects.parseProjects();
checks["projects: ## 2개 rawContent 거부"] = r2 === false && after2.length === 1;
// 3) 정상 rawContent → 허용
const r3 = projects.updateProject(pid, { rawContent: "## 이름변경됨\n\n| 항목 | 내용 |\n|--|--|\n| **프로젝트 코드** | PRJ-1 |\n| **상태** | 진행 |" });
checks["projects: 정상 rawContent 허용"] = r3 === true;
// 4) 제목에 'archive' 포함 → archive 구분자로 오인 안 함
fs.writeFileSync(path.join(ws, "PROJECTS.md"), "# 프로젝트 현황\n", "utf-8");
projects.addProject("Archive 전략 논의", "ARC-1", "", "", "");
projects.addProject("뒤따르는 프로젝트", "NEXT-1", "", "", "");
const projAfter = projects.parseProjects();
const arcProj = projAfter.find((p) => p.id === "ARC-1");
const nextProj = projAfter.find((p) => p.id === "NEXT-1");
checks["projects: 'archive' 제목 오인 안 함"] = !!arcProj && !arcProj.archived && !!nextProj && !nextProj.archived;

console.log("[RT] 검증 결과:");
let allOk = true;
for (const [k, v] of Object.entries(checks)) {
  console.log(`   ${v ? "✓" : "✗"} ${k}`);
  allOk = allOk && v;
}
console.log("\n[RT] RESULT OK:", allOk);
process.exit(allOk ? 0 : 1);
