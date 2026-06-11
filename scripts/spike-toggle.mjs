// 버그 재현·검증 — 진행중([~])/보류([!]) 상태 today task를 비서가 완료처리(toggle)할 수 있는지.
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
  console.error("[T] standalone 없음 — desktop:build 먼저");
  process.exit(1);
}

const ws = path.join(os.tmpdir(), "flowdesk-toggle-ws");
fs.rmSync(ws, { recursive: true, force: true });
fs.mkdirSync(path.join(ws, "todo"), { recursive: true });
// 진행중([~])·보류([!]) 상태 task 시드 — 기존엔 toggle/update가 실패하던 케이스
fs.writeFileSync(
  path.join(ws, "todo", "TODO.md"),
  [
    "# TODO",
    "",
    "## 오늘 할 일",
    "- [ ] 일반 미완료 항목 — @기타 | #today",
    "- [~] WP TOS ↔ AI Service 인터페이스 정의 — @기타 | #today",
    "- [!] 보류된 항목 — @기타 | #today",
    "",
    "## 메모",
    "",
  ].join("\n"),
  "utf-8",
);

function freePort() {
  return new Promise((res, rej) => {
    const s = net.createServer(); s.unref(); s.on("error", rej);
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
  if (!(await waitPort(port))) throw new Error("부팅 타임아웃");
  console.log("[T] server up on", port);

  const r = await fetch(`http://127.0.0.1:${port}/api/assistant`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      prompt: "오늘 할 일에서 'WP TOS ↔ AI Service 인터페이스 정의' 항목을 완료 처리해줘.",
      model: "claude-haiku-4.5",
      autoExecute: true,
    }),
  });
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const events = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
      const line = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (line) { try { events.push(JSON.parse(line.slice(6))); } catch { /* skip */ } }
    }
  }
  for (const e of events.filter((e) => e.type === "tool_result")) console.log(`   ${e.tool}: ${e.ok ? "ok" : "FAIL"} — ${e.message}`);

  const todoMd = fs.readFileSync(path.join(ws, "todo", "TODO.md"), "utf-8");
  console.log("[T] 최종 TODO.md:\n" + todoMd);
  // 해당 항목이 [x]로 완료처리됐는지
  ok = /- \[x\]\s+WP TOS ↔ AI Service 인터페이스 정의/.test(todoMd);
  console.log("[T] 완료처리 성공:", ok);
} catch (e) {
  console.error("[T] FATAL:", e?.stack || e);
} finally {
  try { proc.kill(); } catch { /* 무시 */ }
}
console.log("\n[T] RESULT OK:", ok);
process.exit(ok ? 0 : 1);
