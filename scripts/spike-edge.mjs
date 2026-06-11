// 엣지 버그 수정 검증 — archive 코드블록 방어 + worklog 파일명 형식 강제(tsx 실행).
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const ws = path.join(os.tmpdir(), "flowdesk-edge-ws");
fs.rmSync(ws, { recursive: true, force: true });
fs.mkdirSync(path.join(ws, "todo", "archive"), { recursive: true });
fs.mkdirSync(path.join(ws, "work-logs"), { recursive: true });
process.env.WORKSPACE_ROOT = ws;

const checks = {};

// ── archive: 코드블록 내부 체크박스를 mutation 대상으로 오인하지 않음 ──
// 라인: 0:#보관함 1:공백 2:--- 3:공백 4:- [x] 정상 5:``` 6:- [ ] 코드예시 7:```
const archiveMd = "# 보관함\n\n---\n\n- [x] 정상 항목 — done:2026-06-01\n```\n- [ ] 코드 예시\n```\n";
fs.writeFileSync(path.join(ws, "todo", "archive", "test.md"), archiveMd, "utf-8");
const archive = await import(pathToFileURL(path.join(repoRoot, "lib", "archive.ts")).href);

// 코드블록 안(lineIndex 6) 삭제 시도 → 방어로 false
const delCodeBlock = archive.deleteArchivedTodo("test.md", 6);
checks["archive: 코드블록 내부 줄 삭제 거부"] = delCodeBlock === false;
// 코드블록이 그대로 남아있는지(삭제 안 됨)
const afterMd = fs.readFileSync(path.join(ws, "todo", "archive", "test.md"), "utf-8");
checks["archive: 코드블록 예시 보존됨"] = afterMd.includes("- [ ] 코드 예시");
// 정상 항목(lineIndex 4) 삭제 → 성공
const delNormal = archive.deleteArchivedTodo("test.md", 4);
checks["archive: 정상 항목 삭제 성공"] = delNormal === true;

// ── worklog: week-<n>.md 형식 강제 ──
const worklogs = await import(pathToFileURL(path.join(repoRoot, "lib", "worklogs.ts")).href);
const okStd = worklogs.createWorklogSafe("2026/06/week-24.md", "| **주차** | 2026년 W24 |\n\n## 주간 요약\n> 요약\n");
checks["worklog: week-24.md 생성 성공"] = okStd === true && fs.existsSync(path.join(ws, "work-logs", "2026", "06", "week-24.md"));
const badName = worklogs.createWorklogSafe("2026/06/summary.md", "내용");
checks["worklog: 비표준 파일명 거부"] = badName === false && !fs.existsSync(path.join(ws, "work-logs", "2026", "06", "summary.md"));
// 생성한 표준 파일은 목록에 보임
const list = worklogs.scanWorklogs();
checks["worklog: 생성본이 목록에 표시"] = list.some((w) => w.relPath.replace(/\\/g, "/").endsWith("week-24.md"));

console.log("[E] 검증 결과:");
let allOk = true;
for (const [k, v] of Object.entries(checks)) {
  console.log(`   ${v ? "✓" : "✗"} ${k}`);
  allOk = allOk && v;
}
console.log("\n[E] RESULT OK:", allOk);
process.exit(allOk ? 0 : 1);
