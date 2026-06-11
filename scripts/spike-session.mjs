// 멀티턴 맥락 검증 — 1턴에서 추가한 항목을 2턴에서 "방금 그거"로 지칭해 삭제할 수 있는지.
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
// 세션 저장 격리(COPILOT_HOME) — resumeSession이 같은 디렉터리에서 세션을 복원
const copilotHome = path.join(os.tmpdir(), "flowdesk-session-home");

if (!fs.existsSync(serverJs)) { console.error("[S] standalone 없음"); process.exit(1); }

const ws = path.join(os.tmpdir(), "flowdesk-session-ws");
fs.rmSync(ws, { recursive: true, force: true });
fs.mkdirSync(path.join(ws, "todo"), { recursive: true });
fs.writeFileSync(path.join(ws, "todo", "TODO.md"), "# TODO\n\n## 오늘 할 일\n\n## 메모\n", "utf-8");

function freePort() {
  return new Promise((res, rej) => {
    const s = net.createServer(); s.unref(); s.on("error", rej);
    s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
  });
}
function waitPort(p, t = 30000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const s = net.connect(p, "127.0.0.1");
      s.once("connect", () => { s.destroy(); resolve(true); });
      s.once("error", () => { s.destroy(); if (Date.now() - start > t) resolve(false); else setTimeout(tick, 300); });
    };
    tick();
  });
}
async function sse(url, body) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = ""; const evs = [];
  while (true) { const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true });
    let i; while ((i = buf.indexOf("\n\n")) >= 0) { const c = buf.slice(0, i); buf = buf.slice(i + 2);
      const l = c.split("\n").find((x) => x.startsWith("data: "));
      if (!l) continue;
      let ev; try { ev = JSON.parse(l.slice(6)); } catch { continue; }
      evs.push(ev);
      // destructive 등 승인 요청은 즉시 허용 회신(실제 앱에선 사용자 모달)
      if (ev.type === "permission_request") {
        await fetch(`${url}/approve`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: ev.requestId, approved: true }) });
      }
    } }
  return evs;
}

const port = await freePort();
const proc = spawn(process.execPath, [serverJs], {
  cwd: standalone,
  env: { ...process.env, NODE_ENV: "production", PORT: String(port), HOSTNAME: "127.0.0.1", WORKSPACE_ROOT: ws, FLOWDESK_COPILOT_EXE: copilotExe, COPILOT_HOME: copilotHome },
  stdio: ["ignore", "ignore", "pipe"],
});
proc.stderr.on("data", (d) => process.stderr.write(`[srv-err] ${d}`));
const base = `http://127.0.0.1:${port}/api/assistant`;

let ok = false;
try {
  if (!(await waitPort(port))) throw new Error("부팅 타임아웃");
  console.log("[S] server up on", port);

  // 1턴: 항목 추가
  const p1 = "오늘 할 일에 '세션 맥락 테스트'를 추가해줘.";
  const ev1 = await sse(base, { prompt: p1, model: "claude-sonnet-4.6", autoExecute: true });
  const reply1 = ev1.find((e) => e.type === "done")?.content || "추가했습니다.";
  console.log("[S] 1턴 tool:", ev1.filter((e) => e.type === "tool_result").map((e) => `${e.tool}:${e.ok}`).join(", "));
  console.log("[S] 1턴 응답:", String(reply1).slice(0, 150));

  // 2턴: 직전 대화를 history로 전달 — "방금 추가한 그 할일"이 무엇인지 맥락으로 알아야 함
  const history = [
    { role: "user", content: p1 },
    { role: "assistant", content: reply1 },
  ];
  const ev2 = await sse(base, { prompt: "방금 추가한 그 할일을 삭제해줘.", model: "claude-sonnet-4.6", autoExecute: true, history });
  const tools2 = ev2.filter((e) => e.type === "tool_result").map((e) => `${e.tool}:${e.ok}`);
  console.log("[S] 2턴 이벤트 타입:", ev2.map((e) => e.type).join(","));
  const err2 = ev2.find((e) => e.type === "error");
  if (err2) console.log("[S] 2턴 에러:", err2.message);
  console.log("[S] 2턴 tool:", tools2.join(", "));
  console.log("[S] 2턴 응답:", ev2.find((e) => e.type === "done")?.content?.slice?.(0, 200));

  const todoMd = fs.readFileSync(path.join(ws, "todo", "TODO.md"), "utf-8");
  console.log("[S] 최종 TODO.md:\n" + todoMd);

  // 맥락 유지 성공 = 2턴에서 delete_today_task 호출 + 최종 파일에 항목 없음(추가→삭제)
  const calledDelete = tools2.some((t) => t.startsWith("delete_today_task"));
  const itemGone = !todoMd.includes("세션 맥락 테스트");
  ok = calledDelete && itemGone;
  console.log("[S] 검증:", JSON.stringify({ calledDelete, itemGone }, null, 2));
} catch (e) {
  console.error("[S] FATAL:", e?.stack || e);
} finally {
  try { proc.kill(); } catch {}
}
console.log("\n[S] RESULT OK:", ok);
process.exit(ok ? 0 : 1);
