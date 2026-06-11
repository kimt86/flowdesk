// Phase 0c-1 검증 — 패키지 조건 재현:
// standalone server(nft 트레이싱분만 보유: @github/copilot-sdk O, @github/copilot·copilot.exe X)를
// fork하고, copilot.exe는 "외부 경로"를 fork env(FLOWDESK_COPILOT_EXE)로 주입해
// /api/assistant-spike 가 추론→tool→파일쓰기까지 동작하는지 확인한다.
// → 동작하면 "copilot.exe만 extraResources로 동봉하면 됨"이 실증된다(@github/copilot 로더 불필요).
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
const copilotExe = path.join(
  repoRoot,
  "node_modules",
  "@github",
  "copilot-win32-x64",
  "copilot.exe",
);

if (!fs.existsSync(serverJs)) {
  console.error("[0c] .next/standalone/server.js 없음 — 먼저 desktop:build");
  process.exit(1);
}

// 임시 워크스페이스(실제 데이터 보호)
const ws = path.join(os.tmpdir(), "flowdesk-spike-ws");
fs.mkdirSync(path.join(ws, "todo"), { recursive: true });
fs.writeFileSync(
  path.join(ws, "todo", "TODO.md"),
  "# TODO\n\n## 오늘 할 일\n\n## 메모\n",
  "utf-8",
);

const ghDir = path.join(standalone, "node_modules", "@github");
console.log(
  "[0c] standalone node_modules/@github:",
  fs.existsSync(ghDir) ? fs.readdirSync(ghDir) : "(없음)",
);
console.log("[0c] 외부 주입 copilot.exe 존재:", fs.existsSync(copilotExe));

function freePort() {
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.unref();
    s.on("error", rej);
    s.listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => res(p));
    });
  });
}
function waitPort(p, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const s = net.connect(p, "127.0.0.1");
      s.once("connect", () => {
        s.destroy();
        resolve(true);
      });
      s.once("error", () => {
        s.destroy();
        if (Date.now() - start > timeout) resolve(false);
        else setTimeout(tick, 300);
      });
    };
    tick();
  });
}

const port = await freePort();
const proc = spawn(process.execPath, [serverJs], {
  cwd: standalone,
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    WORKSPACE_ROOT: ws,
    FLOWDESK_COPILOT_EXE: copilotExe,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
proc.stdout.on("data", (d) => process.stdout.write(`[srv] ${d}`));
proc.stderr.on("data", (d) => process.stderr.write(`[srv-err] ${d}`));

let ok = false;
try {
  const up = await waitPort(port);
  if (!up) throw new Error("standalone 서버 부팅 타임아웃");
  console.log("[0c] server up on", port);

  const url =
    `http://127.0.0.1:${port}/api/assistant-spike?prompt=` +
    encodeURIComponent(
      "오늘 할 일에 'standalone 패키징 검증' 항목을 추가해줘. add_today_task 도구를 사용해.",
    );
  const r = await fetch(url);
  const json = await r.json();
  console.log("[0c] route status:", r.status);
  console.log("[0c] route json:", JSON.stringify(json, null, 2));

  const after = fs.readFileSync(path.join(ws, "todo", "TODO.md"), "utf-8");
  console.log("[0c] TODO.md after:\n" + after);
  ok = r.status === 200 && json.ok === true && after.includes("standalone 패키징 검증");
} catch (e) {
  console.error("[0c] FATAL:", e?.stack || e);
} finally {
  try {
    proc.kill();
  } catch {
    /* 무시 */
  }
}
console.log("\n[0c] RESULT OK:", ok);
process.exit(ok ? 0 : 1);
