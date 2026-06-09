// FlowDesk Electron 메인 프로세스 (CommonJS)
// 역할: Next standalone 서버를 자식 프로세스로 띄우고(BrowserWindow가 localhost 로드),
// 워크스페이스 폴더 선택/영속화 + env 주입, 보안 하드닝, 창 chrome, 생명주기 관리,
// 트레이 상주 + OS 알림 + 자동 시작 + 무재시작 워크스페이스 전환(Phase 6).
const {
  app,
  BrowserWindow,
  dialog,
  Menu,
  Tray,
  nativeImage,
  Notification,
  shell,
  ipcMain,
  powerMonitor,
} = require("electron");
const { autoUpdater } = require("electron-updater");
const { fork } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");

const isDev = !app.isPackaged;
const HOST = "127.0.0.1";

// 네이티브 창 컨트롤(titleBarOverlay) 색 — 테마에 맞춰 갱신(globals.css --background/foreground).
const TITLEBAR = {
  light: { color: "#F5F1E8", symbolColor: "#141210", height: 48 },
  dark: { color: "#141210", symbolColor: "#F5F1E8", height: 48 },
};

// 단일 인스턴스 강제 — 두 인스턴스가 같은 워크스페이스/포트를 다투지 않게.
if (!app.requestSingleInstanceLock()) {
  app.quit();
  return;
}

let serverProc = null;
let serverPort = 0;
let mainWindow = null;
let splashWindow = null;
let tray = null;
let currentWorkspace = null;
let isQuitting = false;

// ---------- 경로 ----------
function standaloneDir() {
  return isDev
    ? path.join(__dirname, "..", ".next", "standalone")
    : path.join(process.resourcesPath, "standalone");
}
function serverEntry() {
  return path.join(standaloneDir(), "server.js");
}
function appIconPath() {
  return path.join(__dirname, "icon.png");
}
function trayIconPath() {
  return path.join(__dirname, "tray.png");
}

// ---------- 설정 영속화 (electron-store 없이 userData에 JSON) ----------
function settingsPath() {
  return path.join(app.getPath("userData"), "flowdesk-settings.json");
}
function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath(), "utf-8"));
  } catch {
    return {};
  }
}
function writeSettings(next) {
  try {
    fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2), "utf-8");
  } catch (e) {
    console.error("[FlowDesk] 설정 저장 실패:", e);
  }
}

// ---------- 워크스페이스 루트 결정 ----------
async function pickWorkspace() {
  const res = await dialog.showOpenDialog({
    title: "FlowDesk 워크스페이스 폴더 선택",
    message: "docs / todo / meetings 등이 들어갈 작업 폴더를 선택하세요.",
    properties: ["openDirectory", "createDirectory"],
  });
  if (res.canceled || !res.filePaths[0]) return null;
  return res.filePaths[0];
}

async function resolveWorkspaceRoot() {
  const settings = readSettings();
  if (settings.workspaceRoot && fs.existsSync(settings.workspaceRoot)) {
    return settings.workspaceRoot;
  }
  // dev 편의: env로 지정돼 있으면 사용
  if (process.env.WORKSPACE_ROOT && fs.existsSync(process.env.WORKSPACE_ROOT)) {
    return process.env.WORKSPACE_ROOT;
  }
  const picked = await pickWorkspace();
  if (picked) {
    writeSettings({ ...settings, workspaceRoot: picked });
    return picked;
  }
  return null;
}

// chokidar 감시 대상(lib/paths.ts 파생)이 없으면 영구 미감시가 되므로 부팅 시 선생성.
function ensureWorkspaceDirs(root) {
  for (const sub of ["docs", "todo", "work", "meetings", "presentations", "work-logs"]) {
    try {
      fs.mkdirSync(path.join(root, sub), { recursive: true });
    } catch {
      /* 무시 */
    }
  }
}

// ---------- 네트워크 ----------
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, HOST, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function waitForPort(port, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const sock = net.connect(port, HOST);
      sock.once("connect", () => {
        sock.destroy();
        resolve();
      });
      sock.once("error", () => {
        sock.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error("standalone 서버 부팅 타임아웃"));
        } else {
          setTimeout(attempt, 200);
        }
      });
    };
    attempt();
  });
}

// ---------- standalone 서버 ----------
async function startServer(workspaceRoot) {
  serverPort = await getFreePort();
  serverProc = fork(serverEntry(), [], {
    cwd: standaloneDir(), // process.cwd() 폴백 경로 방지 (리스크 4 이중 안전)
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1", // electron 바이너리를 순수 Node로 실행
      NODE_ENV: "production",
      PORT: String(serverPort),
      HOSTNAME: HOST, // loopback 고정 — LAN 노출 차단 (보안)
      WORKSPACE_ROOT: workspaceRoot, // lib/paths.ts cwd 의존 우회 주입
    },
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  serverProc.stdout?.on("data", (d) => process.stdout.write(`[next] ${d}`));
  serverProc.stderr?.on("data", (d) => process.stderr.write(`[next] ${d}`));
  serverProc.on("exit", (code) => {
    console.log(`[FlowDesk] next 서버 종료 (code=${code})`);
    serverProc = null;
  });
  await waitForPort(serverPort, 30000);
}

function stopServer() {
  if (serverProc) {
    try {
      serverProc.kill();
    } catch {
      /* 무시 */
    }
    serverProc = null;
  }
}

// ---------- 창 ----------
function appUrl(p = "/") {
  return `http://${HOST}:${serverPort}${p}`;
}

function hardenedWebPreferences() {
  return {
    preload: path.join(__dirname, "preload.js"),
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
  };
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 440,
    height: 280,
    frame: false,
    resizable: false,
    backgroundColor: "#F5F1E8",
    icon: appIconPath(),
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  const html =
    "data:text/html;charset=utf-8," +
    encodeURIComponent(
      `<html><body style="margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#F5F1E8;color:#141210;font-family:'Pretendard',system-ui,sans-serif">
        <div style="font-size:28px;letter-spacing:0.08em;font-weight:700">FlowDesk</div>
        <div style="margin-top:10px;font-size:13px;color:#6b6256;letter-spacing:0.04em">워크스페이스를 여는 중…</div>
      </body></html>`,
    );
  splashWindow.loadURL(html);
}

function attachSecurity(win) {
  // 같은 origin(임베드 서버)만 새 창 허용 — 그 외 링크는 외부 브라우저로.
  // presentations/serve의 raw HTML도 하드닝된 새 창에서 격리 렌더된다(보안).
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`http://${HOST}:${serverPort}`)) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          backgroundColor: "#F5F1E8",
          icon: appIconPath(),
          webPreferences: hardenedWebPreferences(),
        },
      };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });
  // 앱 셸 창이 외부 URL로 navigate되는 것을 차단.
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith(`http://${HOST}:${serverPort}`)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 940,
    minHeight: 600,
    show: false,
    backgroundColor: "#F5F1E8", // 콜드스타트 흰 플래시 방지 (DESIGN.md 순백 금지)
    icon: appIconPath(),
    // DESIGN.md: OS 타이틀바 그림자 제거. 네이티브 창 컨트롤은 overlay로 유지.
    titleBarStyle: "hidden",
    titleBarOverlay: TITLEBAR.light,
    webPreferences: hardenedWebPreferences(),
  });
  attachSecurity(mainWindow);
  mainWindow.loadURL(appUrl("/"));
  mainWindow.once("ready-to-show", () => {
    if (splashWindow) {
      splashWindow.destroy();
      splashWindow = null;
    }
    mainWindow.show();
  });
  // 창 닫기 → 트레이로 숨김(상주). 실제 종료는 트레이 메뉴/앱 메뉴의 '종료'.
  mainWindow.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function showMainWindow() {
  if (!mainWindow) {
    createMainWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

// ---------- 트레이 상주 ----------
function createTray() {
  let img = nativeImage.createFromPath(trayIconPath());
  if (img.isEmpty()) img = nativeImage.createFromPath(appIconPath());
  tray = new Tray(img);
  tray.setToolTip("FlowDesk");
  tray.on("click", showMainWindow);
  updateTrayMenu();
}

function updateTrayMenu() {
  if (!tray) return;
  const wsLabel = currentWorkspace ? path.basename(currentWorkspace) : "-";
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "FlowDesk 열기", click: showMainWindow },
      { label: `워크스페이스: ${wsLabel}`, enabled: false },
      { label: "워크스페이스 변경…", click: () => changeWorkspaceFlow() },
      { type: "separator" },
      {
        label: "종료",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
}

// ---------- OS 알림 ----------
function showNotification(title, body) {
  if (!Notification.isSupported()) return;
  const n = new Notification({
    title: title || "FlowDesk",
    body: body || "",
    icon: appIconPath(),
    silent: false,
  });
  n.on("click", showMainWindow);
  n.show();
}

// ---------- 테마별 네이티브 창 컨트롤 색 갱신 (먹지/한지 전환 대응) ----------
function applyTitleBarTheme(isDark) {
  if (process.platform !== "win32") return; // overlay는 Windows/Linux 전용
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    mainWindow.setTitleBarOverlay(isDark ? TITLEBAR.dark : TITLEBAR.light);
  } catch {
    /* 무시 */
  }
}

// ---------- 앱 메뉴 ----------
function buildMenu() {
  const loginEnabled = app.getLoginItemSettings().openAtLogin;
  const template = [
    {
      label: "FlowDesk",
      submenu: [
        { label: "워크스페이스 변경…", click: () => changeWorkspaceFlow() },
        {
          label: "로그인 시 자동 시작",
          type: "checkbox",
          checked: loginEnabled,
          click: (item) =>
            app.setLoginItemSettings({ openAtLogin: item.checked }),
        },
        { label: "업데이트 확인…", click: () => checkForUpdatesManually() },
        { type: "separator" },
        {
          label: "종료",
          click: () => {
            isQuitting = true;
            app.quit();
          },
        },
      ],
    },
    {
      label: "보기",
      submenu: [
        { role: "reload", label: "새로고침" },
        { role: "forceReload", label: "강제 새로고침" },
        ...(isDev ? [{ role: "toggleDevTools", label: "개발자 도구" }] : []),
        { type: "separator" },
        { role: "resetZoom", label: "기본 배율" },
        { role: "zoomIn", label: "확대" },
        { role: "zoomOut", label: "축소" },
        { type: "separator" },
        { role: "togglefullscreen", label: "전체 화면" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------- 워크스페이스 변경 (무재시작: 서버 child 재기동 + 창 리로드) ----------
async function changeWorkspaceFlow() {
  const picked = await pickWorkspace();
  if (!picked) return null;
  writeSettings({ ...readSettings(), workspaceRoot: picked });
  currentWorkspace = picked;
  ensureWorkspaceDirs(picked);
  // 새 워크스페이스를 env로 주입해 서버 child만 재기동(앱 재시작 불필요).
  // lib/paths.ts 상수는 새 프로세스에서 새 WORKSPACE_ROOT로 재평가된다.
  stopServer();
  try {
    await startServer(picked);
  } catch (e) {
    dialog.showErrorBox("FlowDesk", `워크스페이스 전환 실패:\n${e.message}`);
    return null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(appUrl("/"));
    showMainWindow();
  }
  updateTrayMenu();
  return picked;
}

// ---------- IPC ----------
ipcMain.handle("flowdesk:get-workspace", () => currentWorkspace);
ipcMain.handle("flowdesk:change-workspace", () => changeWorkspaceFlow());
ipcMain.handle("flowdesk:notify", (_e, payload) => {
  const { title, body } = payload || {};
  showNotification(title, body);
});
ipcMain.handle("flowdesk:set-titlebar-theme", (_e, isDark) =>
  applyTitleBarTheme(!!isDark),
);

// ---------- 절전/잠금 복귀 → 렌더러에 SSE 재연결 신호 ----------
function wirePowerMonitor() {
  const notify = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("flowdesk:reconnect-sse");
    }
  };
  powerMonitor.on("resume", notify);
  powerMonitor.on("unlock-screen", notify);
}

// ---------- 자동 업데이트 (electron-updater + GitHub Releases) ----------
let manualUpdateCheck = false;

function setupAutoUpdate() {
  if (!app.isPackaged) return; // dev에선 app-update.yml이 없어 비활성

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    showNotification("FlowDesk 업데이트", `새 버전 ${info.version} 다운로드 중…`);
  });

  autoUpdater.on("update-not-available", () => {
    if (manualUpdateCheck) {
      manualUpdateCheck = false;
      showNotification("FlowDesk", "최신 버전을 사용 중입니다.");
    }
  });

  autoUpdater.on("update-downloaded", (info) => {
    showNotification("업데이트 준비 완료", `${info.version} — 재시작 시 적용됩니다.`);
    const target = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
    const opts = {
      type: "info",
      buttons: ["지금 재시작", "나중에"],
      defaultId: 0,
      cancelId: 1,
      title: "FlowDesk 업데이트",
      message: `새 버전 ${info.version}이 준비되었습니다.`,
      detail: "지금 재시작하여 업데이트를 적용할까요? '나중에'를 선택하면 다음 종료 시 자동 적용됩니다.",
    };
    const handle = (res) => {
      if (res.response === 0) {
        isQuitting = true;
        autoUpdater.quitAndInstall();
      }
    };
    (target ? dialog.showMessageBox(target, opts) : dialog.showMessageBox(opts)).then(handle);
  });

  autoUpdater.on("error", (err) => {
    const msg = (err && err.message) || String(err);
    console.error("[FlowDesk] 업데이트 확인 실패:", msg);
    if (manualUpdateCheck) {
      manualUpdateCheck = false;
      showNotification("FlowDesk", "업데이트 확인에 실패했습니다.");
    }
  });

  // 부팅 직후 + 6시간마다 확인
  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 6 * 60 * 60 * 1000);
}

function checkForUpdatesManually() {
  if (!app.isPackaged) {
    showNotification("FlowDesk", "개발 모드에서는 업데이트를 확인할 수 없습니다.");
    return;
  }
  manualUpdateCheck = true;
  autoUpdater.checkForUpdates().catch(() => {});
}

// ---------- 헤드리스 스모크 모드 (FLOWDESK_SMOKE=1) ----------
// 다이얼로그/창/트레이 없이 '메인→서버 fork'만 실제 electron 런타임에서 검증 후 종료.
async function runSmoke() {
  // GUI 서브시스템이라 stdout이 콘솔에 안 보이므로 결과를 파일(FLOWDESK_SMOKE_OUT)로 기록.
  const outFile = process.env.FLOWDESK_SMOKE_OUT;
  const writeResult = (r) => {
    try {
      if (outFile) fs.writeFileSync(outFile, JSON.stringify(r), "utf-8");
    } catch {
      /* 무시 */
    }
    console.log("SMOKE_RESULT " + JSON.stringify(r));
  };
  const ws =
    process.env.WORKSPACE_ROOT && fs.existsSync(process.env.WORKSPACE_ROOT)
      ? process.env.WORKSPACE_ROOT
      : app.getPath("temp");
  currentWorkspace = ws;
  ensureWorkspaceDirs(ws);
  try {
    await startServer(ws);
    // 실제 HTTP 응답 상태라인까지 확인
    const status = await new Promise((resolve) => {
      const req = net.connect(serverPort, HOST, () => {
        req.write(`GET / HTTP/1.1\r\nHost: ${HOST}\r\nConnection: close\r\n\r\n`);
      });
      let buf = "";
      req.on("data", (d) => {
        buf += d.toString();
        if (buf.includes("\r\n")) {
          resolve(buf.split("\r\n")[0]);
          req.destroy();
        }
      });
      req.on("error", () => resolve(null));
      setTimeout(() => resolve(buf ? buf.split("\r\n")[0] : null), 5000);
    });
    writeResult({ ok: true, port: serverPort, status });
  } catch (e) {
    writeResult({ ok: false, error: e.message });
  }
  stopServer();
  app.exit(0);
}

// ---------- 부트스트랩 ----------
app.on("second-instance", showMainWindow);

app.whenReady().then(async () => {
  if (process.env.FLOWDESK_SMOKE === "1") {
    await runSmoke();
    return;
  }

  createSplash();

  currentWorkspace = await resolveWorkspaceRoot();
  if (!currentWorkspace) {
    dialog.showErrorBox("FlowDesk", "워크스페이스 폴더가 필요합니다. 앱을 종료합니다.");
    isQuitting = true;
    app.quit();
    return;
  }
  ensureWorkspaceDirs(currentWorkspace);

  // dev에서 `next dev`를 가리키고 싶을 때 ELECTRON_START_URL 사용(서버 fork 생략).
  if (process.env.ELECTRON_START_URL) {
    serverPort = Number(new URL(process.env.ELECTRON_START_URL).port || 3000);
  } else {
    try {
      await startServer(currentWorkspace);
    } catch (e) {
      dialog.showErrorBox("FlowDesk", `서버 시작 실패:\n${e.message}`);
      isQuitting = true;
      app.quit();
      return;
    }
  }

  buildMenu();
  createTray();
  createMainWindow();
  wirePowerMonitor();
  setupAutoUpdate();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    else showMainWindow();
  });
});

// 모든 자식/포트가 깨끗하게 정리되도록 종료 훅에서 서버 kill.
app.on("before-quit", () => {
  isQuitting = true;
  stopServer();
});
app.on("window-all-closed", () => {
  // 트레이 상주: 창을 숨기면 window-all-closed가 발생하지 않음.
  // 실제 close(종료 플래그)일 때만 여기 도달 → 종료.
  if (process.platform !== "darwin") app.quit();
});
process.on("exit", stopServer);
