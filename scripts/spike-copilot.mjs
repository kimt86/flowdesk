// Phase 0a — Copilot SDK 임베드 스모크.
// 검증: (A) copilot.exe가 forStdio로 spawn되고 client.start/getStatus 성공,
//       (B) in-process custom tool(defineTool) 등록 + (인증 시) 추론으로 tool 호출 → 파일 쓰기.
// 실제 사용자 데이터 보호를 위해 임시 워크스페이스에만 쓴다.
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// 1) 임시 워크스페이스 시드
const ws = path.join(os.tmpdir(), "flowdesk-spike-ws");
const todoDir = path.join(ws, "todo");
const todoFile = path.join(todoDir, "TODO.md");
fs.mkdirSync(todoDir, { recursive: true });
fs.writeFileSync(todoFile, "# TODO\n\n## 오늘 할 일\n\n## 메모\n", "utf-8");

const copilotExe = path.join(
  repoRoot,
  "node_modules",
  "@github",
  "copilot-win32-x64",
  "copilot.exe"
);

const result = { node: process.version, steps: [], ok: false };
function step(name, data) {
  result.steps.push({ name, ...(data ? { data } : {}) });
  console.log(`[spike] ${name}`, data !== undefined ? JSON.stringify(data) : "");
}

let client;
try {
  const sdk = await import("@github/copilot-sdk");
  const { CopilotClient, RuntimeConnection, defineTool, approveAll } = sdk;
  step("import-sdk", {
    exports: Object.keys(sdk).slice(0, 16),
    copilotExeExists: fs.existsSync(copilotExe),
  });

  const token =
    process.env.COPILOT_GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.GITHUB_TOKEN ||
    null;

  client = new CopilotClient({
    connection: RuntimeConnection.forStdio({ path: copilotExe }),
    ...(token ? { gitHubToken: token } : {}),
    logLevel: "warning",
  });

  await client.start();
  step("client.start", { ok: true });

  const status = await client.getStatus();
  step("getStatus", status);

  let auth = null;
  try {
    auth = await client.getAuthStatus();
  } catch (e) {
    auth = { error: String(e?.message || e) };
  }
  step("getAuthStatus", auth);

  let models = null;
  try {
    const list = await client.listModels();
    models = list.map((m) => m.id || m.name).filter(Boolean);
  } catch (e) {
    models = { error: String(e?.message || e) };
  }
  step("listModels", { count: Array.isArray(models) ? models.length : 0, models });

  const addTodayTask = defineTool("add_today_task", {
    description: "오늘 할 일 목록에 항목을 추가한다.",
    parameters: {
      type: "object",
      properties: { content: { type: "string", description: "추가할 할 일 내용" } },
      required: ["content"],
    },
    handler: async (args) => {
      const line = `- [ ] ${args.content}`;
      const cur = fs.readFileSync(todoFile, "utf-8");
      const next = cur.replace(/## 오늘 할 일\n/, `## 오늘 할 일\n${line}\n`);
      fs.writeFileSync(todoFile, next, "utf-8");
      return `오늘 할 일에 "${args.content}" 추가 완료`;
    },
    skipPermission: true,
  });

  const authedGuess = !!(
    auth &&
    (auth.isAuthenticated || auth.authenticated || auth.loggedIn)
  );
  step("auth-summary", { authedGuess, hasToken: !!token });

  if (token || authedGuess) {
    const pick = (...names) =>
      Array.isArray(models) ? names.find((n) => models.includes(n)) : undefined;
    const model =
      pick("claude-haiku-4.5", "gpt-5-mini", "claude-sonnet-4.6") ||
      (Array.isArray(models) && models.find((m) => m !== "auto")) ||
      undefined;

    const toolCalls = [];
    const session = await client.createSession({
      ...(model ? { model } : {}),
      tools: [addTodayTask],
      onPermissionRequest: approveAll,
      streaming: false,
    });
    session.on((ev) => {
      if (typeof ev?.type === "string" && ev.type.startsWith("tool.")) {
        toolCalls.push({ type: ev.type, tool: ev.data?.toolName || ev.data?.name });
      }
    });
    step("createSession", { sessionId: session.sessionId, model });

    const res = await session.sendAndWait(
      { prompt: "오늘 할 일에 'Copilot 스파이크 테스트' 항목을 추가해줘. add_today_task 도구를 사용해." },
      120000
    );
    step("sendAndWait", {
      content: String(res?.data?.content || "").slice(0, 400),
      toolCalls,
    });

    const after = fs.readFileSync(todoFile, "utf-8");
    step("verify-file", {
      containsItem: after.includes("Copilot 스파이크 테스트"),
      todo: after,
    });
    await session.disconnect();
  } else {
    // 인증 없이도 세션 생성 + tool 등록이 되는지(추론은 토큰 필요)
    try {
      const session = await client.createSession({
        tools: [addTodayTask],
        onPermissionRequest: approveAll,
        streaming: false,
      });
      step("createSession-noauth", { sessionId: session.sessionId });
      await session.disconnect();
    } catch (e) {
      step("createSession-noauth", { error: String(e?.message || e) });
    }
  }

  result.ok = true;
} catch (e) {
  step("FATAL", { error: String(e?.stack || e?.message || e) });
} finally {
  try {
    if (client) await client.stop();
  } catch {
    /* 무시 */
  }
}

const outFile = path.join(os.tmpdir(), "flowdesk-spike-result.json");
fs.writeFileSync(outFile, JSON.stringify(result, null, 2), "utf-8");
console.log("\n[spike] RESULT FILE:", outFile);
console.log("[spike] OK:", result.ok);
process.exit(result.ok ? 0 : 1);
