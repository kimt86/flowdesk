// Phase 1c 검증 — 실제 /api/assistant(SSE) 라우트로 멀티 tool 실행:
// 오늘 할 일 추가 + 문서 생성 + 회의록 작성을 한 프롬프트로 시키고, 실제 파일이 만들어지는지 확인.
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const standalone = path.join(repoRoot, ".next", "standalone");
const serverJs = path.join(standalone, "server.js");
const copilotExe = path.join(repoRoot, "node_modules", "@github", "copilot-win32-x64", "copilot.exe");

if (!fs.existsSync(serverJs)) {
  console.error("[1c] .next/standalone/server.js 없음 — 먼저 desktop:build");
  process.exit(1);
}

// 임시 워크스페이스 시드(실데이터 보호)
const ws = path.join(os.tmpdir(), "flowdesk-assistant-ws");
fs.rmSync(ws, { recursive: true, force: true });
for (const sub of ["todo", "docs", "meetings", "work", "work-logs", "presentations"]) {
  fs.mkdirSync(path.join(ws, sub), { recursive: true });
}
fs.writeFileSync(path.join(ws, "todo", "TODO.md"), "# TODO\n\n## 오늘 할 일\n\n## 완료\n\n## 메모\n", "utf-8");
fs.writeFileSync(path.join(ws, "IDEAS.md"), "# Idea Board\n", "utf-8");
fs.writeFileSync(path.join(ws, "PROJECTS.md"), "# 프로젝트 현황\n", "utf-8");

function freePort() {
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.unref();
    s.on("error", rej);
    s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
  });
}
function waitPort(p, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const s = net.connect(p, "127.0.0.1");
      s.once("connect", () => { s.destroy(); resolve(true); });
      s.once("error", () => { s.destroy(); if (Date.now() - start > timeout) resolve(false); else setTimeout(tick, 300); });
    };
    tick();
  });
}

const port = await freePort();
const proc = spawn(process.execPath, [serverJs], {
  cwd: standalone,
  env: { ...process.env, NODE_ENV: "production", PORT: String(port), HOSTNAME: "127.0.0.1", WORKSPACE_ROOT: ws, FLOWDESK_COPILOT_EXE: copilotExe },
  stdio: ["ignore", "pipe", "pipe"],
});
proc.stdout.on("data", (d) => process.stdout.write(`[srv] ${d}`));
proc.stderr.on("data", (d) => process.stderr.write(`[srv-err] ${d}`));

let ok = false;
try {
  if (!(await waitPort(port))) throw new Error("서버 부팅 타임아웃");
  console.log("[1c] server up on", port);

  const prompt =
    "다음 세 가지를 순서대로 처리해줘. " +
    "1) 오늘 할 일에 '비서 통합 테스트' 항목을 높은 우선순위로 추가. " +
    "2) docs/assistant-test.md 문서를 생성하되 frontmatter에 title은 'AI 비서 검증', status는 draft로 하고 본문에 한 줄 요약을 써줘. " +
    "3) 2026년 6월 킥오프 회의록을 meetings/2026/06/kickoff.md 로 작성해줘(제목, 일시, 참석자 표 포함).";

  const res = await fetch(`http://127.0.0.1:${port}/api/assistant`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt, model: "claude-sonnet-4.6", autoExecute: true, approve: true }),
  });
  console.log("[1c] POST status:", res.status);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const events = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const line = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (line) {
        try { events.push(JSON.parse(line.slice(6))); } catch { /* skip */ }
      }
    }
  }

  const toolEvents = events.filter((e) => e.type === "tool_start" || e.type === "tool_result");
  const done = events.find((e) => e.type === "done");
  console.log("[1c] tool 이벤트:");
  for (const e of toolEvents) console.log("   ", JSON.stringify(e));
  console.log("[1c] 최종 응답:", done?.content?.slice?.(0, 300));

  // 파일 검증
  const todoMd = fs.readFileSync(path.join(ws, "todo", "TODO.md"), "utf-8");
  const docPath = path.join(ws, "docs", "assistant-test.md");
  const meetingPath = path.join(ws, "meetings", "2026", "06", "kickoff.md");
  const checks = {
    "todo에 항목 추가": todoMd.includes("비서 통합 테스트"),
    "문서 생성": fs.existsSync(docPath),
    "회의록 생성": fs.existsSync(meetingPath),
  };
  console.log("[1c] 파일 검증:", JSON.stringify(checks, null, 2));
  if (fs.existsSync(docPath)) console.log("[1c] 생성된 문서:\n" + fs.readFileSync(docPath, "utf-8"));
  if (fs.existsSync(meetingPath)) console.log("[1c] 생성된 회의록:\n" + fs.readFileSync(meetingPath, "utf-8"));

  ok = Object.values(checks).every(Boolean);
} catch (e) {
  console.error("[1c] FATAL:", e?.stack || e);
} finally {
  try { proc.kill(); } catch { /* 무시 */ }
}
console.log("\n[1c] RESULT OK:", ok);
process.exit(ok ? 0 : 1);
