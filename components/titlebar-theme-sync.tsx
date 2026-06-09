"use client";

import { useEffect } from "react";

/**
 * 먹지(다크)/한지(라이트) 테마 전환 시 Electron 네이티브 창 컨트롤(titleBarOverlay)의
 * 색을 갱신한다. data-theme 속성을 MutationObserver로 감시해 초기 로드·토글·시스템
 * 변경을 모두 커버. 브라우저(비-Electron)에선 window.flowdesk가 없어 no-op.
 */
export function TitleBarThemeSync() {
  useEffect(() => {
    const el = document.documentElement;
    const sync = () =>
      window.flowdesk?.setTitleBarTheme?.(
        el.getAttribute("data-theme") === "dark",
      );

    sync(); // 마운트 시 현재 테마로 1회 동기화
    const observer = new MutationObserver(sync);
    observer.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return null;
}
