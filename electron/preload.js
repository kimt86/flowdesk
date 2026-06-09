// preload (sandbox 호환 CommonJS). contextIsolation:true 하에서 contextBridge로
// 최소 네이티브 API만 렌더러에 노출한다. nodeIntegration은 꺼져 있음.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("flowdesk", {
  /** 현재 워크스페이스 루트 경로 반환 */
  getWorkspaceRoot: () => ipcRenderer.invoke("flowdesk:get-workspace"),
  /** 네이티브 폴더 다이얼로그로 워크스페이스 변경(무재시작: 서버 재기동 + 리로드) */
  changeWorkspace: () => ipcRenderer.invoke("flowdesk:change-workspace"),
  /** OS 네이티브 알림 표시(백그라운드 파일 변경 알림 등) */
  notify: (payload) => ipcRenderer.invoke("flowdesk:notify", payload),
  /** 네이티브 창 컨트롤(최소화/최대화/닫기) 색을 테마에 맞춰 갱신 */
  setTitleBarTheme: (isDark) =>
    ipcRenderer.invoke("flowdesk:set-titlebar-theme", isDark),
  /**
   * 절전/잠금 복귀 등으로 메인이 SSE 재연결을 요청할 때 호출되는 콜백 등록.
   * file-change-listener가 구독해 EventSource를 강제 재생성한다.
   */
  onReconnectSse: (cb) => {
    const handler = () => cb();
    ipcRenderer.on("flowdesk:reconnect-sse", handler);
    return () => ipcRenderer.removeListener("flowdesk:reconnect-sse", handler);
  },
});
