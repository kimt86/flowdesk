// 최종 통합 검증 — Phase 2(모델/인증 라우트) + Phase 4(safe-write 백업) + 파일 쓰기.
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
  console.error("[F] standalone 없음 — desktop:build 먼저");
  process.exit(1);
}

const ws = path.join(os.tmpdir(), "flowdesk-final-ws");
fs.rmSync(ws, { recursive: true, force: true });
fs.mkdirSync(path.join(ws, "todo"), { recursive: true });
fs.writeFileSync(path.join(ws, "todo", "TODO.md"), "# TODO\n\n## 오늘 할 일\n\n## 메모\n", "utf-8");

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

let ok = false;
try {
  if (!(await waitPort(port))) throw new Error("부팅 타임아웃");
  console.log("[F] server up on", port);

  // 1) Phase 2 — 모델/인증 라우트
  const mres = await fetch(`${base}/api/assistant/models`);
  const mjson = await mres.json();
  console.log("[F] models:", mjson.models?.length, "authenticated:", mjson.authenticated, "login:", mjson.login);

  // 2) Phase 4 — 쓰기 + 백업. 같은 파일을 두 번 수정해 백업이 쌓이는지.
  for (const item of ["최종검증 항목A", "최종검증 항목B"]) {
    const r = await fetch(`${base}/api/assistant`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: `오늘 할 일에 '${item}' 추가해줘.`, model: "claude-haiku-4.5", autoExecute: true }),
    });
    // SSE 소비(완료까지)
    const reader = r.body.getReader();
    while (true) { const { done } = await reader.read(); if (done) break; }
    console.log(`[F] '${item}' 처리 완료`);
  }

  const todoMd = fs.readFileSync(path.join(ws, "todo", "TODO.md"), "utf-8");
  const trashDir = path.join(ws, ".flowdesk-trash");
  const backups = fs.existsSync(trashDir)
    ? fs.readdirSync(trashDir).filter((f) => f.includes("TODO.md") && f.endsWith(".bak"))
    : [];

  console.log("[F] 최종 TODO.md:\n" + todoMd);
  console.log("[F] 백업 파일:", backups);

  const checks = {
    "모델 목록 수신": Array.isArray(mjson.models) && mjson.models.length > 0,
    "인증됨": mjson.authenticated === true,
    "항목A 존재": todoMd.includes("최종검증 항목A"),
    "항목B 존재": todoMd.includes("최종검증 항목B"),
    "백업 생성됨(.flowdesk-trash)": backups.length > 0,
  };
  console.log("[F] 검증:", JSON.stringify(checks, null, 2));
  ok = Object.values(checks).every(Boolean);
} catch (e) {
  console.error("[F] FATAL:", e?.stack || e);
} finally {
  try { proc.kill(); } catch { /* 무시 */ }
}
console.log("\n[F] RESULT OK:", ok);
process.exit(ok ? 0 : 1);
