"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function FileChangeListener() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/file-watch");

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "connected") return;

        // 디바운스: 300ms 내 여러 변경 시 한 번만 refresh
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          router.refresh();
        }, 300);
      } catch {
        // 파싱 실패 무시
      }
    };

    return () => {
      es.close();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [router]);

  return null;
}
