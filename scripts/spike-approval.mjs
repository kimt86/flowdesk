// Phase 3 검증 — 양방향 승인 흐름:
// autoExecute=false로 write+destructive를 시키면 permission_request가 오고,
// 스크립트가 /api/assistant/approve 로 회신 → 실행되는지 확인.
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
  console.error("[3] standalone 없음 — desktop:build 먼저");
  process.exit(1);
}

const ws = path.join(os.tmpdir(), "flowdesk-approval-ws");
fs.rmSync(ws, { recursive: true, force: true });
fs.mkdirSync(path.join(ws, "todo"), { recursive: true });
fs.writeFileSync(path.join(ws, "todo", "TODO.md"), "# TODO\n\n## 오늘 할 일\n\n## 완료\n\n## 메모\n", "utf-8");

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

const base = `http://127.0.0.1:${port}`;
const approvals = [];

let ok = false;
try {
  if (!(await waitPort(port))) throw new Error("서버 부팅 타임아웃");
  console.log("[3] server up on", port);

  const prompt =
    "오늘 할 일에 '승인 흐름 테스트'를 추가한 다음, 방금 추가한 그 항목을 삭제해줘. " +
    "삭제 전에 read_today로 lineIndex를 꼭 확인해.";

  const res = await fetch(`${base}/api/assistant`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt, model: "claude-sonnet-4.6", autoExecute: false }),
  });
  console.log("[3] POST status:", res.status);

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
      const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
      const line = chunk.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      let ev;
      try { ev = JSON.parse(line.slice(6)); } catch { continue; }
      events.push(ev);
      if (ev.type === "permission_request") {
        approvals.push({ tool: ev.tool, category: ev.category });
        console.log(`   ↳ permission_request: ${ev.tool} (${ev.category}) → 승인 회신`);
        // 별도 라우트로 승인 회신(allow)
        await fetch(`${base}/api/assistant/approve`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ requestId: ev.requestId, approved: true }),
        });
      } else if (ev.type === "tool_result") {
        console.log(`   ✓ ${ev.tool}: ${ev.ok ? "ok" : "fail"} — ${ev.message}`);
      } else if (ev.type === "permission_resolved") {
        console.log(`   • resolved: ${ev.tool} → ${ev.decision}`);
      }
    }
  }

  const done = events.find((e) => e.type === "done");
  console.log("[3] 최종 응답:", done?.content?.slice?.(0, 200));
  const todoMd = fs.readFileSync(path.join(ws, "todo", "TODO.md"), "utf-8");
  console.log("[3] 최종 TODO.md:\n" + todoMd);

  const sawWriteApproval = approvals.some((a) => a.category === "write");
  const sawDestructiveApproval = approvals.some((a) => a.category === "destructive");
  // 추가 후 삭제 → 최종적으로 항목이 없어야 함
  const itemGone = !todoMd.includes("승인 흐름 테스트");
  console.log("[3] 검증:", JSON.stringify({ sawWriteApproval, sawDestructiveApproval, itemGone }, null, 2));
  ok = sawWriteApproval && sawDestructiveApproval && itemGone;
} catch (e) {
  console.error("[3] FATAL:", e?.stack || e);
} finally {
  try { proc.kill(); } catch { /* 무시 */ }
}
console.log("\n[3] RESULT OK:", ok);
process.exit(ok ? 0 : 1);
