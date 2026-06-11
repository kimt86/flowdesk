// 버그 재현·검증 — "오늘 할 일" 헤더 형식이 다양할 때(이모지/h3/헤더없음) add_today_task 동작.
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

if (!fs.existsSync(serverJs)) { console.error("[A] standalone 없음"); process.exit(1); }

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
      const l = c.split("\n").find((x) => x.startsWith("data: ")); if (l) { try { evs.push(JSON.parse(l.slice(6))); } catch {} } } }
  return evs;
}

// 사용자 케이스 재현: 이모지 접두 헤더 + 기존 #today 항목(완료 포함)
const cases = {
  "이모지 헤더": "# TODO\n\n## 📌 오늘 할 일\n- [x] 끝난 일 — @기타 | #today\n- [~] 진행중인 일 — @기타 | #today\n\n## 메모\n",
  "h3 헤더": "# 오늘\n\n### 오늘 할 일\n- [ ] 기존 — @기타 | #today\n",
  "헤더 없음(태그만)": "# 메모장\n\n- [ ] 떠도는 항목 — @기타 | #today\n\n## 기타\n",
};

const port = await freePort();
const ws = path.join(os.tmpdir(), "flowdesk-add-ws");

let allOk = true;
for (const [name, seed] of Object.entries(cases)) {
  fs.rmSync(ws, { recursive: true, force: true });
  fs.mkdirSync(path.join(ws, "todo"), { recursive: true });
  fs.writeFileSync(path.join(ws, "todo", "TODO.md"), seed, "utf-8");

  const proc = spawn(process.execPath, [serverJs], {
    cwd: standalone,
    env: { ...process.env, NODE_ENV: "production", PORT: String(port), HOSTNAME: "127.0.0.1", WORKSPACE_ROOT: ws, FLOWDESK_COPILOT_EXE: copilotExe },
    stdio: ["ignore", "ignore", "pipe"],
  });
  proc.stderr.on("data", (d) => process.stderr.write(`[srv-err] ${d}`));
  try {
    if (!(await waitPort(port))) throw new Error("부팅 타임아웃");
    const evs = await sse(`http://127.0.0.1:${port}/api/assistant`, {
      prompt: "오늘 할 일에 'tt-aiops-platform KPI 수치 산출 방법 점검'과 'ETW 토스 API 데이터 활용' 두 가지를 높은 우선순위로 추가해줘.",
      model: "claude-haiku-4.5", autoExecute: true,
    });
    const results = evs.filter((e) => e.type === "tool_result" && e.tool === "add_today_task");
    const okCount = results.filter((e) => e.ok).length;
    const todoMd = fs.readFileSync(path.join(ws, "todo", "TODO.md"), "utf-8");
    const hasKpi = todoMd.includes("KPI 수치 산출");
    const hasEtw = todoMd.includes("ETW 토스 API");
    const ok = okCount >= 2 && hasKpi && hasEtw;
    allOk = allOk && ok;
    console.log(`\n[A] [${name}] add 성공 ${okCount}건 / KPI:${hasKpi} ETW:${hasEtw} → ${ok ? "OK" : "FAIL"}`);
    console.log(todoMd);
  } catch (e) {
    allOk = false;
    console.error(`[A] [${name}] FATAL:`, e?.message || e);
  } finally {
    try { proc.kill(); } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
}
console.log("\n[A] RESULT OK:", allOk);
process.exit(allOk ? 0 : 1);
