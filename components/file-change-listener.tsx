"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * file-watcher SSE 이벤트의 type → 영향받는 라우트 prefix.
 * 현재 보고 있는 페이지가 영향받지 않으면 router.refresh() skip.
 * 서버 캐시는 어쨌든 무효화되므로 다음 navigation 시 자동 갱신됨.
 */
const TYPE_TO_ROUTE_PREFIXES: Record<string, string[]> = {
  docs: ["/docs", "/projects"], // projects는 docs/<id>/plans 사용
  meetings: ["/meetings"],
  work: ["/work"],
  worklogs: ["/weekly"],
  presentations: ["/presentations"],
  ideas: ["/ideas"],
  todo: ["/", "/today", "/todos", "/archive"], // AI 비서 할 일·보관함 쓰기 반영
  projects: ["/projects"],
};

function shouldRefresh(pathname: string, eventType: string): boolean {
  const prefixes = TYPE_TO_ROUTE_PREFIXES[eventType];
  if (!prefixes) return true; // 모르는 타입은 보수적으로 refresh
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// 백그라운드(창 숨김/비활성) 시 OS 알림 문구 매핑.
const TYPE_TO_LABEL: Record<string, string> = {
  docs: "문서",
  meetings: "회의록",
  work: "작업",
  worklogs: "주간 보고서",
  presentations: "발표자료",
  ideas: "아이디어",
  todo: "할 일",
  projects: "프로젝트",
};

// Electron preload(contextBridge)가 노출하는 API.
declare global {
  interface Window {
    flowdesk?: {
      onReconnectSse?: (cb: () => void) => () => void;
      notify?: (payload: { title?: string; body?: string }) => void;
      setTitleBarTheme?: (isDark: boolean) => void;
    };
  }
}

export function FileChangeListener() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // pathname을 ref로 들고 있어서 SSE 콜백이 항상 최신 경로 참조
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let es: EventSource | null = null;
    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      // 디바운스: 500ms 내 여러 변경 시 한 번만 refresh
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => router.refresh(), 500);
    };

    const connect = () => {
      if (disposed) return;
      es?.close();
      es = new EventSource("/api/file-watch");

      es.onopen = () => {
        // 재연결 직후 1회 refresh — 끊겨 있던 동안 놓친 변경을 즉시 따라잡는다
        // (서버가 id/Last-Event-ID를 안 보내므로 이 방식으로 보완).
        router.refresh();
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "connected") return;

          // 백그라운드(창 숨김)면 OS 네이티브 알림(Phase 6) — 포그라운드면 in-app refresh.
          if (
            typeof document !== "undefined" &&
            document.visibilityState === "hidden" &&
            window.flowdesk?.notify &&
            TYPE_TO_LABEL[data.type]
          ) {
            window.flowdesk.notify({
              title: "FlowDesk",
              body: `${TYPE_TO_LABEL[data.type]}이(가) 외부에서 변경되었습니다.`,
            });
          }

          // 현재 경로와 무관한 변경이면 refresh 안 함
          if (!shouldRefresh(pathnameRef.current, data.type)) return;
          scheduleRefresh();
        } catch {
          // 파싱 실패 무시
        }
      };

      es.onerror = () => {
        // 연결이 완전히 닫힌 경우(임베드 서버 콜드스타트/일시 다운/슬립 후 half-open)
        // 브라우저 기본 재시도가 멈출 수 있으므로 수동 재연결.
        if (!disposed && es && es.readyState === EventSource.CLOSED) {
          if (retryTimer) clearTimeout(retryTimer);
          retryTimer = setTimeout(connect, 1500);
        }
      };
    };

    connect();

    // 절전/잠금 복귀 또는 탭 가시성 복귀 시 좀비 소켓 청산 후 재연결.
    const onVisible = () => {
      if (document.visibilityState === "visible") connect();
    };
    document.addEventListener("visibilitychange", onVisible);

    // Electron 메인의 resume/unlock-screen 신호 → 강제 재연결(powerMonitor).
    const offReconnect = window.flowdesk?.onReconnectSse?.(() => connect());

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisible);
      offReconnect?.();
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [router]);

  return null;
}
