// Phase 0c-2 검증 — 실제 패키지(win-unpacked) 산출물 검증:
// (1) copilot.exe가 resources/agent-bins/copilot 에 동봉됐는지(extraResources)
// (2) standalone/node_modules/@github/copilot-sdk 가 복사됐는지(after-pack)
// (3) 패키지된 standalone server를 fork + 동봉 copilot.exe 경로 주입으로 /api/assistant-spike 200
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const unpacked = path.join(repoRoot, "dist-desktop", "win-unpacked");
const resources = path.join(unpacked, "resources");
const standalone = path.join(resources, "standalone");
const serverJs = path.join(standalone, "server.js");
const copilotExe = path.join(resources, "agent-bins", "copilot", "copilot.exe");

const checks = {
  "win-unpacked": fs.existsSync(unpacked),
  "resources/standalone/server.js": fs.existsSync(serverJs),
  "standalone/node_modules/@github/copilot-sdk": fs.existsSync(
    path.join(standalone, "node_modules", "@github", "copilot-sdk"),
  ),
  "agent-bins/copilot/copilot.exe": fs.existsSync(copilotExe),
};
if (fs.existsSync(copilotExe)) {
  checks["copilot.exe size(MB)"] = Math.round(
    fs.statSync(copilotExe).size / 1048576,
  );
}
console.log("[0c-2] 배치 검증:", JSON.stringify(checks, null, 2));
if (!checks["resources/standalone/server.js"] || !checks["agent-bins/copilot/copilot.exe"]) {
  console.error("[0c-2] 필수 산출물 누락 — 패키징 설정 점검 필요");
  process.exit(1);
}

const ws = path.join(os.tmpdir(), "flowdesk-pkg-ws");
fs.mkdirSync(path.join(ws, "todo"), { recursive: true });
fs.writeFileSync(
  path.join(ws, "todo", "TODO.md"),
  "# TODO\n\n## 오늘 할 일\n\n## 메모\n",
  "utf-8",
);

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
    FLOWDESK_COPILOT_EXE: copilotExe, // 동봉된(resources) copilot.exe 경로
  },
  stdio: ["ignore", "pipe", "pipe"],
});
proc.stdout.on("data", (d) => process.stdout.write(`[srv] ${d}`));
proc.stderr.on("data", (d) => process.stderr.write(`[srv-err] ${d}`));

let ok = false;
try {
  const up = await waitPort(port);
  if (!up) throw new Error("패키지 standalone 서버 부팅 타임아웃");
  console.log("[0c-2] server up on", port);
  const url =
    `http://127.0.0.1:${port}/api/assistant-spike?prompt=` +
    encodeURIComponent(
      "오늘 할 일에 '패키지 스모크 통과' 항목을 추가해줘. add_today_task 도구를 사용해.",
    );
  const r = await fetch(url);
  const json = await r.json();
  console.log("[0c-2] route status:", r.status);
  console.log("[0c-2] route json:", JSON.stringify(json, null, 2));
  const after = fs.readFileSync(path.join(ws, "todo", "TODO.md"), "utf-8");
  console.log("[0c-2] TODO.md after:\n" + after);
  ok = r.status === 200 && json.ok === true && after.includes("패키지 스모크 통과");
} catch (e) {
  console.error("[0c-2] FATAL:", e?.stack || e);
} finally {
  try {
    proc.kill();
  } catch {
    /* 무시 */
  }
}
console.log("\n[0c-2] RESULT OK:", ok);
process.exit(ok ? 0 : 1);
